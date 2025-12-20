import { useCallback, useEffect, useMemo, useState } from 'react'

import { setArticleRead, setArticleSaved, setManyArticlesRead } from '@/services/articles-db'
import { hydrateArticlesAndFeeds, refreshFeedsAndArticles } from '@/services/refresh'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'

const PAGE_SIZE = 100

type UseArticlesOptions = {
  unseenOnly?: boolean
}

export const useArticles = (options: UseArticlesOptions = {}) => {
  const { articles, setArticles, updateSavedLocal, updateSeenLocal } = useArticlesStore()
  const { setFeeds } = useFeedsStore()
  const { selectedFeedId } = useFiltersStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [page, setPage] = useState(1)

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
    setPage(1)
    try {
      const result = await refreshFeedsAndArticles({
        selectedFeedId,
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

  const unseenOnly = !!options.unseenOnly

  const sortedAndFiltered = useMemo(() => {
    const byFeed = selectedFeedId
      ? articles.filter((article) => article.feedId === selectedFeedId)
      : articles
    const filtered = unseenOnly ? byFeed.filter((article) => !article.seen) : byFeed
    return filtered
  }, [articles, selectedFeedId, unseenOnly])

  useEffect(() => {
    setPage(1)
  }, [selectedFeedId, unseenOnly])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedAndFiltered.length / PAGE_SIZE)),
    [sortedAndFiltered.length],
  )

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const pagedArticles = useMemo(
    () => sortedAndFiltered.slice(0, page * PAGE_SIZE),
    [page, sortedAndFiltered],
  )

  const hasUnseen = useMemo(
    () => sortedAndFiltered.some((article) => !article.seen),
    [sortedAndFiltered],
  )

  const loadNextPage = useCallback(() => {
    setPage((current) => (current < totalPages ? current + 1 : current))
  }, [totalPages])

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
    async (id: string) => {
      const current = articles.find((article) => article.id === id)
      if (!current) return
      const nextSeen = !current.seen
      await setArticleRead(id, nextSeen)
      updateSeenLocal(id, nextSeen)
    },
    [articles, updateSeenLocal],
  )

  const setSeen = useCallback(
    async (id: string, seen = true) => {
      await setArticleRead(id, seen)
      updateSeenLocal(id, seen)
    },
    [updateSeenLocal],
  )

  const markAllSeen = useCallback(() => {
    const ids = sortedAndFiltered.map((article) => article.id)
    void setManyArticlesRead(ids, true)
    ids.forEach((id) => updateSeenLocal(id, true))
  }, [sortedAndFiltered, updateSeenLocal])

  return {
    articles: pagedArticles,
    loading,
    error,
    initialized,
    refresh: () => load(),
    loadNextPage,
    hasMore: pagedArticles.length < sortedAndFiltered.length,
    hasUnseen,
    toggleSaved,
    toggleSeen,
    setSeen,
    markAllSeen,
  }
}
