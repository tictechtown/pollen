import { afterEach, describe, expect, it, vi } from 'vitest'

import { discoverFeedUrls } from './feedDiscovery'

const createHeaders = (contentType?: string | null) => ({
  get: (name: string) => (name.toLowerCase() === 'content-type' ? (contentType ?? null) : null),
})

describe('discoverFeedUrls', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns directUrl when HEAD is a feed content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: createHeaders('application/rss+xml; charset=utf-8'),
    } as any)

    const result = await discoverFeedUrls('https://example.com/rss.xml')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      directUrl: 'https://example.com/rss.xml',
      directKind: 'rss',
      candidates: [],
    })
  })

  it('extracts RSS and Atom links from HTML head', async () => {
    const html = `<!doctype html>
      <html>
        <head>
          <link rel="alternate" type="application/rss+xml" title="News" href="/rss.xml">
          <link rel="alternate" type="application/atom+xml" title="Atom" href="https://example.com/atom.xml">
        </head>
        <body></body>
      </html>`

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('HEAD not allowed'))
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://example.com/page',
        headers: createHeaders('text/html'),
        text: async () => html,
      } as any)

    const result = await discoverFeedUrls('https://example.com/page')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      candidates: [
        { url: 'https://example.com/rss.xml', title: 'News', kind: 'rss' },
        { url: 'https://example.com/atom.xml', title: 'Atom', kind: 'atom' },
      ],
    })
  })

  it('returns directUrl when response body looks like a feed', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        headers: createHeaders(null),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://example.com/feed',
        headers: createHeaders('text/plain'),
        text: async () => '<?xml version="1.0"?><rss><channel></channel></rss>',
      } as any)

    const result = await discoverFeedUrls('https://example.com/feed')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      directUrl: 'https://example.com/feed',
      directKind: 'rss',
      candidates: [],
    })
  })

  it('resolves relative URLs and dedupes candidates', async () => {
    const html = `<!doctype html>
      <html>
        <head>
          <link rel="alternate" type="application/rss+xml" href="/rss.xml">
          <link rel="alternate" type="application/rss+xml" href="/rss.xml">
          <link rel="alternate" type="application/atom+xml" href="atom.xml">
        </head>
        <body></body>
      </html>`

    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('HEAD not allowed'))
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://example.com/blog/',
        headers: createHeaders('text/html'),
        text: async () => html,
      } as any)

    const result = await discoverFeedUrls('https://example.com/blog/')

    expect(result).toEqual({
      candidates: [
        { url: 'https://example.com/rss.xml', title: undefined, kind: 'rss' },
        { url: 'https://example.com/blog/atom.xml', title: undefined, kind: 'atom' },
      ],
    })
  })

  it('returns empty candidates when none found', async () => {
    const html = `<!doctype html><html><head><title>No feeds</title></head><body></body></html>`

    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('HEAD not allowed'))
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://example.com/',
        headers: createHeaders('text/html'),
        text: async () => html,
      } as any)

    const result = await discoverFeedUrls('https://example.com/')

    expect(result).toEqual({ candidates: [] })
  })

  it('returns opmlUrl when response body is OPML', async () => {
    const opml = `<?xml version="1.0"?>
      <opml version="2.0">
        <body>
          <outline type="rss" xmlUrl="https://example.com/rss.xml" />
        </body>
      </opml>`

    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('HEAD not allowed'))
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://example.com/subscriptions.opml',
        headers: createHeaders('application/xml'),
        text: async () => opml,
      } as any)

    const result = await discoverFeedUrls('https://example.com/subscriptions.opml')

    expect(result).toEqual({
      opmlUrl: 'https://example.com/subscriptions.opml',
      candidates: [],
    })
  })
})
