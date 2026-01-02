// RSS/Atom fetch and parsing utilities with metadata enrichment.
import { Buffer } from 'buffer'
import { XMLParser } from 'fast-xml-parser'
import he from 'he'

import { Article, Feed } from '@/types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  stopNodes: [],
})

const toTimestamp = (value?: string | null): number => {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : 0
}

export const parseCacheControl = (value?: string | null): number | null => {
  if (!value) return null

  let delimiter = value.includes(';') ? ';' : ','
  const directives = value
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)

  let maxAge: number | null = null
  let sharedMaxAge: number | null = null

  for (const directive of directives) {
    const lower = directive.toLowerCase()
    if (lower.startsWith('max-age=')) {
      const parsed = Number.parseInt(lower.slice('max-age='.length), 10)
      maxAge = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
    } else if (lower.startsWith('s-maxage=')) {
      const parsed = Number.parseInt(lower.slice('s-maxage='.length), 10)
      sharedMaxAge = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
    }
  }

  if (maxAge !== null) return maxAge
  if (sharedMaxAge !== null) return sharedMaxAge
  return null
}

const METADATA_TIMEOUT = 5000
const ENRICHMENT_TYPES = new Set(['Article', 'NewsArticle', 'BlogPosting'])

type MetadataBudget = { remaining: number }

export type PageMetadata = {
  title?: string
  description?: string
  thumbnail?: string
  publishedAt?: string
  source?: string
}

type CacheMetadata = {
  expiresTS?: number
  expires?: string
  ETag?: string
  lastModified?: string
}

const consumeBudget = (budget?: MetadataBudget) => {
  if (!budget) return false
  if (budget.remaining <= 0) return false
  budget.remaining -= 1
  return true
}

type TextNode = string | { '#text'?: string }

type LinkNode =
  | string
  | { href?: string; '#text'?: string; rel?: string; type?: string }
  | { href?: string; '#text'?: string; rel?: string; type?: string }[]

type MediaNode = { url?: string }

const getText = (value?: TextNode): string | undefined => {
  if (!value) return undefined
  return typeof value === 'string' ? value : value['#text']
}

const getLink = (value?: LinkNode): string | undefined => {
  if (!value) return undefined
  if (Array.isArray(value)) {
    const entry = value.find((link) => link?.href || link?.['#text'])
    return entry ? entry.href ?? entry['#text'] : undefined
  }
  if (typeof value === 'string') return value
  return value.href ?? value['#text']
}

const getPreferredLink = (value?: LinkNode): string | undefined => {
  if (!value) return undefined
  if (Array.isArray(value)) {
    const byAlternateHtml = value.find(
      (link) => link?.rel === 'alternate' && link?.type?.includes('text/html'),
    )
    const byAlternate = value.find((link) => link?.rel === 'alternate')
    const byHtml = value.find((link) => link?.type?.includes('text/html'))
    const selected = byAlternateHtml ?? byAlternate ?? byHtml
    if (selected) return selected.href ?? selected['#text']
  }
  return getLink(value)
}

