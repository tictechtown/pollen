// Tests for article database helpers.
import type { SQLiteDatabase } from 'expo-sqlite'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./database', () => ({ getDb: vi.fn(), runWrite: vi.fn() }))

// eslint-disable-next-line import/first
import { getDb } from './database'
// eslint-disable-next-line import/first
import { getArticlesFromDb } from './articles-db'

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

    expect(result[0].seen).toBe(true)
    expect(result[0].saved).toBe(false)
    expect(result[1].seen).toBe(false)
    expect(result[1].saved).toBe(true)
  })
})
