import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type Article } from '@/types'

vi.mock('@/services/reader-api', () => ({
  readerApi: {
    articles: {
      get: vi.fn(),
      setSaved: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

vi.mock('@/services/rssClient', () => ({
  encodeBase64: (value?: string | null) => {
    if (value === undefined || value === null) return undefined
    const makeUrlSafe = (input: string) =>
      input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    // Buffer is available in Node test environment.
    return makeUrlSafe(Buffer.from(value, 'utf-8').toString('base64'))
  },
  fetchPageMetadata: vi.fn().mockResolvedValue({}),
}))

import { readerApi } from '@/services/reader-api'
import { fetchPageMetadata } from '@/services/rssClient'
import { getSavedArticleId, saveArticleForLater } from './save-for-later'

describe('saveArticleForLater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns already-saved for duplicates', async () => {
    const url = 'https://example.com/post'
    const id = getSavedArticleId(url)
    vi.mocked(readerApi.articles.get).mockResolvedValueOnce({
      id,
      link: url,
      feedId: 'feed',
      title: 't',
      source: 's',
      saved: true,
      read: false,
    } as Article)

    const result = await saveArticleForLater({
      url,
      updateSavedLocal: vi.fn(),
      invalidate: vi.fn(),
    })

    expect(result).toEqual({ status: 'already-saved', id })
    expect(readerApi.articles.upsert).not.toHaveBeenCalled()
  })

  it('marks an existing article as saved', async () => {
    const url = 'https://example.com/post'
    const id = getSavedArticleId(url)
    const updateSavedLocal = vi.fn()
    vi.mocked(readerApi.articles.get).mockResolvedValueOnce({
      id,
      link: url,
      feedId: 'feed',
      title: 't',
      source: 's',
      saved: false,
      read: false,
    } as Article)

    const result = await saveArticleForLater({
      url,
      updateSavedLocal,
      invalidate: vi.fn(),
    })

    expect(result).toEqual({ status: 'saved', id })
    expect(readerApi.articles.setSaved).toHaveBeenCalledWith(id, true)
    expect(updateSavedLocal).toHaveBeenCalledWith(id, true)
  })

  it('saves immediately and enriches metadata opportunistically', async () => {
    vi.mocked(readerApi.articles.get).mockResolvedValueOnce(null)
    let resolveMetadata: ((value: unknown) => void) | undefined
    vi.mocked(fetchPageMetadata).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMetadata = resolve as (value: unknown) => void
        }),
    )

    const url = 'https://example.com/post'
    const invalidate = vi.fn()

    const result = await saveArticleForLater({
      url,
      updateSavedLocal: vi.fn(),
      invalidate,
    })

    expect(result.status).toBe('saved')
    expect(readerApi.articles.upsert).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledTimes(1)

    resolveMetadata?.({ title: 'Hello', source: 'Example' })

    await Promise.resolve()
    await Promise.resolve()

    expect(readerApi.articles.upsert).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledTimes(2)
  })

  it('does not fail saving when metadata fetch fails', async () => {
    vi.mocked(readerApi.articles.get).mockResolvedValueOnce(null)
    vi.mocked(fetchPageMetadata).mockRejectedValueOnce(new Error('offline'))

    const url = 'https://example.com/post'
    const result = await saveArticleForLater({
      url,
      updateSavedLocal: vi.fn(),
      invalidate: vi.fn(),
    })

    expect(result.status).toBe('saved')
    expect(readerApi.articles.upsert).toHaveBeenCalledTimes(1)

    await Promise.resolve()
    await Promise.resolve()

    expect(readerApi.articles.upsert).toHaveBeenCalledTimes(1)
  })
})