const getMediaUrl = (value?: MediaNode | MediaNode[]): string | undefined => {
  if (!value) return undefined
  if (Array.isArray(value)) {
    const entry = value.find((media) => media?.url)
    return entry?.url
  }
  return value.url
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

const extractCacheMetadata = (headers: Headers, now = Date.now()): CacheMetadata => {
  const cacheControl = headers.get('cache-control')
  const expiresHeader = headers.get('expires')
  const etag = headers.get('etag')
  const lastModified = headers.get('last-modified')

  const maxAge = parseCacheControl(cacheControl)
  let expiresTS: number | undefined

  if (maxAge !== null) {
    expiresTS = Math.max(now, now + maxAge * 1000)
  } else if (expiresHeader) {
    const parsed = toTimestamp(expiresHeader)
    if (parsed) {
      expiresTS = Math.max(now, parsed)
    }
  }

  return {
    expiresTS,
    expires: expiresHeader ?? undefined,
    ETag: etag ?? undefined,
    lastModified: lastModified ?? undefined,
  }
}

const mergeCacheMetadata = (feed: Feed, cache: CacheMetadata): Feed => ({
  ...feed,
  ...(cache.expiresTS !== undefined ? { expiresTS: cache.expiresTS } : {}),
  ...(cache.expires !== undefined ? { expires: cache.expires } : {}),
  ...(cache.ETag !== undefined ? { ETag: cache.ETag } : {}),
  ...(cache.lastModified !== undefined ? { lastModified: cache.lastModified } : {}),
})

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
  const noTags = input.replace(/<[^>]*>/g, '').replace(/&lt;[^&]*?&gt;/gi, '')
  return decodeString(noTags) ?? noTags
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getMetaContent = (headHtml: string, key: string): string | undefined => {
  const safeKey = escapeRegExp(key)
  const property = new RegExp(
    `<meta[^>]+property=["']${safeKey}["'][^>]+content=["']([^"']+)["']`,
    'i',
  )
  const name = new RegExp(`<meta[^>]+name=["']${safeKey}["'][^>]+content=["']([^"']+)["']`, 'i')
  return headHtml.match(property)?.[1] ?? headHtml.match(name)?.[1]
}

const extractTitleFromHead = (headHtml: string): string | undefined => {
  const match = headHtml.match(/<title[^>]*>([^<]+)<\/title>/i)
  const raw = match?.[1]?.trim()
  if (!raw) return undefined
  return decodeString(raw) ?? raw
}

const extractOg = (headHtml: string, baseUrl: string) => {
  const ogImage = getMetaContent(headHtml, 'og:image') ?? getMetaContent(headHtml, 'image')
  const ogDescription =
    getMetaContent(headHtml, 'og:description') ?? getMetaContent(headHtml, 'description')
  const ogPublished =
    getMetaContent(headHtml, 'article:published_time') ?? getMetaContent(headHtml, 'date')
  const ogTitle = getMetaContent(headHtml, 'og:title') ?? getMetaContent(headHtml, 'twitter:title')
  const ogSource = getMetaContent(headHtml, 'og:site_name')

  return {
    title: stripHtml(ogTitle),
    thumbnail: toAbsoluteUrl(baseUrl, ogImage),
    description: stripHtml(ogDescription),
    publishedAt: ogPublished,
    source: stripHtml(ogSource),
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
        const title = stripHtml(candidate.headline ?? candidate.name)
        const imageField = candidate.image || candidate.thumbnailUrl
        const image =
          typeof imageField === 'string'
            ? imageField
            : Array.isArray(imageField) && typeof imageField[0] === 'string'
            ? imageField[0]
            : undefined
        const publishedAt = candidate.datePublished || candidate.dateModified
        const publisher = candidate.publisher
        const source =
          typeof publisher === 'string'
            ? stripHtml(publisher)
            : publisher && typeof publisher.name === 'string'
            ? stripHtml(publisher.name)
            : undefined
        return {
          title,
          thumbnail: toAbsoluteUrl(baseUrl, image),
          description,
          publishedAt,
          source,
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
): Promise<PageMetadata> => {
  if (!url) return {}
  if (!consumeBudget(budget)) return {}
  try {
    const resp = await fetchWithTimeout(url, undefined)
    if (!resp.ok) return {}

    const html = await resp.text()
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
    const headHtml = headMatch?.[1] ?? html

    const og = extractOg(headHtml, url)
    const ld = extractJsonLd(headHtml, url)
    const title = ld.title ?? og.title ?? extractTitleFromHead(headHtml)
    const source = ld.source ?? og.source

    return {
      title,
      thumbnail: ld.thumbnail ?? og.thumbnail,
      description: ld.description ?? og.description,
      publishedAt: ld.publishedAt ?? og.publishedAt,
      source,
    }
  } catch {
    return {}
  }
}

export const fetchPageMetadata = async (url: string): Promise<PageMetadata> =>
  fetchMetadataFromPage(url, { remaining: 1 })

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

  thumbnail = getMediaUrl(item.enclosure)
  if (!thumbnail) {
    thumbnail = getMediaUrl(item['media:content'])
  }

  if (!thumbnail) {
    const content =
      getText(item['content:encoded']) ?? getText(item.content) ?? getText(item.description)
    const match = content?.match(/<img[^>]+src="([^">]+)"/i) ?? null
    if (match?.[1]) thumbnail = match[1]
  }

  const needsEnrichment =
    !thumbnail ||
    (!description && !options?.hasDescription) ||
    (!publishedAt && !options?.hasPublished)
  if (needsEnrichment) {
    const link = getPreferredLink(item.link)
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
    entry?: FetchedAtomArticle[] | FetchedAtomArticle
    icon?: string
    id?: TextNode
    link?:
      | { rel?: string; type?: string; href: string }
      | { rel?: string; type?: string; href: string }[]
    subtitle?: TextNode
    title?: TextNode
    updated?: string
    lastBuildDate?: string
    pubDate?: string
  }
}

interface FetchedRssArticle {
  title?: TextNode
  description?: TextNode
  link?: LinkNode
  author?: string
  comments?: string
  pubDate?: string
  guid?: TextNode
  content?: TextNode
  'content:encoded'?: TextNode
  enclosure?: MediaNode | MediaNode[]
  'media:content'?: MediaNode | MediaNode[]
}
interface RssFeed {
  rss: {
    channel: {
      title: TextNode
      link: LinkNode
      description: TextNode

      language?: string
      copyright?: string
      managingEditor?: string
      webMaster?: string
      pubDate?: string
      lastBuildDate?: string
      generator?: string
      docs?: string
      ttl?: number

      'atom:link'?: LinkNode
      image?:
        | { url?: string; title?: string; link?: string }
        | { url?: string; title?: string; link?: string }[]
      item?: FetchedRssArticle[] | FetchedRssArticle
      site?: TextNode[]
      subtitle?: TextNode
      updated?: string
      'sy:updateFrequency'?: number
      'sy:updatePeriod'?: string
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
  author?: {
    name?: string
  }
  category?: { scheme?: string; term?: string }[]
  content?: TextNode
  id?: TextNode
  link?: LinkNode
  published?: string
  summary?: TextNode
  title?: TextNode
  updated?: string
  enclosure?: MediaNode | MediaNode[]
  'media:content'?: MediaNode | MediaNode[]
  'content:encoded'?: TextNode
  description?: TextNode
}

export const extractImage = async (
  item: FetchedAtomArticle | FetchedRssArticle,
  budget: MetadataBudget = { remaining: 1 },
): Promise<string | undefined> => {
  const baseUrl = getLink(item.link)

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
    return links.find((l) => l.rel === 'alternate' || l.type === 'text/html')?.href
  } else {
    return links.type === 'text/html' ? links.href : undefined
  }
}

// RFC: https://www.ietf.org/rfc/rfc4287.txt
const parseAtomFeed = async (
  feedId: string,
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

  const feed: Feed = {
    id: feedId,
    title: decodeString(getText(channel?.title)) ?? 'RSS Feed',
    xmlUrl: url,
    htmlUrl: extractHTMLLink(channel.link),
    description: decodeString(getText(channel?.subtitle)) ?? undefined,
    image: channel?.icon ?? undefined,
    lastUpdated: channel?.updated ?? channel?.lastBuildDate ?? channel?.pubDate ?? undefined,
  }

  const articles: Article[] = await Promise.all(
    items.map(async (item: FetchedAtomArticle) => {
      const contentEncoded = getText(item.content) ?? getText(item['content:encoded'])
      const contentFallback = contentEncoded ?? getText(item.description)
      const entryLink = Array.isArray(item.link) ? undefined : getLink(item.link)
      const rawId = getText(item.id) ?? entryLink ?? getText(item.title) ?? `${Date.now()}`
      const encodedId = encodeBase64(rawId) ?? rawId
      const feedDescription = stripHtml(getText(item.description) ?? getText(item.summary))
      const feedPublished = item.published ?? item.updated ?? undefined

      const metadata = await extractMetadataFromFeed(item, {
        baseUrl: url,
        budget,
        hasDescription: Boolean(feedDescription),
        hasPublished: Boolean(feedPublished),
      })

      return {
        id: encodedId,
        title: decodeString(getText(item.title)) ?? 'Untitled',
        link: entryLink ?? url,
        source: decodeString(getText(channel?.title)) ?? 'RSS Feed',
        publishedAt: feedPublished ?? metadata.publishedAt ?? undefined,
        updatedAt: item.updated ?? undefined,
        description: feedDescription ?? metadata.description,
        content: contentFallback ?? getText(item.summary) ?? undefined,
        thumbnail: metadata.thumbnail ?? undefined,
        feedId: feed.id,
        read: false,
        saved: false,
      }
    }),
  )

  return { feed, articles: dedupeById(articles) }
}

// Specs: https://www.rssboard.org/rss-specification
const parseRssFeed = async (
  feedId: string,
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
  const htmlUrl = getLink(channel?.link)
  const feed: Feed = {
    id: feedId,
    title: decodeString(getText(channel?.title)) ?? 'RSS Feed',
    xmlUrl: url,
    htmlUrl: htmlUrl ?? undefined,
    description: decodeString(getText(channel?.subtitle)) ?? undefined,
    image:
      (Array.isArray(channel?.image) ? channel?.image[0]?.url : channel?.image?.url) ?? undefined,
    lastUpdated: channel?.updated ?? channel?.lastBuildDate ?? channel?.pubDate ?? undefined,
  }

  const articles: Article[] = await Promise.all(
    items.map(async (item: FetchedRssArticle) => {
      const contentEncoded = getText(item['content:encoded']) ?? getText(item.content)
      const contentFallback = contentEncoded ?? getText(item.description)
      const rawId =
        getText(item.guid) ?? getLink(item.link) ?? getText(item.title) ?? `${Date.now()}`

      const encodedId = encodeBase64(rawId) ?? rawId
      const feedDescription = stripHtml(getText(item.description))
      const feedPublished = item.pubDate ?? undefined

      const metadata = await extractMetadataFromFeed(item, {
        baseUrl: url,
        budget,
        hasDescription: Boolean(feedDescription),
        hasPublished: Boolean(feedPublished),
      })

      return {
        id: encodedId,
        title: decodeString(getText(item.title)) ?? 'Untitled',
        link: getLink(item.link) ?? url,
        source: decodeString(getText(channel?.title)) ?? 'RSS Feed',
        publishedAt: feedPublished ?? metadata.publishedAt ?? undefined,
        updatedAt: undefined,
        description: feedDescription ?? metadata.description,
        content: contentFallback ?? undefined,
        thumbnail: metadata.thumbnail ?? undefined,
        feedId: feed.id,
        read: false,
        saved: false,
      }
    }),
  )

  return { feed, articles: dedupeById(articles) }
}

type FetchOptions = {
  cutoffTs?: number
  metadataBudget?: MetadataBudget
  cache?: { ETag?: string; lastModified?: string }
  existingFeed?: Feed
}

export const fetchFeed = async (
  feedId: string,
  url: string,
  options: FetchOptions = {},
): Promise<{ feed: Feed; articles: Article[] }> => {
  const { cutoffTs = 0, metadataBudget, cache, existingFeed } = options
  const headers = new Headers()
  if (cache?.ETag) {
    if (cache.ETag.includes('-zip')) {
      headers.set(
        'If-None-Match',
        [cache.ETag, cache.ETag.replace('--zip', '').replace('-zip', '')].join(', '),
      )
    } else {
      headers.set('If-None-Match', cache.ETag)
    }
  }
  if (cache?.lastModified) {
    headers.set('If-Modified-Since', cache.lastModified)
  }
  let response
  try {
    response = await fetch(url, { headers })
  } catch (e) {
    console.log('e', url, headers, { e })
    throw e
  }
  const responseHeaders =
    response.headers && typeof response.headers.get === 'function'
      ? response.headers
      : new Headers()
  const cacheMetadata = extractCacheMetadata(responseHeaders)

  if (response.status === 304) {
    if (!existingFeed) {
      throw new Error('Received 304 without existing feed metadata')
    }
    return {
      feed: mergeCacheMetadata(existingFeed, cacheMetadata),
      articles: [],
    }
  }

  if (response.status !== 200) {
    throw new Error(`Received ${response.status} for feed ${url}`)
  }

  console.log('extract cache', url, headers, response.status)

  const xml = await response.text()
  const parsed: FetchedFeed = parser.parse(xml)

  if ('feed' in parsed) {
    const result = await parseAtomFeed(feedId, url, parsed, cutoffTs, metadataBudget)
    return { ...result, feed: mergeCacheMetadata(result.feed, cacheMetadata) }
  } else {
    const result = await parseRssFeed(feedId, url, parsed, cutoffTs, metadataBudget)
    return { ...result, feed: mergeCacheMetadata(result.feed, cacheMetadata) }
  }
}
