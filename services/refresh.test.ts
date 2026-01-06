// Tests for feed refresh helpers.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromModule, readAsStringAsync, getFeedsFromDb, upsertFeeds, upsertArticles, fetchFeed } =
  vi.hoisted(() => ({
    fromModule: vi.fn(),
    readAsStringAsync: vi.fn(),
    getFeedsFromDb: vi.fn(),
    upsertFeeds: vi.fn(),
    upsertArticles: vi.fn(),
    fetchFeed: vi.fn(),
  }))

vi.mock('expo-asset', () => ({ __esModule: true, Asset: { fromModule } }))
vi.mock('expo-file-system/legacy', () => ({ __esModule: true, readAsStringAsync }))

vi.mock('./articles-db', () => ({ upsertArticles }))
vi.mock('./feeds-db', () => ({ getFeedsFromDb, upsertFeeds }))
vi.mock('./rssClient', () => ({ fetchFeed }))

// eslint-disable-next-line import/first
import { hydrateArticlesAndFeeds, refreshFeedsAndArticles } from './refresh'

describe('hydrateArticlesAndFeeds', () => {
  it('returns feeds from the database', async () => {
    getFeedsFromDb.mockResolvedValue([{ id: 'feed-1', title: 'Feed', url: 'https://example.com' }])

    const result = await hydrateArticlesAndFeeds()

    expect(result.feeds).toHaveLength(1)
    expect(result.articles).toHaveLength(0)
  })
})

describe('refreshFeedsAndArticles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the in-flight Promise when called concurrently', async () => {
    getFeedsFromDb.mockResolvedValue([
      { id: 'feed-1', title: 'Feed', url: 'https://example.com/feed' },
    ])

    let resolveFetch!: (value: any) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })
    fetchFeed.mockReturnValueOnce(fetchPromise)

    const p1 = refreshFeedsAndArticles({})
    const p2 = refreshFeedsAndArticles({})

    expect(p1).toBe(p2)
    expect(getFeedsFromDb).toHaveBeenCalledTimes(1)

    await Promise.resolve()
    expect(fetchFeed).toHaveBeenCalledTimes(1)

    resolveFetch({
      feed: { id: 'feed-1', title: 'Feed', url: 'https://example.com/feed' },
      articles: [],
    })

    await p1
  })
})
