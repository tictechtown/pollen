// Feed refresh workflow and hydration utilities.
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'

import { Article, Feed } from '@/types'
import { getArticlesFromDb, upsertArticles } from './articles-db'
import { getFeedsFromDb, upsertFeeds } from './feeds-db'
import { parseOpml } from './opml'
import { fetchFeed } from './rssClient'

type RefreshOptions = {
  selectedFeedId?: string
  includeDefaultFeeds?: boolean
  metadataBudget?: { remaining: number }
  defaultFeedsModule?: unknown
}

export type RefreshResult = {
  feedsUsed: Feed[]
  newArticlesCount: number
}

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

export const loadDefaultFeedsFromOpml = async (feedModule?: unknown): Promise<Feed[]> => {
  try {
    const moduleToUse = feedModule ?? require('../feed.xml')
    const asset = Asset.fromModule(moduleToUse)
    await asset.downloadAsync()
    const uri = asset.localUri ?? asset.uri
    const opml = await FileSystem.readAsStringAsync(uri)
    const parsedFeeds = parseOpml(opml)
    return parsedFeeds
  } catch {
    return []
  }
}

let refreshInFlight: Promise<RefreshResult> | null = null

const doRefreshFeedsAndArticles = async (options: RefreshOptions): Promise<RefreshResult> => {
  const {
    selectedFeedId,
    includeDefaultFeeds = false,
    metadataBudget = { remaining: 200 },
    defaultFeedsModule,
  } = options

  let feedsToUse = await getFeedsFromDb()

  if (!feedsToUse.length && includeDefaultFeeds) {
    feedsToUse = await loadDefaultFeedsFromOpml(defaultFeedsModule)
  }

  if (selectedFeedId) {
    const selected = feedsToUse.find((feed) => feed.id === selectedFeedId)
    feedsToUse = selected ? [selected] : []
  }

  if (!feedsToUse.length) {
    return { feedsUsed: [], newArticlesCount: 0 }
  }

  const lastPublishedByFeed = new Map<string, number>()
  feedsToUse.forEach((feed) => {
    const ts = feed.lastPublishedTs ?? toTimestamp(feed.lastPublishedAt)
    if (ts) {
      lastPublishedByFeed.set(feed.id, ts)
    }
  })

  const results = await Promise.allSettled(
    feedsToUse.map((feed) =>
      fetchFeed(feed.xmlUrl, {
        cutoffTs: lastPublishedByFeed.get(feed.id) ?? 0,
        metadataBudget,
      }),
    ),
  )

  const feedsForUpsert: Feed[] = []
  const articlesForUpsert: Article[] = []

  results.forEach((result) => {
    if (result.status !== 'fulfilled') return
    const { feed, articles: fetchedArticles } = result.value
    const cutoff = lastPublishedByFeed.get(feed.id) ?? 0
    const fresh = fetchedArticles.filter((article) => {
      const ts = articleTimestamp(article)
      return ts > cutoff
    })

    const maxTsFromFresh = fresh.reduce(
      (max, article) => Math.max(max, articleTimestamp(article)),
      cutoff,
    )

    feedsForUpsert.push({
      ...feed,
      lastPublishedTs: maxTsFromFresh || cutoff || undefined,
      lastPublishedAt: maxTsFromFresh
        ? new Date(maxTsFromFresh).toISOString()
        : feed.lastPublishedAt ?? (cutoff ? new Date(cutoff).toISOString() : undefined),
    })

    if (fresh.length) {
      articlesForUpsert.push(...fresh)
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
    feedsUsed: feedsToUse,
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
  const [dbFeeds, dbArticles] = await Promise.all([getFeedsFromDb(), getArticlesFromDb(feedId)])
  return { feeds: dbFeeds, articles: dbArticles }
}
