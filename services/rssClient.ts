import { Buffer } from 'buffer'
import { XMLParser } from 'fast-xml-parser'

import { Article, Feed } from '@/types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

const encodeBase64 = (value?: string | null): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value)
  }

  try {
    return Buffer.from(value, 'utf-8').toString('base64')
  } catch {
    return undefined
  }
}

const toArray = <T>(maybe: T | T[] | undefined): T[] => {
  if (!maybe) return []
  return Array.isArray(maybe) ? maybe : [maybe]
}

const extractImage = (item: FetchedArticle): string | undefined => {
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

  const content = item['content:encoded'] ?? item.content
  const match = typeof content === 'string' ? content.match(/<img[^>]+src="([^">]+)"/i) : null
  return match?.[1]
}

interface FetchedRSSFeed {
  '?xml': {
    encoding: string
    version: string
  }
  feed: {
    entry: FetchedArticle[]
    icon: string
    id: string
    link: { rel: string; type: string; href: string }[]
    subtitle?: {
      '#text': string
      type: string
    }
    title: {
      '#text': string
      type: string
    }
    updated: string
  }
}

interface FetchedArticle {
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
  }
  published: string
  summary: {
    '#text': string
    type: string
  }
  title: {
    '#text': string
    type: string
  }
  updated: string
}

export const fetchFeed = async (url: string): Promise<{ feed: Feed; articles: Article[] }> => {
  const response = await fetch(url)
  const xml = await response.text()
  const parsed: FetchedRSSFeed = parser.parse(xml)

  const channel = parsed?.feed
  const items = toArray(channel?.entry)
  const feedIdSource = channel?.link?.[0]?.href ?? channel?.link?.[0]?.['#text'] ?? url

  const feed: Feed = {
    id: encodeBase64(feedIdSource) ?? feedIdSource ?? url,
    title: channel?.title['#text'] ?? 'RSS Feed',
    url,
    description: channel?.subtitle['#text'] ?? undefined,
    image: channel?.icon ?? undefined,
    lastUpdated: channel?.updated ?? channel?.lastBuildDate ?? channel?.pubDate ?? undefined,
  }

  const articles: Article[] = items.map((item: FetchedArticle) => {
    const contentEncoded = item['content:encoded'] ?? item.content?.['#text'] ?? item.description
    const rawId = item.guid ?? item.id ?? item.link.href ?? item.title['#text'] ?? `${Date.now()}`
    const encodedId = encodeBase64(rawId) ?? rawId
    return {
      id: encodedId,
      title: item.title['#text'] ?? 'Untitled',
      link: item.link['href'] ?? url,
      source: channel?.title['#text'] ?? 'RSS Feed',
      publishedAt: item.pubDate ?? undefined,
      updatedAt: item.updated ?? undefined,
      description: item.description ?? item.summary['#text'] ?? undefined,
      content: typeof contentEncoded === 'string' ? contentEncoded : undefined,
      thumbnail: extractImage(item),
      seen: false,
      saved: false,
    }
  })

  return { feed, articles }
}
