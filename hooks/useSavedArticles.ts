import { useCallback, useEffect, useMemo, useState } from 'react'

import { readerApi } from '@/services/reader-api'
import { useArticlesStore } from '@/store/articles'
import { Article } from '@/types'

const PAGE_SIZE = 100

export const useSavedArticles = () => {
  const { version } = useArticlesStore()
  const [page, setPage] = useState(1)
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    void readerApi.articles
      .listPage({
        savedOnly: true,
        page: 1,
        pageSize: PAGE_SIZE * Math.max(1, page),
      })
      .then((result) => {
        setArticles(result.articles)
        setTotal(result.total)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load saved articles')
        setArticles([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [page, version])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const loadNextPage = useCallback(() => {
    setPage((current) => (current < totalPages ? current + 1 : current))
  }, [totalPages])

  return {
    articles,
    loading,
    error,
    hasMore: articles.length < total,
    loadNextPage,
  }
}

