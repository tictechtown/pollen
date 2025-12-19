// Tests for feed database helpers.
import { describe, expect, it, vi } from 'vitest'

vi.mock('./database', () => ({ getDb: vi.fn(), runWrite: vi.fn() }))

// eslint-disable-next-line import/first
import { getDb, runWrite } from './database'
// eslint-disable-next-line import/first
import { getFeedsFromDb, removeFeedFromDb } from './feeds-db'

describe('getFeedsFromDb', () => {
  it('loads feeds from the database', async () => {
    const getAllAsync = vi
      .fn()
      .mockResolvedValue([{ id: 'feed-1', title: 'Feed', url: 'https://example.com/rss' }])
    getDb.mockResolvedValue({ getAllAsync })

    const feeds = await getFeedsFromDb()

    expect(getAllAsync).toHaveBeenCalled()
    expect(feeds).toHaveLength(1)
  })
})

describe('removeFeedFromDb', () => {
  it('removes feed data in a transaction', async () => {
    const runAsync = vi.fn().mockResolvedValue(undefined)
    const withTransactionAsync = vi.fn(async (task: () => Promise<void>) => task())
    const db = { runAsync, withTransactionAsync }

    runWrite.mockImplementation(async (task: (db: typeof db) => Promise<void>) => task(db))

    await removeFeedFromDb('feed-1')

    expect(runAsync).toHaveBeenCalledTimes(3)
  })
})
