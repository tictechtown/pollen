import { useEffect, useMemo, useState } from 'react'

import { readerApi } from '@/services/reader-api'
import { useArticlesStore } from '@/store/articles'
import { Article } from '@/types'

export const useArticle = (id?: string | null) => {
  const { localReadArticles, localSavedArticles, version } = useArticlesStore()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setArticle(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    void readerApi.articles
      .get(id)
      .then((result) => setArticle(result))
      .catch((err) => {
        setArticle(null)
        setError(err instanceof Error ? err.message : 'Failed to load article')
      })
      .finally(() => setLoading(false))
  }, [id, version])

  const resolved = useMemo(() => {
    if (!article) return null
    const readOverride = localReadArticles.get(article.id)
    const savedOverride = localSavedArticles.get(article.id)
    return {
      ...article,
      read: readOverride ?? article.read,
      saved: savedOverride ?? article.saved,
    }
  }, [article, localReadArticles, localSavedArticles])

  return { article: resolved, loading, error }
}

