// Tests for article database helpers.
import type { SQLiteDatabase } from 'expo-sqlite'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./database', () => ({ getDb: vi.fn(), runWrite: vi.fn() }))

// eslint-disable-next-line import/first
import { getDb } from './database'
// eslint-disable-next-line import/first
import { getArticlesFromDb, getUnreadCountsByFeedFromDb, searchArticlesPageFromDb } from './articles-db'

describe('getArticlesFromDb', () => {
  it('maps read/starred flags to booleans', async () => {
    const rows = [
      {
        id: '1',
        feedId: 'feed-1',
        title: 'One',
        link: 'https://example.com/1',
        source: 'Example',
        publishedAt: null,
        updatedAt: null,
        description: null,
        content: null,
        thumbnail: null,
        sortTimestamp: 0,
        createdAt: 0,
        read: 1,
        starred: 0,
      },
      {
        id: '2',
        feedId: 'feed-2',
        title: 'Two',
        link: 'https://example.com/2',
        source: 'Example',
        publishedAt: null,
        updatedAt: null,
        description: null,
        content: null,
        thumbnail: null,
        sortTimestamp: 0,
        createdAt: 0,
        read: null,
        starred: 1,
      },
    ]

    const getAllAsync = vi.fn().mockResolvedValue(rows)
    const getDbMock = vi.mocked(getDb)
    getDbMock.mockResolvedValue({ getAllAsync } as unknown as SQLiteDatabase)

    const result = await getArticlesFromDb()

    expect(result[0].read).toBe(true)
    expect(result[0].saved).toBe(false)
    expect(result[1].read).toBe(false)
    expect(result[1].saved).toBe(true)
  })
})

describe('getUnreadCountsByFeedFromDb', () => {
  it('returns unread counts grouped by feedId', async () => {
    const rows = [
      { feedId: 'feed-1', unreadCount: 3 },
      { feedId: 'feed-2', unreadCount: 0 },
    ]

    const getAllAsync = vi.fn().mockResolvedValue(rows)
    const getDbMock = vi.mocked(getDb)
    getDbMock.mockResolvedValue({ getAllAsync } as unknown as SQLiteDatabase)

    const result = await getUnreadCountsByFeedFromDb()

    expect(result.get('feed-1')).toBe(3)
    expect(result.get('feed-2')).toBe(0)
  })
})

describe('searchArticlesPageFromDb', () => {
  it('returns relevance-sorted results from FTS and drops contentText from the mapped Article', async () => {
    const rows = [
      {
        id: '1',
        feedId: 'feed-1',
        title: 'Hello world',
        link: 'https://example.com/1',
        source: 'Example',
        publishedAt: null,
        updatedAt: null,
        description: null,
        content: '<p>Hello</p>',
        contentText: 'Hello',
        thumbnail: null,
        sortTimestamp: 0,
        createdAt: 0,
        read: 1,
        starred: 0,
      },
    ]

    const getFirstAsync = vi.fn().mockResolvedValue({ total: 1 })
    const getAllAsync = vi.fn().mockResolvedValue(rows)
    const getDbMock = vi.mocked(getDb)
    getDbMock.mockResolvedValue({ getFirstAsync, getAllAsync } as unknown as SQLiteDatabase)

    const result = await searchArticlesPageFromDb({
      query: 'hello world',
      feedId: 'feed-1',
      page: 1,
      pageSize: 50,
    })

    expect(result.total).toBe(1)
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0].read).toBe(true)
    expect(result.articles[0].saved).toBe(false)
    expect((result.articles[0] as any).contentText).toBeUndefined()
    expect(getFirstAsync).toHaveBeenCalledWith(expect.stringContaining('articles_fts'), [
      'hello* world*',
      'feed-1',
    ])
  })

  it('falls back to LIKE search if FTS is unavailable', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const rows = [
      {
        id: '1',
        feedId: 'feed-1',
        title: 'Hello world',
        link: 'https://example.com/1',
        source: 'Example',
        publishedAt: null,
        updatedAt: null,
        description: null,
        content: null,
        contentText: 'Hello',
        thumbnail: null,
        sortTimestamp: 0,
        createdAt: 0,
        read: null,
        starred: 1,
      },
    ]

    const getFirstAsync = vi
      .fn()
      .mockRejectedValueOnce(new Error('no such table: articles_fts'))
      .mockResolvedValueOnce({ total: 1 })
    const getAllAsync = vi.fn().mockResolvedValue(rows)
    const getDbMock = vi.mocked(getDb)
    getDbMock.mockResolvedValue({ getFirstAsync, getAllAsync } as unknown as SQLiteDatabase)

    try {
      const result = await searchArticlesPageFromDb({
        query: 'hello',
        page: 1,
        pageSize: 50,
      })

      expect(result.total).toBe(1)
      expect(result.articles[0].saved).toBe(true)
      expect((result.articles[0] as any).contentText).toBeUndefined()
      expect(getAllAsync).toHaveBeenCalledWith(expect.stringContaining('LIKE'), [
        '%hello%',
        '%hello%',
        50,
        0,
      ])
    } finally {
      warnSpy.mockRestore()
    }
  })
})
