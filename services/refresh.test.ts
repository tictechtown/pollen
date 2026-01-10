// Tests for feed refresh helpers.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fromModule,
  readAsStringAsync,
  getFeedsFromDb,
  getFoldersFromDb,
  createFolderInDb,
  upsertFeeds,
  upsertArticles,
  fetchFeed,
} = vi.hoisted(() => ({
  fromModule: vi.fn(),
  readAsStringAsync: vi.fn(),
  getFeedsFromDb: vi.fn(),
  getFoldersFromDb: vi.fn(),
  createFolderInDb: vi.fn(),
  upsertFeeds: vi.fn(),
  upsertArticles: vi.fn(),
  fetchFeed: vi.fn(),
}))

vi.mock('expo-asset', () => ({ __esModule: true, Asset: { fromModule } }))
vi.mock('expo-file-system/legacy', () => ({ __esModule: true, readAsStringAsync }))

vi.mock('./articles-db', () => ({ upsertArticles }))
vi.mock('./feeds-db', () => ({ getFeedsFromDb, upsertFeeds }))
vi.mock('./folders-db', () => ({ getFoldersFromDb, createFolderInDb }))
vi.mock('./rssClient', () => ({ fetchFeed }))

// eslint-disable-next-line import/first
import { hydrateArticlesAndFeeds, importFeedsFromOpmlXml, refreshFeedsAndArticles } from './refresh'

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

describe('importFeedsFromOpmlXml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('imports feeds from OPML and upserts articles', async () => {
    const url = 'https://example.com/rss.xml'
    const opml = `<?xml version="1.0"?>
      <opml version="2.0">
        <body>
          <outline type="rss" xmlUrl="${url}" title="Example Feed" />
        </body>
      </opml>`

    getFeedsFromDb.mockResolvedValue([])
    getFoldersFromDb.mockResolvedValue([])
    fetchFeed.mockResolvedValueOnce({
      feed: { id: 'feed-1', title: 'Example Feed', xmlUrl: url },
      articles: [
        {
          id: 'article-1',
          title: 'Example',
          link: 'https://example.com/article',
          source: 'Example Feed',
          read: false,
          saved: false,
        },
      ],
    })

    const result = await importFeedsFromOpmlXml(opml)

    expect(fetchFeed).toHaveBeenCalledTimes(1)
    expect(upsertFeeds).toHaveBeenCalledTimes(1)
    expect(upsertArticles).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
  })

  it('creates folders from OPML outlines and assigns feeds', async () => {
    const opml = `<?xml version="1.0"?>
      <opml version="2.0">
        <body>
          <outline text="Gaming" title="Gaming">
            <outline type="rss" xmlUrl="https://example.com/rss.xml" title="Example Feed" />
          </outline>
        </body>
      </opml>`

    getFeedsFromDb.mockResolvedValue([])
    getFoldersFromDb.mockResolvedValue([])
    createFolderInDb.mockResolvedValue({
      id: 'folder-1',
      title: 'Gaming',
      createdAt: 1,
    })
    fetchFeed.mockResolvedValueOnce({
      feed: { id: 'feed-1', title: 'Example Feed', xmlUrl: 'https://example.com/rss.xml' },
      articles: [],
    })

    const result = await importFeedsFromOpmlXml(opml)

    expect(createFolderInDb).toHaveBeenCalledWith('Gaming')
    expect(result[0].folderId).toBe('folder-1')
  })

  it('throws when the XML is not OPML', async () => {
    await expect(importFeedsFromOpmlXml('<rss></rss>')).rejects.toThrow('Invalid OPML file')
  })
})
