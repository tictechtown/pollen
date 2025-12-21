import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Appbar, Button, Card, Snackbar, Text } from 'react-native-paper'

import { setArticleSaved, upsertArticles } from '@/services/articles-db'
import { upsertFeeds } from '@/services/feeds-db'
import { encodeBase64, fetchFeed, fetchPageMetadata, PageMetadata } from '@/services/rssClient'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { Article } from '@/types'

const normalizeUrl = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    return url.toString()
  } catch {
    return null
  }
}

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

const buildSavedArticle = (url: string): Article => {
  const id = encodeBase64(url) ?? url
  const hostname = (() => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  })()
  return {
    id,
    link: url,
    feedId: undefined,
    title: url,
    source: hostname,
    saved: true,
    seen: false,
    publishedAt: new Date().toISOString(),
  }
}

const applyMetadata = (article: Article, metadata: PageMetadata): Article => ({
  ...article,
  title: metadata.title?.trim() || article.title,
  source: metadata.source?.trim() || article.source,
  description: metadata.description ?? article.description,
  thumbnail: metadata.thumbnail ?? article.thumbnail,
  publishedAt: metadata.publishedAt ?? article.publishedAt,
})

const hasMetadata = (metadata: PageMetadata) =>
  Boolean(
    metadata.title ||
      metadata.description ||
      metadata.thumbnail ||
      metadata.publishedAt ||
      metadata.source,
  )

export default function ShareScreen() {
  const router = useRouter()
  const { url: rawUrl } = useLocalSearchParams<{ url?: string }>()
  const sharedUrl = useMemo(() => {
    if (!rawUrl) return ''
    try {
      return decodeURIComponent(rawUrl)
    } catch {
      return String(rawUrl)
    }
  }, [rawUrl])

  const feeds = useFeedsStore((state) => state.feeds)
  const addFeed = useFeedsStore((state) => state.addFeed)
  const articles = useArticlesStore((state) => state.articles)
  const upsertArticleLocal = useArticlesStore((state) => state.upsertArticle)
  const updateSavedLocal = useArticlesStore((state) => state.updateSavedLocal)

  const [submitting, setSubmitting] = useState<'feed' | 'save' | null>(null)
  const [snackbar, setSnackbar] = useState<string | null>(null)

  const normalizedUrl = useMemo(() => normalizeUrl(sharedUrl), [sharedUrl])

  const handleAddFeed = async () => {
    if (!normalizedUrl) {
      setSnackbar('Invalid URL')
      return
    }
    const feedId = encodeBase64(normalizedUrl) ?? normalizedUrl
    const existing = feeds.find((feed) => feed.id === feedId)
    if (existing) {
      setSnackbar('Feed already added')
      return
    }

    setSubmitting('feed')
    try {
      const { feed, articles: fetchedArticles } = await fetchFeed(normalizedUrl)
      await upsertFeeds([feed])
      const deduped = dedupeById(fetchedArticles)
      if (deduped.length) {
        await upsertArticles(deduped)
        deduped.forEach((article) => upsertArticleLocal(article))
      }
      addFeed(feed)
      setSnackbar('Feed added')
      router.push('/(tabs)')
    } catch (err) {
      console.error('Failed to add feed from share', err)
      setSnackbar('Failed to add feed')
    } finally {
      setSubmitting(null)
    }
  }

  const handleSaveForLater = async () => {
    if (!normalizedUrl) {
      setSnackbar('Invalid URL')
      return
    }
    const id = encodeBase64(normalizedUrl) ?? normalizedUrl
    const existing = articles.find((article) => article.id === id)

    setSubmitting('save')
    try {
      if (existing) {
        if (existing.saved) {
          setSnackbar('Already saved')
          setSubmitting(null)
          return
        }
        await setArticleSaved(existing.id, true)
        updateSavedLocal(existing.id, true)
        setSnackbar('Saved for later')
        router.push('/(tabs)/saved')
        return
      }

      const newArticle = buildSavedArticle(normalizedUrl)
      await upsertArticles([newArticle])
      upsertArticleLocal(newArticle)
      const metadata = await fetchPageMetadata(normalizedUrl)
      if (hasMetadata(metadata)) {
        const enriched = applyMetadata(newArticle, metadata)
        await upsertArticles([enriched])
        upsertArticleLocal(enriched)
      }
      setSnackbar('Saved for later')
      router.push('/(tabs)/saved')
    } catch (err) {
      console.error('Failed to save shared article', err)
      setSnackbar('Failed to save article')
    } finally {
      setSubmitting(null)
    }
  }

  const isValid = Boolean(normalizedUrl)

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Share to RSS Reader" />
      </Appbar.Header>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Title title="Shared link" />
          <Card.Content>
            <Text variant="bodyMedium" selectable>
              {sharedUrl || 'No link detected'}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="rss"
            onPress={handleAddFeed}
            disabled={!isValid || submitting !== null}
            loading={submitting === 'feed'}
          >
            Add as feed
          </Button>
          <Button
            mode="contained-tonal"
            icon="bookmark"
            onPress={handleSaveForLater}
            disabled={!isValid || submitting !== null}
            loading={submitting === 'save'}
            style={styles.buttonSpacing}
          >
            Save for later
          </Button>
        </View>
      </View>

      <Snackbar
        visible={Boolean(snackbar)}
        onDismiss={() => setSnackbar(null)}
        duration={3500}
        action={{ label: 'Dismiss', onPress: () => setSnackbar(null) }}
      >
        {snackbar}
      </Snackbar>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  actions: {
    marginTop: 8,
  },
  buttonSpacing: {
    marginTop: 12,
  },
})
