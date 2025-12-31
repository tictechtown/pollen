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
    const headResponse = {
      ok: true,
      headers: { get: () => 'text/html' },
    }
    const htmlResponse = {
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

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(headResponse as any)
      .mockResolvedValueOnce(htmlResponse as any)

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
    const headResponse = {
      ok: true,
      headers: { get: () => 'text/html' },
    }
    const htmlResponse = {
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

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(headResponse as any)
      .mockResolvedValueOnce(htmlResponse as any)

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
    lastPublishedAt: string | null
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
    lastPublishedAt: feed?.lastPublishedAt ?? null,
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

  it.each(fixtures)('parses $title', async (entry) => {
    const xmlPath = fileURLToPath(new URL(`./__tests__/feeds/${entry.file}`, import.meta.url))
    const xml = readFileSync(xmlPath, 'utf8')

    vi.spyOn(console, 'log').mockImplementation(() => {})

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      text: async () => xml,
    } as any)

    const { feed, articles } = await fetchFeed(entry.url, { metadataBudget: { remaining: 0 } })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(entry.url)

    expect(normalizeFeed(feed)).toEqual(entry.expectedFeed)
    expect(articles.length).toEqual(entry.expectedArticleCount)

    const expectedArticles = entry.expectedArticles ?? []
    const actualArticles = articles.slice(0, expectedArticles.length).map(normalizeArticle)
    expect(actualArticles).toEqual(expectedArticles)
  })

  it('downloads all OPML feeds', () => {
    expect(failures).toEqual([])
  })
})
