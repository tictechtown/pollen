import { useCallback, useEffect, useMemo, useState } from 'react'

import { setArticleSaved } from '@/services/articles-db'
import { hydrateArticlesAndFeeds, refreshFeedsAndArticles } from '@/services/refresh'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'
import { useSeenStore } from '@/store/seen'

export const useArticles = () => {
  const { articles, setArticles, updateSavedLocal } = useArticlesStore()
  const { setFeeds } = useFeedsStore()
  const { selectedFeedId, showUnseenOnly } = useFiltersStore()
  const { seenIds, markSeen, markManySeen } = useSeenStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const hydrateFromDb = useCallback(
    async (feedId?: string) => {
      const { feeds, articles } = await hydrateArticlesAndFeeds(feedId)
      if (feeds.length) {
        setFeeds(feeds)
      }
      setArticles(articles)
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
      const result = await refreshFeedsAndArticles({
        selectedFeedId,
        includeDefaultFeeds: true,
      })
      if (!result.feedsUsed.length) {
        setError('No feeds available')
      }
      await hydrateFromDb(selectedFeedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [loading, hydrateFromDb, selectedFeedId])

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
