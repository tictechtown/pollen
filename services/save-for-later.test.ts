import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type Article } from '@/types'

vi.mock('@/services/articles-db', () => ({
  setArticleSaved: vi.fn().mockResolvedValue(undefined),
  upsertArticles: vi.fn().mockResolvedValue(undefined),
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

import { upsertArticles, setArticleSaved } from '@/services/articles-db'
import { fetchPageMetadata } from '@/services/rssClient'
import { getSavedArticleId, saveArticleForLater } from './save-for-later'

describe('saveArticleForLater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns already-saved for duplicates', async () => {
    const url = 'https://example.com/post'
    const id = getSavedArticleId(url)
    const articles: Article[] = [
      { id, link: url, feedId: 'feed', title: 't', source: 's', saved: true, read: false },
    ]

    const result = await saveArticleForLater({
      url,
      articles,
      updateSavedLocal: vi.fn(),
      upsertArticleLocal: vi.fn(),
    })

    expect(result).toEqual({ status: 'already-saved', id })
    expect(upsertArticles).not.toHaveBeenCalled()
  })

  it('marks an existing article as saved', async () => {
    const url = 'https://example.com/post'
    const id = getSavedArticleId(url)
    const updateSavedLocal = vi.fn()
    const articles: Article[] = [
      { id, link: url, feedId: 'feed', title: 't', source: 's', saved: false, read: false },
    ]

    const result = await saveArticleForLater({
      url,
      articles,
      updateSavedLocal,
      upsertArticleLocal: vi.fn(),
    })

    expect(result).toEqual({ status: 'saved', id })
    expect(setArticleSaved).toHaveBeenCalledWith(id, true)
    expect(updateSavedLocal).toHaveBeenCalledWith(id, true)
  })

  it('saves immediately and enriches metadata opportunistically', async () => {
    let resolveMetadata: ((value: unknown) => void) | undefined
    vi.mocked(fetchPageMetadata).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMetadata = resolve as (value: unknown) => void
        }),
    )

    const url = 'https://example.com/post'
    const upsertArticleLocal = vi.fn()

    const result = await saveArticleForLater({
      url,
      articles: [],
      updateSavedLocal: vi.fn(),
      upsertArticleLocal,
    })

    expect(result.status).toBe('saved')
    expect(upsertArticles).toHaveBeenCalledTimes(1)
    expect(upsertArticleLocal).toHaveBeenCalledTimes(1)

    resolveMetadata?.({ title: 'Hello', source: 'Example' })

    await Promise.resolve()
    await Promise.resolve()

    expect(upsertArticles).toHaveBeenCalledTimes(2)
    expect(upsertArticleLocal).toHaveBeenCalledTimes(2)
  })

  it('does not fail saving when metadata fetch fails', async () => {
    vi.mocked(fetchPageMetadata).mockRejectedValueOnce(new Error('offline'))

    const url = 'https://example.com/post'
    const result = await saveArticleForLater({
      url,
      articles: [],
      updateSavedLocal: vi.fn(),
      upsertArticleLocal: vi.fn(),
    })

    expect(result.status).toBe('saved')
    expect(upsertArticles).toHaveBeenCalledTimes(1)

    await Promise.resolve()
    await Promise.resolve()

    expect(upsertArticles).toHaveBeenCalledTimes(1)
  })
})
