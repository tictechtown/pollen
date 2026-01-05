import { describe, expect, it } from 'vitest'

import type { Article } from '@/types'

import {
  getTotalPages,
  selectFeedArticles,
  selectPaged,
  selectSavedArticles,
  selectUnreadArticles,
} from './articles-selectors'

const makeArticle = (overrides: Partial<Article>): Article => ({
  id: overrides.id ?? 'id',
  title: overrides.title ?? 't',
  link: overrides.link ?? 'https://example.com',
  source: overrides.source ?? 's',
  read: overrides.read ?? false,
  saved: overrides.saved ?? false,
  feedId: overrides.feedId,
  publishedAt: overrides.publishedAt,
  updatedAt: overrides.updatedAt,
  description: overrides.description,
  content: overrides.content,
  thumbnail: overrides.thumbnail,
})

describe('articles-selectors', () => {
  it('selectFeedArticles filters by selected feed', () => {
    const articles = [
      makeArticle({ id: 'a1', feedId: 'f1' }),
      makeArticle({ id: 'a2', feedId: 'f2' }),
      makeArticle({ id: 'a3', feedId: undefined }),
    ]

    expect(selectFeedArticles(articles, 'f1').map((a) => a.id)).toEqual(['a1'])
  })

  it('selectFeedArticles excludes saved-for-later entries when no feed selected', () => {
    const articles = [
      makeArticle({ id: 'a1', feedId: 'f1' }),
      makeArticle({ id: 'a2', feedId: undefined }),
    ]

    expect(selectFeedArticles(articles).map((a) => a.id)).toEqual(['a1'])
  })

  it('selectUnreadArticles filters read articles when enabled', () => {
    const articles = [makeArticle({ id: 'a1', read: true }), makeArticle({ id: 'a2', read: false })]
    expect(selectUnreadArticles(articles, true).map((a) => a.id)).toEqual(['a2'])
    expect(selectUnreadArticles(articles, false).map((a) => a.id)).toEqual(['a1', 'a2'])
  })

  it('getTotalPages never returns 0', () => {
    expect(getTotalPages(0, 100)).toBe(1)
    expect(getTotalPages(1, 100)).toBe(1)
    expect(getTotalPages(101, 100)).toBe(2)
  })

  it('selectPaged slices based on page and size', () => {
    expect(selectPaged([1, 2, 3, 4, 5], 1, 2)).toEqual([1, 2])
    expect(selectPaged([1, 2, 3, 4, 5], 2, 2)).toEqual([1, 2, 3, 4])
    expect(selectPaged([1, 2, 3, 4, 5], 0, 2)).toEqual([1, 2])
  })

  it('selectSavedArticles uses savedStatus map (not article.saved field)', () => {
    const articles = [makeArticle({ id: 'a1', saved: false }), makeArticle({ id: 'a2', saved: true })]
    const savedStatus = new Map([
      ['a1', true],
      ['a2', false],
    ])
    expect(selectSavedArticles(articles, savedStatus).map((a) => a.id)).toEqual(['a1'])
  })
})

