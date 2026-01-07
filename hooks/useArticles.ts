import { useCallback, useEffect, useMemo, useState } from 'react'

import { readerApi } from '@/services/reader-api'
import { useArticlesStore } from '@/store/articles'
import { useFiltersStore } from '@/store/filters'
import { type RefreshReason, useRefreshStore } from '@/store/refresh'
import { Article } from '@/types'
import { useShallow } from 'zustand/react/shallow'

const PAGE_SIZE = 100

type UseArticlesOptions = {
  unreadOnly?: boolean
}

export const useArticles = (options: UseArticlesOptions = {}) => {
  const { version, invalidate, updateSavedLocal, updateReadLocal, initialized } = useArticlesStore(
    useShallow((state) => ({
      version: state.version,
      invalidate: state.invalidate,
      updateSavedLocal: state.updateSavedLocal,
      updateReadLocal: state.updateReadLocal,
      initialized: state.initialized,
    })),
  )
  const selectedFeedId = useFiltersStore((state) => state.selectedFeedId)
  const status = useRefreshStore((state) => state.status)
  const hydrationStatus = useRefreshStore((state) => state.hydrationStatus)
  const lastError = useRefreshStore((state) => state.lastError)
  const refresh = useRefreshStore((state) => state.refresh)
  const [page, setPage] = useState(1)
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

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
    if (!initialized) return
    if (hydrationStatus === 'loading') return
    setLocalLoading(true)
    setLocalError(null)
    void readerApi.articles
      .listPage({
        feedId: selectedFeedId,
        unreadOnly: !!options.unreadOnly,
        page: 1,
        pageSize: PAGE_SIZE * Math.max(1, page),
      })
      .then((result) => {
        setArticles(result.articles)
        setTotal(result.total)
      })
      .catch((error) => {
        setLocalError(error instanceof Error ? error.message : 'Failed to load articles')
        setArticles([])
        setTotal(0)
      })
      .finally(() => setLocalLoading(false))
  }, [hydrationStatus, initialized, options.unreadOnly, page, selectedFeedId, version])

  const unreadOnly = !!options.unreadOnly

  useEffect(() => {
    setPage(1)
  }, [selectedFeedId, unreadOnly])

  useEffect(() => {
    if (!initialized) return
    void readerApi.articles
      .getUnreadCount(selectedFeedId)
      .then((count) => setUnreadCount(count))
      .catch(() => setUnreadCount(0))
  }, [initialized, selectedFeedId, version])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const hasUnread = useMemo(
    () => (unreadOnly ? total > 0 : unreadCount > 0),
    [total, unreadCount, unreadOnly],
  )

  const loadNextPage = useCallback(() => {
    setPage((current) => (current < totalPages ? current + 1 : current))
  }, [totalPages])

  // Save status
  const toggleSaved = useCallback(
    async (id: string) => {
      const { localSavedArticles } = useArticlesStore.getState()
      const nextSaved = !(localSavedArticles.get(id) ?? false)
      try {
        await readerApi.articles.setSaved(id, nextSaved)
        updateSavedLocal(id, nextSaved)
        invalidate()
      } catch {
        // ignore and keep local state unchanged
      }
    },
    [invalidate, updateSavedLocal],
  )

  // Read status
  const toggleRead = useCallback(
    async (id: string) => {
      const { localReadArticles } = useArticlesStore.getState()
      const nextRead = !(localReadArticles.get(id) ?? false)
      try {
        await readerApi.articles.setRead(id, nextRead)
        updateReadLocal(id, nextRead)
        invalidate()
      } catch {
        // ignore and keep local state unchanged
      }
    },
    [invalidate, updateReadLocal],
  )

  const markAllRead = useCallback(() => {
    const ids = articles.map((article) => article.id)
    ids.forEach((id) => updateReadLocal(id, true))
    void readerApi.articles.setAllRead(selectedFeedId).then(() => invalidate())
  }, [articles, invalidate, selectedFeedId, updateReadLocal])

  return {
    articles,
    loading: status === 'loading' || hydrationStatus === 'loading' || localLoading,
    refresh: () => triggerRefresh('manual'),
    loadNextPage,
    hasMore: articles.length < total,
    hasUnread,
    toggleSaved,
    toggleRead,
    markAllRead,
    error: lastError ?? localError,
  }
}
