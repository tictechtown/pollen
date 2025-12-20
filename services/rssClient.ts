// RSS/Atom fetch and parsing utilities with metadata enrichment.
import { Buffer } from 'buffer'
import { XMLParser } from 'fast-xml-parser'
import he from 'he'

import { Article, Feed } from '@/types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  stopNodes: ['feed.entry.content', 'rss.channel.item.content'],
})

const toTimestamp = (value?: string | null): number => {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : 0
}

const METADATA_TIMEOUT = 5000
const ENRICHMENT_TYPES = new Set(['Article', 'NewsArticle', 'BlogPosting'])

type MetadataBudget = { remaining: number }

const consumeBudget = (budget?: MetadataBudget) => {
  if (!budget) return false
  if (budget.remaining <= 0) return false
  budget.remaining -= 1
  return true
}

export const decodeString = (value?: string): string | undefined => {
  if (!value) return value
  const decodedEntities = he.decode(value)
  return decodedEntities
}

export const encodeBase64 = (value?: string | null): string | undefined => {
  if (value === undefined || value === null) return undefined
  const makeUrlSafe = (input: string) =>
    input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

  if (typeof globalThis.btoa === 'function') {
    return makeUrlSafe(globalThis.btoa(value))
  }

  try {
    const encoded = Buffer.from(value, 'utf-8').toString('base64')
    return makeUrlSafe(encoded)
  } catch {
    return undefined
  }
}

const toArray = <T>(maybe: T | T[] | undefined): T[] => {
  if (!maybe) return []
  return Array.isArray(maybe) ? maybe : [maybe]
}

const dedupeById = (articles: Article[]): Article[] => {
  const seen = new Set<string>()
  return articles.filter((article) => {
    if (seen.has(article.id)) return false
    seen.add(article.id)
    return true
  })
}

const fetchWithTimeout = async (url: string, init?: RequestInit, timeoutMs = METADATA_TIMEOUT) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(url, { ...init, signal: controller.signal })
    return resp
  } finally {
    clearTimeout(timeout)
  }
}

const toAbsoluteUrl = (baseUrl: string, maybeUrl?: string): string | undefined => {
  if (!maybeUrl) return undefined
  try {
    return new URL(maybeUrl, baseUrl).toString()
  } catch {
    return maybeUrl
  }
}

const stripHtml = (input?: string): string | undefined => {
  if (!input) return undefined
  const noTags = input.replace(/<[^>]*>/g, '')
  return decodeString(noTags) ?? noTags
}

