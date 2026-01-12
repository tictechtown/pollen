// Tests for RSS parsing utilities.
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Manifest from './__tests__/feeds/manifest.json'
import { encodeBase64, fetchFeed, fetchPageMetadata, parseCacheControl } from './rssClient'

describe('encodeBase64', () => {
  it('encodes plain text to base64', () => {
    const result = encodeBase64('hello world')
    expect(result).toBe('aGVsbG8gd29ybGQ')
  })
  it('returns URL-safe base64 without slashes or padding', () => {
    const result = encodeBase64('hello/world')
    expect(result).toBe('aGVsbG8vd29ybGQ')
  })
})

describe('fetchPageMetadata', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses og metadata when present', async () => {
    const htmlResponse = {
      status: 200,
      ok: true,
      text: async () => `
        <html>
          <head>
            <title>Fallback Title</title>
            <meta property="og:title" content="OG Title" />
            <meta property="og:description" content="OG desc" />
            <meta property="og:image" content="https://example.com/og.jpg" />
            <meta property="og:site_name" content="Example Site" />
            <meta property="article:published_time" content="2024-01-01" />
          </head>
        </html>
      `,
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(htmlResponse as any)

    const metadata = await fetchPageMetadata('https://example.com/article')

    expect(metadata).toEqual({
      title: 'OG Title',
      description: 'OG desc',
      thumbnail: 'https://example.com/og.jpg',
      publishedAt: '2024-01-01',
      source: 'Example Site',
    })
  })

  it('prefers json-ld metadata over og', async () => {
    const htmlResponse = {
      ok: true,
      status: 200,
      text: async () => `
        <html>
          <head>
            <meta property="og:title" content="OG Title" />
            <meta property="og:description" content="OG desc" />
            <meta property="og:image" content="https://example.com/og.jpg" />
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": "LD Title",
                "description": "LD desc",
                "image": "https://example.com/ld.jpg",
                "datePublished": "2024-02-01",
                "publisher": { "name": "LD Source" }
              }
            </script>
          </head>
        </html>
      `,
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(htmlResponse as any)

    const metadata = await fetchPageMetadata('https://example.com/article')

    expect(metadata).toEqual({
      title: 'LD Title',
      description: 'LD desc',
      thumbnail: 'https://example.com/ld.jpg',
      publishedAt: '2024-02-01',
      source: 'LD Source',
    })
  })
})

describe('parseCacheControl', () => {
  it('parses max-age from multi-directive headers', () => {
    expect(parseCacheControl('private, must-revalidate, max-age=900')).toBe(900)
  })

  it('parses max-age=0 with multiple directives', () => {
    expect(parseCacheControl('no-cache, must-revalidate, max-age=0, no-store, private')).toBe(0)
  })

  it('parses max-age when only directive', () => {
    expect(parseCacheControl('max-age=120')).toBe(120)
  })

  it('parses s-maxage when max-age is absent', () => {
    expect(parseCacheControl('s-maxage=600')).toBe(600)
  })

  it('prefers max-age over s-maxage when both exist', () => {
    expect(parseCacheControl('s-maxage=600, max-age=120')).toBe(120)
  })

  it('returns max-age=900 when `;` delimiter is used', () => {
    expect(parseCacheControl('max-age=900; private')).toBe(900)
  })
  it('returns max-age=900 when unknown delimiters are used', () => {
    expect(parseCacheControl('private|max-age=900')).toBe(null)
  })
})

