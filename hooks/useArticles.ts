import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  setArticleRead,
  setArticleSaved,
  setManyArticlesRead,
} from '@/services/articles-db'
import {
  getTotalPages,
  selectFeedArticles,
  selectPaged,
  selectUnreadArticles,
} from '@/services/articles-selectors'
import { useArticlesStore } from '@/store/articles'
import { useFiltersStore } from '@/store/filters'
import { type RefreshReason, useRefreshStore } from '@/store/refresh'

const PAGE_SIZE = 100

type UseArticlesOptions = {
  unreadOnly?: boolean
}

export const useArticles = (options: UseArticlesOptions = {}) => {
  const {
    articles,
    localSavedArticles,
    localReadArticles,
    updateSavedLocal,
    updateReadLocal,
    initialized,
  } = useArticlesStore()
  const { selectedFeedId } = useFiltersStore()
  const { status, lastError, hydrate, refresh } = useRefreshStore()
  const [page, setPage] = useState(1)

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
    if (initialized) {
      void hydrate(selectedFeedId)
    }
  }, [hydrate, initialized, selectedFeedId])

  const unreadOnly = !!options.unreadOnly

  // Pagination
  const sortedAndFiltered = useMemo(
    () => selectUnreadArticles(selectFeedArticles(articles, selectedFeedId), unreadOnly),
    [articles, selectedFeedId, unreadOnly],
  )

  useEffect(() => {
    setPage(1)
  }, [selectedFeedId, unreadOnly])

  const totalPages = useMemo(() => getTotalPages(sortedAndFiltered.length, PAGE_SIZE), [
    sortedAndFiltered.length,
  ])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const pagedArticles = useMemo(
    () => selectPaged(sortedAndFiltered, page, PAGE_SIZE),
    [page, sortedAndFiltered],
  )

  const hasUnread = useMemo(
    () => sortedAndFiltered.some((article) => !article.read),
    [sortedAndFiltered],
  )

  const loadNextPage = useCallback(() => {
    setPage((current) => (current < totalPages ? current + 1 : current))
  }, [totalPages])

  // Save status
  const toggleSaved = useCallback(
    async (id: string) => {
      const nextSaved = !(localSavedArticles.get(id) ?? false)
      try {
        await setArticleSaved(id, nextSaved)
        updateSavedLocal(id, nextSaved)
      } catch {
        // ignore and keep local state unchanged
      }
    },
    [localSavedArticles, updateSavedLocal],
  )

  // Read status
  const toggleRead = useCallback(
    async (id: string) => {
      const nextRead = !(localReadArticles.get(id) ?? false)
      try {
        await setArticleRead(id, nextRead)
        updateReadLocal(id, nextRead)
      } catch {
        // ignore and keep local state unchanged
      }
    },
    [localReadArticles, updateReadLocal],
  )

  const markAllRead = useCallback(() => {
    const ids = sortedAndFiltered.map((article) => article.id)
    void setManyArticlesRead(ids, true)
    ids.forEach((id) => updateReadLocal(id, true))
  }, [sortedAndFiltered, updateReadLocal])

  return {
    articles: pagedArticles,
    loading: status === 'loading',
    refresh: () => triggerRefresh('manual'),
    loadNextPage,
    hasMore: pagedArticles.length < sortedAndFiltered.length,
    hasUnread,
    toggleSaved,
    toggleRead,
    markAllRead,
    error: lastError,
  }
}
