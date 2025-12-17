import { Buffer } from 'buffer'
import { XMLParser } from 'fast-xml-parser'
import he from 'he'

import { Article, Feed } from '@/types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

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

const fetchOgImage = async (url?: string): Promise<string | undefined> => {
  if (!url) return undefined
  try {
    const headResp = await fetch(url, { method: 'HEAD' })
    if (!headResp.ok) return undefined
    const contentType = headResp.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return undefined

    const resp = await fetch(url)
    const html = await resp.text()
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    return match?.[1]
  } catch {
    return undefined
  }
}

export const extractImage = async (
  item: FetchedAtomArticle | FetchedRssArticle,
): Promise<string | undefined> => {
  const enclosure = item.enclosure
  if (enclosure) {
    if (Array.isArray(enclosure)) {
      const withUrl = enclosure.find((enc) => enc.url)
      if (withUrl?.url) return withUrl.url
    } else if (enclosure.url) {
      return enclosure.url
    }
  }

  const mediaContent = item['media:content']
  if (mediaContent) {
    if (Array.isArray(mediaContent)) {
      const withUrl = mediaContent.find((m) => m.url)
      if (withUrl?.url) return withUrl.url
    } else if (mediaContent.url) {
      return mediaContent.url
    }
  }

  const content = item['content:encoded'] ?? item.content?.['#text'] ?? item.content
  const match = typeof content === 'string' ? content.match(/<img[^>]+src="([^">]+)"/i) : null
  if (match?.[1]) return match[1]

  return fetchOgImage(item.link?.href ?? item.link?.['#text'] ?? item.link)
}

interface AtomFeed {
  feed: {
    entry: FetchedAtomArticle[]
    icon: string
    id: string
    link: { rel: string; type?: string; href: string }[]
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
      image: { url: string; title: string; link: string }[]
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

const parseAtomFeed = async (url: string, atomFeed: AtomFeed) => {
  const channel = atomFeed.feed

  const items = toArray(channel?.entry)
  const feedIdSource = channel?.link?.[0]?.href ?? channel?.link?.[0]?.['#text'] ?? url

  const feed: Feed = {
    id: encodeBase64(feedIdSource) ?? feedIdSource ?? url,
    title:
      decodeString(typeof channel?.title === 'string' ? channel?.title : channel?.title['#text']) ??
      'RSS Feed',
    url,
    description: decodeString(channel?.subtitle?.['#text']) ?? undefined,
    image: channel?.icon ?? undefined,
    lastUpdated: channel?.updated ?? channel?.lastBuildDate ?? channel?.pubDate ?? undefined,
  }

  const articles: Article[] = await Promise.all(
    items.map(async (item: FetchedAtomArticle) => {
      const contentEncoded = item.content?.['#text'] ?? item.content ?? item.description
      const rawId =
        item.id['#text'] ?? item.id ?? item.link.href ?? item.title['#text'] ?? `${Date.now()}`
      const encodedId = encodeBase64(rawId) ?? rawId
      const thumbnail = await extractImage(item)

      if (thumbnail === undefined && url.includes('techcrunch.com')) {
        console.log('thumbnail', item)
      }

      return {
        id: encodedId,
        title:
          decodeString(typeof item.title === 'string' ? item.title : item.title['#text']) ??
          'Untitled',
        link: item.link['href'] ?? url,
        source:
          (typeof channel?.title === 'string' ? channel?.title : channel?.title['#text']) ??
          'RSS Feed',
        publishedAt: item.published ?? undefined,
        updatedAt: item.updated ?? undefined,
        description: decodeString(item.description ?? item.summary?.['#text']) ?? undefined,
        content: typeof contentEncoded === 'string' ? contentEncoded : undefined,
        thumbnail,
        seen: false,
        saved: false,
      }
    }),
  )

  return { feed, articles: dedupeById(articles) }
}

const parseRssFeed = async (url: string, rssFeed: RssFeed) => {
  const channel = rssFeed.rss.channel
  const items = toArray(channel?.item)
  const feedIdSource = channel?.link?.[0]?.href ?? channel?.link?.[0]?.['#text'] ?? url
  const feed: Feed = {
    id: encodeBase64(feedIdSource) ?? feedIdSource ?? url,
    title:
      decodeString(typeof channel?.title === 'string' ? channel?.title : channel?.title['#text']) ??
      'RSS Feed',
    url,
    description: decodeString(channel?.subtitle?.['#text']) ?? undefined,
    image: channel?.icon ?? undefined,
    lastUpdated: channel?.updated ?? channel?.lastBuildDate ?? channel?.pubDate ?? undefined,
  }

  const articles: Article[] = await Promise.all(
    items.map(async (item: FetchedRssArticle) => {
      const contentEncoded =
        item['content:encoded'] ??
        item['content:encoded']?.['#text'] ??
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
      const thumbnail = await extractImage(item)

      if (thumbnail === undefined && url.includes('techcrunch.com')) {
        console.log('thumbnail', item)
      }

      return {
        id: encodedId,
        title:
          decodeString(typeof item.title === 'string' ? item.title : item.title['#text']) ??
          'Untitled',
        link: item.link?.['href'] ?? item.link ?? url,
        source:
          (typeof channel?.title === 'string' ? channel?.title : channel?.title['#text']) ??
          'RSS Feed',
        publishedAt: item.pubDate ?? undefined,
        updatedAt: undefined,
        description: decodeString(item.description?.['#text'] ?? item.description) ?? undefined,
        content: typeof contentEncoded === 'string' ? contentEncoded : undefined,
        thumbnail,
        seen: false,
        saved: false,
      }
    }),
  )

  return { feed, articles: dedupeById(articles) }
}

export const fetchFeed = async (url: string): Promise<{ feed: Feed; articles: Article[] }> => {
  console.log('fetching', url)
  const response = await fetch(url)
  const xml = await response.text()
  const parsed: FetchedFeed = parser.parse(xml)

  if ('feed' in parsed) {
    return parseAtomFeed(url, parsed)
  } else {
    return parseRssFeed(url, parsed)
  }
}
