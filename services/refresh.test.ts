// Tests for feed refresh helpers.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fromModule,
  readAsStringAsync,
  getArticlesFromDb,
  getFeedsFromDb,
  upsertFeeds,
  parseOpml,
  fetchFeed,
} = vi.hoisted(() => ({
  fromModule: vi.fn(),
  readAsStringAsync: vi.fn(),
  getArticlesFromDb: vi.fn(),
  getFeedsFromDb: vi.fn(),
  upsertFeeds: vi.fn(),
  parseOpml: vi.fn(),
  fetchFeed: vi.fn(),
}))

vi.mock('expo-asset', () => ({ __esModule: true, Asset: { fromModule } }))
vi.mock('expo-file-system/legacy', () => ({ __esModule: true, readAsStringAsync }))

vi.mock('./articles-db', () => ({ getArticlesFromDb }))
vi.mock('./feeds-db', () => ({ getFeedsFromDb, upsertFeeds }))
vi.mock('./opml', () => ({ parseOpml }))
vi.mock('./rssClient', () => ({ fetchFeed }))

// eslint-disable-next-line import/first
import { hydrateArticlesAndFeeds, refreshFeedsAndArticles } from './refresh'

describe('hydrateArticlesAndFeeds', () => {
  it('returns feeds and articles from the database', async () => {
    getFeedsFromDb.mockResolvedValue([{ id: 'feed-1', title: 'Feed', url: 'https://example.com' }])
    getArticlesFromDb.mockResolvedValue([
      { id: 'article-1', title: 'Article', link: 'https://example.com' },
    ])

    const result = await hydrateArticlesAndFeeds()

    expect(result.feeds).toHaveLength(1)
    expect(result.articles).toHaveLength(1)
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

  it('prevents duplicate OPML imports when called concurrently on first run', async () => {
    getFeedsFromDb.mockResolvedValue([])

    const asset = {
      downloadAsync: vi.fn().mockResolvedValue(undefined),
      localUri: 'file://feeds.opml',
      uri: 'asset://feeds.opml',
    }
    fromModule.mockReturnValue(asset)
    readAsStringAsync.mockResolvedValue('<opml></opml>')
    parseOpml.mockReturnValue([{ id: 'feed-1', url: 'https://example.com/feed', title: 'Feed' }])

    fetchFeed.mockResolvedValue({
      feed: { id: 'feed-1', title: 'Feed', url: 'https://example.com/feed' },
      articles: [],
    })

    const p1 = refreshFeedsAndArticles({
      defaultFeedsModule: 'feed.xml',
    })
    const p2 = refreshFeedsAndArticles({
      defaultFeedsModule: 'feed.xml',
    })

    expect(p1).toBe(p2)
    await p1

    expect(fromModule).toHaveBeenCalledTimes(1)
    expect(readAsStringAsync).toHaveBeenCalledTimes(1)
    expect(parseOpml).toHaveBeenCalledTimes(1)
  })
})
