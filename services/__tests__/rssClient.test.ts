import { afterEach, describe, expect, it, vi } from 'vitest'

import { encodeBase64, extractImage } from '../rssClient'

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

describe('extractImage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns enclosure url when present', async () => {
    const item: any = {
      enclosure: { url: 'https://example.com/image.jpg' },
      link: { href: 'https://example.com' },
      title: 'Title',
      id: '1',
      content: '',
    }
    const url = await extractImage(item)
    expect(url).toBe('https://example.com/image.jpg')
  })

  it('falls back to og:image when no enclosure exists', async () => {
    const item: any = {
      link: { href: 'https://example.org/article' },
      title: 'Title',
      id: '2',
      content: '',
    }

    const headResponse = {
      ok: true,
      headers: { get: () => 'text/html' },
    }
    const htmlResponse = {
      text: async () =>
        '<html><head><meta property="og:image" content="https://example.org/og.jpg" /></head></html>',
    }

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      // HEAD
      .mockResolvedValueOnce(headResponse as any)
      // GET
      .mockResolvedValueOnce(htmlResponse as any)

    const url = await extractImage(item)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(url).toBe('https://example.org/og.jpg')
  })
})
