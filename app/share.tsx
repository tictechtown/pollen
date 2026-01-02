import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Appbar, Button, Card, Snackbar, Text } from 'react-native-paper'

import { upsertArticles } from '@/services/articles-db'
import { upsertFeeds } from '@/services/feeds-db'
import { fetchFeed } from '@/services/rssClient'
import { saveArticleForLater } from '@/services/save-for-later'
import { normalizeUrl } from '@/services/urls'
import { generateUUID } from '@/services/uuid-generator'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

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
    const feedId = generateUUID()
    const existing = feeds.find((feed) => feed.xmlUrl === normalizedUrl)
    if (existing) {
      setSnackbar('Feed already added')
      return
    }

    setSubmitting('feed')
    try {
      const { feed, articles: fetchedArticles } = await fetchFeed(feedId, normalizedUrl)
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

    setSubmitting('save')
    try {
      const result = await saveArticleForLater({
        url: normalizedUrl,
        articles,
        updateSavedLocal,
        upsertArticleLocal,
      })
      if (result.status === 'already-saved') {
        setSnackbar('Already saved')
        return
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
