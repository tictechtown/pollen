// Tests for feed refresh helpers.
import { describe, expect, it, vi } from 'vitest'

const { fromModule, readAsStringAsync, getArticlesFromDb, getFeedsFromDb, upsertFeeds, parseOpml } =
  vi.hoisted(() => ({
    fromModule: vi.fn(),
    readAsStringAsync: vi.fn(),
    getArticlesFromDb: vi.fn(),
    getFeedsFromDb: vi.fn(),
    upsertFeeds: vi.fn(),
    parseOpml: vi.fn(),
  }))

vi.mock('expo-asset', () => ({ __esModule: true, Asset: { fromModule } }))
vi.mock('expo-file-system/legacy', () => ({ __esModule: true, readAsStringAsync }))

vi.mock('./articles-db', () => ({ getArticlesFromDb }))
vi.mock('./feeds-db', () => ({ getFeedsFromDb, upsertFeeds }))
vi.mock('./opml', () => ({ parseOpml }))
vi.mock('./rssClient', () => ({ fetchFeed: vi.fn() }))

// eslint-disable-next-line import/first
import { hydrateArticlesAndFeeds, loadDefaultFeedsFromOpml } from './refresh'

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

describe('loadDefaultFeedsFromOpml', () => {
  it('parses and upserts feeds from the bundled OPML', async () => {
    const asset = {
      downloadAsync: vi.fn().mockResolvedValue(undefined),
      localUri: 'file://feeds.opml',
      uri: 'asset://feeds.opml',
    }
    fromModule.mockReturnValue(asset)
    readAsStringAsync.mockResolvedValue('<opml></opml>')
    parseOpml.mockReturnValue([{ id: 'feed-1', url: 'https://example.com', title: 'Feed' }])

    const feeds = await loadDefaultFeedsFromOpml('feed.xml')

    expect(upsertFeeds).toHaveBeenCalledWith([
      { id: 'feed-1', url: 'https://example.com', title: 'Feed' },
    ])
    expect(feeds).toHaveLength(1)
  })
})
