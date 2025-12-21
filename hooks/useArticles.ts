import { useCallback, useEffect, useMemo, useState } from 'react'

import { setArticleRead, setArticleSaved, setManyArticlesRead } from '@/services/articles-db'
import { useArticlesStore } from '@/store/articles'
import { useFiltersStore } from '@/store/filters'
import { type RefreshReason, useRefreshStore } from '@/store/refresh'

const PAGE_SIZE = 100

type UseArticlesOptions = {
  unseenOnly?: boolean
}

export const useArticles = (options: UseArticlesOptions = {}) => {
  const { articles, updateSavedLocal, updateSeenLocal, initialized } = useArticlesStore()
  const { selectedFeedId } = useFiltersStore()
  const { status, lastError, hydrate, refresh } = useRefreshStore()
  const [page, setPage] = useState(1)

  const hydrateFromDb = useCallback(
    async (feedId?: string) => {
      await hydrate(feedId)
    },
    [hydrate],
  )

  const triggerRefresh = useCallback(
    async (reason: RefreshReason) => {
      setPage(1)
      try {
        await refresh({ reason, selectedFeedId })
      } catch {
        // Refresh errors are tracked in the refresh store.
      }
    },
    [refresh, selectedFeedId],
  )

  useEffect(() => {
    if (initialized && selectedFeedId) {
      hydrateFromDb(selectedFeedId)
    }
  }, [hydrateFromDb, initialized, selectedFeedId])

  const unseenOnly = !!options.unseenOnly

  // Pagination
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

  // Save status
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

  // Seen status
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

  const markAllSeen = useCallback(() => {
    const ids = sortedAndFiltered.map((article) => article.id)
    void setManyArticlesRead(ids, true)
    ids.forEach((id) => updateSeenLocal(id, true))
  }, [sortedAndFiltered, updateSeenLocal])

  return {
    articles: pagedArticles,
    loading: status === 'loading',
    refresh: () => triggerRefresh('manual'),
    loadNextPage,
    hasMore: pagedArticles.length < sortedAndFiltered.length,
    hasUnseen,
    toggleSaved,
    toggleSeen,
    markAllSeen,
    error: lastError,
  }
}