const extractOg = (headHtml: string, baseUrl: string) => {
  const ogImage =
    headHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    headHtml.match(/<meta[^>]+name=["']image["'][^>]+content=["']([^"']+)["']/i)?.[1]
  const ogDescription =
    headHtml.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ??
    headHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
  const ogPublished =
    headHtml.match(
      /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ?? headHtml.match(/<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i)?.[1]

  return {
    thumbnail: toAbsoluteUrl(baseUrl, ogImage),
    description: stripHtml(ogDescription),
    publishedAt: ogPublished,
  }
}

const extractJsonLd = (headHtml: string, baseUrl: string) => {
  const scripts = [
    ...headHtml.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
  for (const match of scripts) {
    const content = match[1]
    try {
      const parsed = JSON.parse(content)
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      for (const candidate of candidates) {
        const typeField = candidate['@type']
        const types = Array.isArray(typeField) ? typeField : [typeField]
        const hasType = types.some((t) => typeof t === 'string' && ENRICHMENT_TYPES.has(t))
        if (!hasType) continue
        const description = stripHtml(candidate.description)
        const imageField = candidate.image || candidate.thumbnailUrl
        const image =
          typeof imageField === 'string'
            ? imageField
            : Array.isArray(imageField) && typeof imageField[0] === 'string'
            ? imageField[0]
            : undefined
        const publishedAt = candidate.datePublished || candidate.dateModified
        return {
          thumbnail: toAbsoluteUrl(baseUrl, image),
          description,
          publishedAt,
        }
      }
    } catch {
      continue
    }
  }
  return {}
}

const fetchMetadataFromPage = async (
  url?: string,
  budget?: MetadataBudget,
): Promise<Partial<Article>> => {
  if (!url) return {}
  if (!consumeBudget(budget)) return {}
  try {
    const headResp = await fetchWithTimeout(url, { method: 'HEAD' })
    if (!headResp.ok) return {}
    const contentType = headResp.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return {}

    const resp = await fetchWithTimeout(url, undefined)
    const html = await resp.text()
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
    const headHtml = headMatch?.[1] ?? html

    const og = extractOg(headHtml, url)
    const ld = extractJsonLd(headHtml, url)

    return {
      thumbnail: ld.thumbnail ?? og.thumbnail,
      description: ld.description ?? og.description,
      publishedAt: ld.publishedAt ?? og.publishedAt,
    }
  } catch {
    return {}
  }
}

const extractMetadataFromFeed = async (
  item: FetchedAtomArticle | FetchedRssArticle,
  options?: {
    baseUrl?: string
    budget?: MetadataBudget
    hasDescription?: boolean
    hasPublished?: boolean
  },
): Promise<Partial<Article>> => {
  let thumbnail: string | undefined
  let description: string | undefined
  let publishedAt: string | undefined

  const enclosure = item.enclosure
  if (enclosure) {
    if (Array.isArray(enclosure)) {
      const withUrl = enclosure.find((enc) => enc.url)
      if (withUrl?.url) thumbnail = withUrl.url
    } else if (enclosure.url) {
      thumbnail = enclosure.url
    }
  }

  const mediaContent = item['media:content']
  if (!thumbnail && mediaContent) {
    if (Array.isArray(mediaContent)) {
      const withUrl = mediaContent.find((m) => m.url)
      if (withUrl?.url) thumbnail = withUrl.url
    } else if (mediaContent.url) {
      thumbnail = mediaContent.url
    }
  }

  if (!thumbnail) {
    const content = item['content:encoded'] ?? item.content?.['#text'] ?? item.content
    const match = typeof content === 'string' ? content.match(/<img[^>]+src="([^">]+)"/i) : null
    if (match?.[1]) thumbnail = match[1]
  }

  const needsEnrichment =
    !thumbnail ||
    (!description && !options?.hasDescription) ||
    (!publishedAt && !options?.hasPublished)
  if (needsEnrichment) {
    const link = item.link?.href ?? item.link?.['#text'] ?? item.link
    const fetched = await fetchMetadataFromPage(link, options?.budget)
    thumbnail =
      thumbnail ??
      (fetched.thumbnail ? toAbsoluteUrl(options?.baseUrl ?? '', fetched.thumbnail) : undefined)
    description = description ?? fetched.description
    publishedAt = publishedAt ?? fetched.publishedAt
  }

  return { thumbnail, description, publishedAt }
}

interface AtomFeed {
  feed: {
    entry: FetchedAtomArticle[]
    icon: string
    id: string
    link:
      | { rel: string; type?: string; href: string }
      | { rel: string; type?: string; href: string }[]
    subtitle?: {
      '#text': string
      type: string
    }
    title:
      | {
          '#text': string
          type: string
        }
      | string
    updated: string
  }
}

interface FetchedRssArticle {
  title: string
  link: string | { '#text': string }
  comments: string
  pubDate: string
  guid: { '#text': string }
  description: { '#text': string }
  'content:encoded': {
    '#text': string
  }
}
interface RssFeed {
  rss: {
    channel: {
      'atom:link': { href: string; rel: string; type?: string }[]
      description: string
      image:
        | { url: string; title: string; link: string }
        | { url: string; title: string; link: string }[]
      item: FetchedRssArticle[]
      language: string
      lastBuildDate: string
      link: string
      site: { '#text': string }[]
      title: string
      'sy:updateFrequency': number
      'sy:updatePeriod': string
    }
    version: string
  }
}

type FetchedFeed = {
  '?xml': {
    encoding: string
    version: string
  }
} & (RssFeed | AtomFeed)

interface FetchedAtomArticle {
  author: {
    name: string
  }
  category: { scheme: string; term: string }[]
  content: {
    '#text': string
    type: string
  }
  id: string
  link: {
    href: string
    rel: string
    type: string
    '#text'?: string
  }
  published?: string
  summary: {
    '#text': string
    type: string
  }
  title:
    | {
        '#text': string
        type: string
      }
    | string
  updated: string
  enclosure?: { url?: string } | { url?: string }[]
  'media:content'?: { url?: string } | { url?: string }[]
  description?: string
}

export const extractImage = async (
  item: FetchedAtomArticle | FetchedRssArticle,
  budget: MetadataBudget = { remaining: 1 },
): Promise<string | undefined> => {
  const baseUrl =
    (item as FetchedAtomArticle)?.link?.href ??
    (item as FetchedRssArticle)?.link?.['#text'] ??
    (item as FetchedRssArticle)?.link

  const metadata = await extractMetadataFromFeed(item, {
    baseUrl: typeof baseUrl === 'string' ? baseUrl : undefined,
    budget,
    hasDescription: true,
    hasPublished: true,
  })

  return metadata.thumbnail
}

const extractHTMLLink = (links: AtomFeed['feed']['link'] | undefined): string | undefined => {
  if (!links) {
    return undefined
  }
  if (Array.isArray(links)) {
    return links.find((l) => l.type === 'text/html')?.href
  } else {
    return links.type === 'text/html' ? links.href : undefined
  }
}

const parseAtomFeed = async (
  url: string,
  atomFeed: AtomFeed,
  cutoffTs = 0,
  budget?: MetadataBudget,
) => {
  const channel = atomFeed.feed

  const items = toArray(channel?.entry).filter((item) => {
    if (!cutoffTs) return true
    const ts = toTimestamp(item.updated ?? item.published)
    return ts > cutoffTs
  })

  const feedIdSource = channel?.id

  const feed: Feed = {
    id: encodeBase64(feedIdSource) ?? feedIdSource ?? url,
    title:
      decodeString(typeof channel?.title === 'string' ? channel?.title : channel?.title['#text']) ??
      'RSS Feed',
    xmlUrl: url,
    htmlUrl: extractHTMLLink(channel.link),
    description:
      decodeString(
        typeof channel?.subtitle === 'string' ? channel?.subtitle : channel?.subtitle?.['#text'],
      ) ?? undefined,
    image: channel?.icon ?? undefined,
    lastUpdated: channel?.updated ?? channel?.lastBuildDate ?? channel?.pubDate ?? undefined,
  }

  const articles: Article[] = await Promise.all(
    items.map(async (item: FetchedAtomArticle) => {
      const contentEncoded = item.content?.['#text'] ?? item.content ?? item.description
      const rawId =
        item.id['#text'] ?? item.id ?? item.link.href ?? item.title['#text'] ?? `${Date.now()}`
      const encodedId = encodeBase64(rawId) ?? rawId
      const feedDescription = decodeString(item.description ?? item.summary?.['#text'])
      const feedPublished = item.published ?? item.updated ?? undefined

      const metadata = await extractMetadataFromFeed(item, {
        baseUrl: url,
        budget,
        hasDescription: Boolean(feedDescription),
        hasPublished: Boolean(feedPublished),
      })

      return {
        id: encodedId,
        title:
          decodeString(typeof item.title === 'string' ? item.title : item.title['#text']) ??
          'Untitled',
        link: item.link['href'] ?? url,
        source:
          (typeof channel?.title === 'string' ? channel?.title : channel?.title['#text']) ??
          'RSS Feed',
        publishedAt: feedPublished ?? metadata.publishedAt ?? undefined,
        updatedAt: item.updated ?? undefined,
        description: feedDescription ?? metadata.description,
        content: typeof contentEncoded === 'string' ? contentEncoded : undefined,
        thumbnail: metadata.thumbnail ?? undefined,
        feedId: feed.id,
        seen: false,
        saved: false,
      }
    }),
  )

  console.log('articles', url, articles.length)

  return { feed, articles: dedupeById(articles) }
}

const parseRssFeed = async (
  url: string,
  rssFeed: RssFeed,
  cutoffTs = 0,
  budget?: MetadataBudget,
) => {
  const channel = rssFeed.rss.channel
  const items = toArray(channel?.item).filter((item) => {
    if (!cutoffTs) return true
    const ts = toTimestamp(item.pubDate)
    return ts > cutoffTs
  })
  const feedIdSource = channel?.link?.[0]?.href ?? channel?.link?.[0]?.['#text'] ?? url
  const feed: Feed = {
    id: encodeBase64(feedIdSource) ?? feedIdSource ?? url,
    title:
      decodeString(typeof channel?.title === 'string' ? channel?.title : channel?.title['#text']) ??
      'RSS Feed',
    xmlUrl: url,
    description: decodeString(channel?.subtitle?.['#text']) ?? undefined,
    image:
      (Array.isArray(channel?.image) ? channel?.image[0]?.url : channel?.image?.url) ?? undefined,
    lastUpdated: channel?.updated ?? channel?.lastBuildDate ?? channel?.pubDate ?? undefined,
  }

  const articles: Article[] = await Promise.all(
    items.map(async (item: FetchedRssArticle) => {
      const contentEncoded =
        item['content:encoded']?.['#text'] ??
        item['content:encoded'] ??
        item.content ??
        item.description
      const rawId =
        item.guid?.['#text'] ??
        item.guid ??
        item.link.href ??
        item.link ??
        item.title['#text'] ??
        `${Date.now()}`

      const encodedId = encodeBase64(rawId) ?? rawId
      const feedDescription = decodeString(item.description?.['#text'] ?? item.description)
      const feedPublished = item.pubDate ?? undefined

      const metadata = await extractMetadataFromFeed(item, {
        baseUrl: url,
        budget,
        hasDescription: Boolean(feedDescription),
        hasPublished: Boolean(feedPublished),
      })

      return {
        id: encodedId,
        title:
          decodeString(typeof item.title === 'string' ? item.title : item.title['#text']) ??
          'Untitled',
        link: item.link?.['href'] ?? item.link ?? url,
        source:
          (typeof channel?.title === 'string' ? channel?.title : channel?.title['#text']) ??
          'RSS Feed',
        publishedAt: feedPublished ?? metadata.publishedAt ?? undefined,
        updatedAt: undefined,
        description: feedDescription ?? metadata.description,
        content: typeof contentEncoded === 'string' ? contentEncoded : undefined,
        thumbnail: metadata.thumbnail ?? undefined,
        feedId: feed.id,
        seen: false,
        saved: false,
      }
    }),
  )

  console.log('articles', url, articles.length)

  return { feed, articles: dedupeById(articles) }
}

type FetchOptions = { cutoffTs?: number; metadataBudget?: MetadataBudget }

export const fetchFeed = async (
  url: string,
  options: FetchOptions = {},
): Promise<{ feed: Feed; articles: Article[] }> => {
  const { cutoffTs = 0, metadataBudget } = options
  console.log('fetching', url, { cutoffTs })
  const response = await fetch(url)
  const xml = await response.text()
  const parsed: FetchedFeed = parser.parse(xml)

  if ('feed' in parsed) {
    return parseAtomFeed(url, parsed, cutoffTs, metadataBudget)
  } else {
    return parseRssFeed(url, parsed, cutoffTs, metadataBudget)
  }
}
