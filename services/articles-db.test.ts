// Tests for article database helpers.
import type { SQLiteDatabase } from 'expo-sqlite'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./database', () => ({ getDb: vi.fn(), runWrite: vi.fn() }))

// eslint-disable-next-line import/first
import { getDb } from './database'
// eslint-disable-next-line import/first
import { getArticlesFromDb, getUnreadCountsByFeedFromDb } from './articles-db'

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
