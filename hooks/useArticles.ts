import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { parseOpml } from '@/services/opml'
import { fetchFeed } from '@/services/rssClient'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { Article, Feed } from '@/types'

const dedupeById = (articles: Article[]): Article[] => {
  const seen = new Set<string>()
  return articles.filter((article) => {
    if (seen.has(article.id)) return false
    seen.add(article.id)
    return true
  })
}

export const useArticles = () => {
  const { articles, setArticles, toggleSaved, toggleSeen, setSeen, markAllSeen, lastFetched } =
    useArticlesStore()
  const { feeds, setFeeds } = useFeedsStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDefaultFeedsFromOpml = useCallback(async (): Promise<Feed[]> => {
    try {
      const asset = Asset.fromModule(require('../feed.xml'))
      await asset.downloadAsync()
      const uri = asset.localUri ?? asset.uri
      const opml = await FileSystem.readAsStringAsync(uri)
      const parsedFeeds = parseOpml(opml)
      if (parsedFeeds.length) {
        setFeeds(parsedFeeds)
      }
      return parsedFeeds
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load default feeds')
      return []
    }
  }, [setFeeds])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let feedsToUse = feeds
      if (!feedsToUse.length) {
        feedsToUse = await loadDefaultFeedsFromOpml()
      }

      if (!feedsToUse.length) {
        setError('No feeds available')
        return
      }

      const results = await Promise.allSettled(feedsToUse.map((feed) => fetchFeed(feed.url)))
      const articlesFromFeeds = results
        .flatMap((result) => (result.status === 'fulfilled' ? result.value.articles : []))
        .filter(Boolean)

      if (!articlesFromFeeds.length) {
        setError('Failed to load feeds')
      } else {
        setArticles(dedupeById(articlesFromFeeds))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [feeds, loadDefaultFeedsFromOpml, setArticles])

  useEffect(() => {
    if (!lastFetched) {
      load()
    }
  }, [lastFetched, load])

  const sorted = useMemo(
    () =>
      [...articles].sort((a, b) => {
        const dateA = new Date(a.updatedAt ?? a.publishedAt ?? 0).getTime()
        const dateB = new Date(b.updatedAt ?? b.publishedAt ?? 0).getTime()
        return dateB - dateA
      }),
    [articles],
  )

  return {
    articles: sorted,
    loading,
    error,
    refresh: () => load(),
    toggleSaved,
    toggleSeen,
    setSeen,
    markAllSeen,
  }
}
