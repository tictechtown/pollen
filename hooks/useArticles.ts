import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getArticlesFromDb, setArticleSaved, upsertArticles } from '@/services/articles-db'
import { getFeedsFromDb, upsertFeeds } from '@/services/feeds-db'
import { parseOpml } from '@/services/opml'
import { fetchFeed } from '@/services/rssClient'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'
import { useSeenStore } from '@/store/seen'
import { Article, Feed } from '@/types'

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

export const useArticles = () => {
  const { articles, setArticles, updateSavedLocal } = useArticlesStore()
  const { feeds, setFeeds } = useFeedsStore()
  const { selectedFeedId, showUnseenOnly } = useFiltersStore()
  const { seenIds, markSeen, markManySeen } = useSeenStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const loadDefaultFeedsFromOpml = useCallback(async (): Promise<Feed[]> => {
    try {
      const asset = Asset.fromModule(require('../feed.xml'))
      await asset.downloadAsync()
      const uri = asset.localUri ?? asset.uri
      const opml = await FileSystem.readAsStringAsync(uri)
      const parsedFeeds = parseOpml(opml)
      if (parsedFeeds.length) {
        await upsertFeeds(parsedFeeds)
        setFeeds(parsedFeeds)
      }
      return parsedFeeds
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load default feeds')
      return []
    }
  }, [setFeeds])

  const hydrateFromDb = useCallback(
    async (feedId?: string) => {
      const [dbFeeds, dbArticles] = await Promise.all([getFeedsFromDb(), getArticlesFromDb(feedId)])
      if (dbFeeds.length) {
        setFeeds(dbFeeds)
      }
      setArticles(dbArticles)
    },
    [setArticles, setFeeds],
  )

  const load = useCallback(async () => {
    if (loading) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      let feedsToUse = feeds
      if (!feedsToUse.length) {
        const dbFeeds = await getFeedsFromDb()
        feedsToUse = dbFeeds.length ? dbFeeds : await loadDefaultFeedsFromOpml()
      }

      if (selectedFeedId) {
        const selected = feedsToUse.find((feed) => feed.id === selectedFeedId)
        feedsToUse = selected ? [selected] : []
      }

      if (!feedsToUse.length) {
        setError('No feeds available')
        await hydrateFromDb(selectedFeedId)
        return
      }

      const lastPublishedByFeed = new Map<string, number>()
      feedsToUse.forEach((feed) => {
        const ts = feed.lastPublishedTs ?? toTimestamp(feed.lastPublishedAt)
        if (ts) {
          lastPublishedByFeed.set(feed.id, ts)
        }
      })

      const metadataBudget = { remaining: 200 }
      const results = await Promise.allSettled(
        feedsToUse.map((feed) =>
          fetchFeed(feed.url, {
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

      if (articlesForUpsert.length) {
        await upsertArticles(dedupeById(articlesForUpsert))
      }
      await hydrateFromDb(selectedFeedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [loading, feeds, hydrateFromDb, loadDefaultFeedsFromOpml, selectedFeedId])

  useEffect(() => {
    const boot = async () => {
      await hydrateFromDb(selectedFeedId)
      setInitialized(true)
      if (!articles.length) {
        load()
      }
    }
    if (!initialized) {
      boot()
    }
  }, [initialized, articles.length, hydrateFromDb, load, selectedFeedId])

  useEffect(() => {
    if (initialized) {
      hydrateFromDb(selectedFeedId)
    }
  }, [hydrateFromDb, initialized, selectedFeedId])

  const articlesWithSeen = useMemo(
    () =>
      articles.map((article) => ({
        ...article,
        seen: seenIds.has(article.id),
      })),
    [articles, seenIds],
  )

  const sortedAndFiltered = useMemo(() => {
    const byFeed = selectedFeedId
      ? articlesWithSeen.filter((article) => article.feedId === selectedFeedId)
      : articlesWithSeen
    const filtered = showUnseenOnly ? byFeed.filter((article) => !article.seen) : byFeed
    return filtered
  }, [articlesWithSeen, selectedFeedId, showUnseenOnly])

  const toggleSaved = useCallback(
    async (id: string) => {
      const current = articles.find((article) => article.id === id)
      if (!current) return
      const nextSaved = !current.saved
      await setArticleSaved(id, nextSaved)
      updateSavedLocal(id, nextSaved)
    },
    [articles, updateSavedLocal],
  )

  const toggleSeen = useCallback(
    (id: string) => {
      const isSeen = seenIds.has(id)
      markSeen(id, !isSeen)
    },
    [markSeen, seenIds],
  )

  const setSeen = useCallback(
    (id: string, seen = true) => {
      markSeen(id, seen)
    },
    [markSeen],
  )

  const markAllSeen = useCallback(() => {
    markManySeen(sortedAndFiltered.map((article) => article.id))
  }, [markManySeen, sortedAndFiltered])

  return {
    articles: sortedAndFiltered,
    loading,
    error,
    initialized,
    refresh: () => load(),
    toggleSaved,
    toggleSeen,
    setSeen,
    markAllSeen,
  }
}