describe('fetchFeed', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  type ExpectedFeed = {
    id: string | null
    title: string | null
    xmlUrl: string | null
    image: string | null
    description: string | null
    lastUpdated: string | null
  }

  type ExpectedArticle = {
    id: string | null
    title: string | null
    description: string | null
    link: string | null
    source: string | null
    thumbnail: string | null
    feedId: string | null
    read: boolean | null
    saved: boolean | null
    publishedAt: string | null
    updatedAt: string | null
  }

  type ManifestEntry = {
    title: string
    url: string
    file: string
    ok: boolean
    error?: string
    expectedFeed: ExpectedFeed
    expectedArticleCount: number
    expectedArticles: ExpectedArticle[]
  }

  type Manifest = { results: ManifestEntry[] }

  const manifest: Manifest = Manifest

  const fixtures = manifest.results.filter((entry) => entry.ok)
  const failures = manifest.results.filter((entry) => !entry.ok)

  const normalizeFeed = (feed: any): ExpectedFeed => ({
    id: feed?.id ?? null,
    title: feed?.title ?? null,
    xmlUrl: feed?.xmlUrl ?? null,
    image: feed?.image ?? null,
    description: feed?.description ?? null,
    lastUpdated: feed?.lastUpdated ?? null,
  })

  const normalizeArticle = (article: any): ExpectedArticle => ({
    id: article?.id ?? null,
    title: article?.title ?? null,
    description: article?.description ?? null,
    link: article?.link ?? null,
    source: article?.source ?? null,
    thumbnail: article?.thumbnail ?? null,
    feedId: article?.feedId ?? null,
    read: article?.read ?? null,
    saved: article?.saved ?? null,
    publishedAt: article?.publishedAt ?? null,
    updatedAt: article?.updatedAt ?? null,
  })

  it('trims leading whitespace in feed title, article title, and summary', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>   Feed Title</title>
  <id>feed-id</id>
  <updated>2024-01-01T00:00:00Z</updated>
  <entry>
    <id>entry-1</id>
    <title>   Article Title</title>
    <summary>   Summary text</summary>
    <link href="https://example.com/article" />
    <updated>2024-01-01T00:00:00Z</updated>
  </entry>
</feed>`

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      text: async () => xml,
    } as any)

    const { feed, articles } = await fetchFeed('feed-id', 'https://example.com/feed', {
      metadataBudget: { remaining: 0 },
    })

    expect(feed.title).toBe('Feed Title')
    expect(articles[0]?.title).toBe('Article Title')
    expect(articles[0]?.description).toBe('Summary text')
  })

  it.each(fixtures)('parses $title', async (entry) => {
    const xmlPath = fileURLToPath(new URL(`./__tests__/feeds/${entry.file}`, import.meta.url))
    const xml = readFileSync(xmlPath, 'utf8')

    vi.spyOn(console, 'log').mockImplementation(() => {})

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      text: async () => xml,
    } as any)

    const { feed, articles } = await fetchFeed(entry.expectedFeed.id!, entry.url, {
      metadataBudget: { remaining: 0 },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(entry.url, { headers: new Headers() })

    // Legacy fixtures may include `lastPublishedAt`, but we no longer track it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lastPublishedAt: _ignored, ...expectedFeed } = entry.expectedFeed as any
    expect(normalizeFeed(feed)).toEqual(expectedFeed)
    expect(articles.length).toEqual(entry.expectedArticleCount)

    const expectedArticles = entry.expectedArticles ?? []
    const actualArticles = articles.slice(0, expectedArticles.length).map(normalizeArticle)
    expect(actualArticles).toEqual(expectedArticles)
  })

  it('defaults expiresTS to now plus five minutes when cache headers are missing', async () => {
    vi.useFakeTimers()
    const now = new Date('2024-01-01T00:00:00Z')
    vi.setSystemTime(now)

    try {
      const xml = `
        <rss version="2.0">
          <channel>
            <title>Sample Feed</title>
            <link>https://example.com</link>
            <description>Example feed</description>
            <item>
              <title>Entry</title>
              <link>https://example.com/entry</link>
              <guid>entry-1</guid>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
      `

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        text: async () => xml,
      } as any)

      const { feed } = await fetchFeed('feed-1', 'https://example.com/rss.xml', {
        metadataBudget: { remaining: 0 },
      })

      expect(feed.expiresTS).toBe(now.getTime() + 5 * 60 * 1000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('bumps expiresTS on 304 responses when cached value is already expired', async () => {
    vi.useFakeTimers()
    const now = new Date('2024-01-01T00:00:00Z')
    vi.setSystemTime(now)

    try {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 304,
        headers: new Headers(),
      } as any)

      const { feed, articles } = await fetchFeed('feed-1', 'https://example.com/rss.xml', {
        metadataBudget: { remaining: 0 },
        existingFeed: {
          id: 'feed-1',
          title: 'Example Feed',
          xmlUrl: 'https://example.com/rss.xml',
          image: null,
          description: null,
          lastUpdated: null,
          expiresTS: now.getTime() - 60 * 1000,
        } as any,
      })

      expect(articles).toEqual([])
      expect(feed.expiresTS).toBe(now.getTime() + 5 * 60 * 1000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('uses syndication update hints for expiresTS when available', async () => {
    vi.useFakeTimers()
    const now = new Date('2024-01-01T00:00:00Z')
    vi.setSystemTime(now)

    try {
      const xmlPath = fileURLToPath(
        new URL('./__tests__/feeds/ars-technica__09cc00c55f.xml', import.meta.url),
      )
      const xml = readFileSync(xmlPath, 'utf8')

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        text: async () => xml,
      } as any)

      const { feed } = await fetchFeed('feed-ars', 'https://arstechnica.com/feed/', {
        metadataBudget: { remaining: 0 },
      })

      expect(feed.expiresTS).toBe(now.getTime() + 60 * 60 * 1000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('downloads all OPML feeds', () => {
    expect(failures).toEqual([])
  })
})
