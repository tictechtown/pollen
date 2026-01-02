import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import he from 'he'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Appbar,
  Button,
  Card,
  Dialog,
  Icon,
  List,
  Portal,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper'

import { upsertArticles } from '@/services/articles-db'
import { discoverFeedCandidates, FeedCandidate } from '@/services/feedDiscovery'
import { upsertFeeds } from '@/services/feeds-db'
import { fetchFeed } from '@/services/rssClient'
import { saveArticleForLater } from '@/services/save-for-later'
import { normalizeUrl } from '@/services/urls'
import { generateUUID } from '@/services/uuid-generator'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'
import { Feed } from '@/types'

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
  const { setFeedFilter } = useFiltersStore()

  const [submitting, setSubmitting] = useState<'subscribe' | 'save' | null>(null)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [discoveryStatus, setDiscoveryStatus] = useState<
    'idle' | 'loading' | 'ready' | 'none' | 'error'
  >('idle')
  const [candidates, setCandidates] = useState<FeedCandidate[]>([])
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [manualVisible, setManualVisible] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [duplicateFeed, setDuplicateFeed] = useState<Feed | null>(null)

  const normalizedUrl = useMemo(() => normalizeUrl(sharedUrl), [sharedUrl])

  const startDiscovery = async (url: string) => {
    setDiscoveryStatus('loading')
    setDiscoveryError(null)
    setCandidates([])
    try {
      const discovered = await discoverFeedCandidates(url)
      if (discovered.length) {
        setCandidates(discovered)
        setDiscoveryStatus('ready')
        return
      }
      setDiscoveryStatus('none')
    } catch (err) {
      console.error('Failed to discover feeds from share', err)
      setDiscoveryError(err instanceof Error ? err.message : 'Failed to discover feeds')
      setDiscoveryStatus('error')
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

  useEffect(() => {
    if (!normalizedUrl) {
      setDiscoveryStatus('error')
      setDiscoveryError('Invalid URL')
      return
    }
    void startDiscovery(normalizedUrl)
  }, [normalizedUrl])

  const openInBrowser = async (url?: string | null) => {
    if (!url) return
    try {
      await Linking.openURL(url)
    } catch (err) {
      console.error('Failed to open URL', err)
      setSnackbar('Failed to open in browser')
    }
  }

  const openExistingFeed = (feed: Feed) => {
    setFeedFilter(feed.id, feed.title)
    router.push('/(tabs)')
  }

  const subscribeToCandidate = async (candidateUrl: string) => {
    const normalizedCandidate = normalizeUrl(candidateUrl) ?? candidateUrl
    const existing = feeds.find((feed) => feed.xmlUrl === normalizedCandidate)
    if (existing) {
      setDuplicateFeed(existing)
      return
    }

    const feedId = generateUUID()
    setSubmitting('subscribe')
    try {
      const { feed, articles: fetchedArticles } = await fetchFeed(feedId, normalizedCandidate)
      await upsertFeeds([feed])
      const deduped = dedupeById(fetchedArticles)
      if (deduped.length) {
        await upsertArticles(deduped)
        deduped.forEach((article) => upsertArticleLocal(article))
      }
      addFeed(feed)
      setFeedFilter(feed.id, feed.title)
      router.push('/(tabs)')
      setSnackbar('Subscribed')
    } catch (err) {
      console.error('Failed to subscribe from share', err)
      setSnackbar('Failed to subscribe')
    } finally {
      setSubmitting(null)
    }
  }

  const kindLabel = (kind: FeedCandidate['kind']) =>
    kind === 'rss' ? 'RSS' : kind === 'atom' ? 'Atom' : 'Feed'

  const isValid = Boolean(normalizedUrl)

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Discover feed" />
      </Appbar.Header>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Title title="Shared link" titleVariant="titleLarge" />
          <Card.Content>
            <Text variant="bodyMedium" selectable>
              {sharedUrl || 'No link detected'}
            </Text>
          </Card.Content>
        </Card>

        {discoveryStatus === 'loading' ? (
          <Card style={styles.card}>
            <Card.Title title="Looking for feeds…" titleVariant="titleMedium" />
            <Card.Content style={{ alignItems: 'center' }}>
              <Icon source="web-sync" size={128} />
              <Text variant="bodyMedium">This can take a few seconds.</Text>
            </Card.Content>
          </Card>
        ) : null}

        {discoveryStatus === 'ready' ? (
          <Card style={styles.card}>
            <Card.Title title="Found following feeds" titleVariant="titleMedium" />
            <Card.Content>
              {candidates.map((candidate) => {
                const title = he.decode(candidate.title ?? candidate.url)
                const suffix = `(${kindLabel(candidate.kind)})`
                return (
                  <List.Item
                    key={candidate.url}
                    title={`${title} ${suffix}`}
                    description={candidate.title ? candidate.url : undefined}
                    onPress={() => subscribeToCandidate(candidate.url)}
                    left={() => <List.Icon icon="rss" color="orange" />}
                    disabled={!isValid || submitting !== null}
                  />
                )
              })}
            </Card.Content>
          </Card>
        ) : null}

        {discoveryStatus === 'none' ? (
          <Card style={styles.card}>
            <Card.Title title="No feed found" titleVariant="titleMedium" />
            <Card.Content>
              <Text variant="bodyMedium">No RSS or Atom feeds were discovered for this link.</Text>
            </Card.Content>
            <Card.Actions>
              <Button
                icon="link-variant"
                onPress={() => {
                  setManualUrl(normalizedUrl ?? '')
                  setManualVisible(true)
                }}
                disabled={submitting !== null}
              >
                Update feed URL
              </Button>
            </Card.Actions>
          </Card>
        ) : null}

        {discoveryStatus === 'error' ? (
          <Card style={styles.card}>
            <Card.Title title="Couldn't discover feeds" />
            <Card.Content>
              <Text variant="bodyMedium">{discoveryError ?? 'Something went wrong.'}</Text>
            </Card.Content>
            <Card.Actions>
              <Button
                icon="link-variant"
                onPress={() => {
                  setManualUrl(normalizedUrl ?? '')
                  setManualVisible(true)
                }}
                disabled={submitting !== null}
              >
                Enter feed URL
              </Button>
            </Card.Actions>
          </Card>
        ) : null}

        <Button
          mode="contained-tonal"
          icon="bookmark"
          onPress={handleSaveForLater}
          disabled={!isValid || submitting !== null}
          loading={submitting === 'save'}
        >
          Save link for later
        </Button>
      </View>

      <Portal>
        <Dialog visible={manualVisible} onDismiss={() => setManualVisible(false)}>
          <Dialog.Title>Manual feed URL</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Feed URL"
              value={manualUrl}
              onChangeText={setManualUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setManualVisible(false)} disabled={submitting !== null}>
              Cancel
            </Button>
            <Button
              onPress={() => {
                const next = normalizeUrl(manualUrl)
                if (!next) {
                  setSnackbar('Enter a valid URL')
                  return
                }
                setManualVisible(false)
                void startDiscovery(next)
              }}
              disabled={submitting !== null}
            >
              Find feeds
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(duplicateFeed)} onDismiss={() => setDuplicateFeed(null)}>
          <Dialog.Title>Already subscribed</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {duplicateFeed ? `You already follow “${duplicateFeed.title}”.` : ''}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDuplicateFeed(null)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={() => {
                if (!duplicateFeed) return
                const existing = duplicateFeed
                setDuplicateFeed(null)
                openExistingFeed(existing)
              }}
            >
              Open feed
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
})
