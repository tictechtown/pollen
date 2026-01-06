// Feed refresh workflow and hydration utilities.
import * as FileSystem from 'expo-file-system/legacy'

import { Article, Feed } from '@/types'
import { upsertArticles } from './articles-db'
import { getFeedsFromDb, upsertFeeds } from './feeds-db'
import { isOpmlXml, parseOpml } from './opml'
import { fetchFeed } from './rssClient'

type RefreshOptions = {
  selectedFeedId?: string
  metadataBudget?: { remaining: number }
  defaultFeedsModule?: unknown
  reason?: 'manual' | 'foreground' | 'background'
}

export type RefreshResult = {
  feedsUsed: Feed[]
  newArticlesCount: number
}

const CONCURRENT_FEED_FETCHES = 10

const dedupeById = (articles: Article[]): Article[] => {
  const seen = new Set<string>()
  return articles.filter((article) => {
    if (seen.has(article.id)) return false
    seen.add(article.id)
    return true
  })
}

const toTimestamp = (value?: string | null): number => {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : 0
}

const articleTimestamp = (article: Article): number =>
  toTimestamp(article.updatedAt) || toTimestamp(article.publishedAt)

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> => {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let nextIndex = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1
      if (currentIndex >= items.length) return
      try {
        const value = await mapper(items[currentIndex], currentIndex)
        results[currentIndex] = { status: 'fulfilled', value }
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason }
      }
    }
  })

  await Promise.all(workers)
  return results
}

export const importFeedsFromOpmlUri = async (uri: string): Promise<Feed[]> => {
  const opmlXml = await FileSystem.readAsStringAsync(uri)
  if (!isOpmlXml(opmlXml)) {
    throw new Error('Invalid OPML file')
  }
  const parsedFeeds = parseOpml(opmlXml)
  const existingFeeds = await getFeedsFromDb()

  // we are removing duplicated feeds (already existing feeds in our app)
  const urls = new Set(existingFeeds.map((f) => f.xmlUrl))
  const dedupFeeds = parsedFeeds.filter((f) => {
    if (urls.has(f.xmlUrl)) {
      return false
    }
    urls.add(f.xmlUrl)
    return true
  })

  const results = await mapWithConcurrency(dedupFeeds, CONCURRENT_FEED_FETCHES, (feed) =>
    fetchFeed(feed.id, feed.xmlUrl, {
      cutoffTs: 0,
      metadataBudget: { remaining: 200 },
    }),
  )

  const feedsForUpsert: Feed[] = []
  const articlesForUpsert: Article[] = []

  results.forEach((result) => {
    if (result.status !== 'fulfilled') return
    const { feed, articles: fetchedArticles } = result.value

    const maxTsFromFresh = fetchedArticles.reduce(
      (max, article) => Math.max(max, articleTimestamp(article)),
      0,
    )

    feedsForUpsert.push({
      ...feed,
      lastPublishedTs: maxTsFromFresh || undefined,
    })

    if (fetchedArticles.length) {
      articlesForUpsert.push(...fetchedArticles)
    }
  })

  if (feedsForUpsert.length) {
    await upsertFeeds(feedsForUpsert)
  }

  const deduped = dedupeById(articlesForUpsert)
  if (deduped.length) {
    await upsertArticles(deduped)
  }

  return feedsForUpsert
}

let refreshInFlight: Promise<RefreshResult> | null = null

const doRefreshFeedsAndArticles = async (options: RefreshOptions): Promise<RefreshResult> => {
  const { selectedFeedId, metadataBudget = { remaining: 200 }, reason = 'foreground' } = options

  let feedsToUse = await getFeedsFromDb()

  if (selectedFeedId) {
    const selected = feedsToUse.find((feed) => feed.id === selectedFeedId)
    feedsToUse = selected ? [selected] : []
  }

  if (!feedsToUse.length) {
    return { feedsUsed: [], newArticlesCount: 0 }
  }

  const now = Date.now()
  const eligibleFeeds =
    reason === 'manual'
      ? feedsToUse
      : feedsToUse.filter((feed) => !feed.expiresTS || feed.expiresTS <= now)

  if (!eligibleFeeds.length) {
    return { feedsUsed: feedsToUse, newArticlesCount: 0 }
  }

  const lastPublishedByFeed = new Map<string, number>()
  eligibleFeeds.forEach((feed) => {
    const ts = feed.lastPublishedTs ?? 0
    if (ts) {
      lastPublishedByFeed.set(feed.id, ts)
    }
  })

  const results = await mapWithConcurrency(eligibleFeeds, CONCURRENT_FEED_FETCHES, (feed) =>
    fetchFeed(feed.id, feed.xmlUrl, {
      cutoffTs: lastPublishedByFeed.get(feed.id) ?? 0,
      metadataBudget,
      cache: {
        ETag: feed.ETag,
        lastModified: feed.lastModified,
      },
      existingFeed: feed,
    }),
  )

  const feedsForUpsert: Feed[] = []
  const articlesForUpsert: Article[] = []

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      console.log('failed', { result, feed: eligibleFeeds[index] })
      return
    }
    const { feed, articles: fetchedArticles } = result.value
    const maxTsFromFresh = fetchedArticles.reduce(
      (max, article) => Math.max(max, articleTimestamp(article)),
      0,
    )
    const existingTs = eligibleFeeds[index].lastPublishedTs ?? 0
    const mergedLastPublishedTs = Math.max(existingTs, maxTsFromFresh)

    feedsForUpsert.push({
      ...feed,
      lastPublishedTs: mergedLastPublishedTs || undefined,
    })

    if (fetchedArticles.length) {
      articlesForUpsert.push(...fetchedArticles)
    }
  })

  if (feedsForUpsert.length) {
    await upsertFeeds(feedsForUpsert)
  }

  const deduped = dedupeById(articlesForUpsert)
  if (deduped.length) {
    await upsertArticles(deduped)
  }

  return {
    feedsUsed: eligibleFeeds,
    newArticlesCount: deduped.length,
  }
}

export const refreshFeedsAndArticles = (options: RefreshOptions): Promise<RefreshResult> => {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = doRefreshFeedsAndArticles(options).finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

export const hydrateArticlesAndFeeds = async (feedId?: string) => {
  const dbFeeds = await getFeedsFromDb()
  // Articles are loaded on-demand with pagination directly from SQLite.
  return { feeds: dbFeeds, articles: [] }
}
