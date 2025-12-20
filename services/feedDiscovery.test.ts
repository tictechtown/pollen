import { afterEach, describe, expect, it, vi } from 'vitest'

import { discoverFeedUrls } from './feedDiscovery'

const createHeaders = (contentType?: string | null) => ({
  get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType ?? null : null),
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
    expect(result).toEqual({ directUrl: 'https://example.com/rss.xml', candidates: [] })
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
        { url: 'https://example.com/rss.xml', title: 'News' },
        { url: 'https://example.com/atom.xml', title: 'Atom' },
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
    expect(result).toEqual({ directUrl: 'https://example.com/feed', candidates: [] })
  })
})
