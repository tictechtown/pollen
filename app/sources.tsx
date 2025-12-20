import { useRouter } from 'expo-router'
import he from 'he'
import { useMemo, useRef, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'

import {
  Appbar,
  Button,
  Dialog,
  FAB,
  List,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper'

import SourceListItem from '@/components/ui/SourceListItem'
import { getArticlesFromDb, upsertArticles } from '@/services/articles-db'
import { discoverFeedUrls, FeedCandidate } from '@/services/feedDiscovery'
import { removeFeedFromDb, upsertFeeds } from '@/services/feeds-db'
import { fetchFeed } from '@/services/rssClient'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'
import { Feed } from '@/types'

export default function SourcesScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const feeds = useFeedsStore((state) => state.feeds)
  const addFeed = useFeedsStore((state) => state.addFeed)
  const removeFeed = useFeedsStore((state) => state.removeFeed)
  const setArticles = useArticlesStore((state) => state.setArticles)
  const { setFeedFilter, selectedFeedId } = useFiltersStore()

  const [addVisible, setAddVisible] = useState(false)
  const [removeVisible, setRemoveVisible] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [feedToRemove, setFeedToRemove] = useState<Feed | null>(null)
  const [feedCandidates, setFeedCandidates] = useState<FeedCandidate[]>([])
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const swipeableRefs = useRef<Record<string, SwipeableMethods | null>>({})

  const listData = useMemo(() => [{ id: 'all', title: 'All', xmlUrl: '' }, ...feeds], [feeds])

  const handleSelect = (feed?: Feed) => {
    if (!feed || feed.id === 'all') {
      setFeedFilter(undefined, undefined)
    } else {
      setFeedFilter(feed.id, feed.title)
    }
    router.back()
  }

  const handleRemove = (feed: Feed) => {
    removeFeedFromDb(feed.id).then(async () => {
      removeFeed(feed.id)
      const nextFeedId = selectedFeedId === feed.id ? undefined : selectedFeedId
      if (selectedFeedId === feed.id) {
        setFeedFilter(undefined, undefined)
      }
      const remainingArticles = await getArticlesFromDb(nextFeedId)
      setArticles(remainingArticles)
      setSnackbar(`Removed ${feed.title}`)
    })
  }

  const handleConfirmRemove = () => {
    if (!feedToRemove) {
      return
    }
    handleRemove(feedToRemove)
    setRemoveVisible(false)
    setFeedToRemove(null)
  }

  const handleCancelRemove = () => {
    if (feedToRemove) {
      swipeableRefs.current[feedToRemove.id]?.close()
    }
    setRemoveVisible(false)
    setFeedToRemove(null)
  }

  const finalizeAdd = () => {
    setFeedUrl('')
    setFeedCandidates([])
    setAddVisible(false)
    router.back()
  }

  const addFeedByUrl = async (url: string) => {
    const { feed, articles } = await fetchFeed(url, {
      cutoffTs: 0,
    })
    await upsertFeeds([feed])
    await upsertArticles(articles)
    addFeed(feed)
    setFeedFilter(feed.id, feed.title)
  }

  const withSubmitting = async (action: () => Promise<void>) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await action()
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdd = async () => {
    const trimmedUrl = feedUrl.trim()
    if (!trimmedUrl) {
      setSnackbar('Enter a feed URL')
      return
    }
    await withSubmitting(async () => {
      try {
        const { directUrl, candidates } = await discoverFeedUrls(trimmedUrl)
        if (directUrl) {
          await addFeedByUrl(directUrl)
          finalizeAdd()
          return
        }
        if (candidates.length === 1) {
          await addFeedByUrl(candidates[0].url)
          finalizeAdd()
          return
        }
        if (candidates.length > 1) {
          setFeedCandidates(candidates)
          return
        }
        setSnackbar('No RSS or Atom feed found')
      } catch (err) {
        setSnackbar(err instanceof Error ? err.message : 'Failed to add feed')
      }
    })
  }

  const handleSelectCandidate = async (candidate: FeedCandidate) => {
    await withSubmitting(async () => {
      try {
        await addFeedByUrl(candidate.url)
        finalizeAdd()
      } catch (err) {
        setSnackbar(err instanceof Error ? err.message : 'Failed to add feed')
      }
    })
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Sources" />
      </Appbar.Header>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const isAll = item.id === 'all'
          const isSelected = isAll ? !selectedFeedId : selectedFeedId === item.id
          return (
            <SourceListItem
              item={item}
              isAll={isAll}
              isSelected={isSelected}
              isFirst={index === 0}
              isLast={index === listData.length - 1}
              onSelect={handleSelect}
              onRequestRemove={(feed) => {
                setFeedToRemove(feed)
                setRemoveVisible(true)
              }}
              registerSwipeableRef={(id, ref) => {
                swipeableRefs.current[id] = ref
              }}
            />
          )
        }}
      />

      <Portal>
        <FAB
          icon="plus"
          label="Add feed"
          style={styles.fab}
          onPress={() => setAddVisible(true)}
          variant="secondary"
        />

        <Dialog
          visible={addVisible}
          onDismiss={() => {
            setAddVisible(false)
            setFeedCandidates([])
          }}
        >
          <Dialog.Title>Add a feed</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Feed URL"
              placeholder="https://example.com/rss"
              value={feedUrl}
              onChangeText={(value) => {
                setFeedUrl(value)
                if (feedCandidates.length) {
                  setFeedCandidates([])
                }
              }}
              editable={feedCandidates.length <= 1 && !submitting}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {feedCandidates.length > 1
              ? [
                  <Text key="candidate-title" variant="titleMedium" style={{ marginTop: 16 }}>
                    Select Feed
                  </Text>,
                  ...feedCandidates.map((candidate) => (
                    <List.Item
                      key={candidate.url}
                      title={he.decode(candidate.title ?? candidate.url)}
                      description={candidate.title ? candidate.url : undefined}
                      onPress={() => handleSelectCandidate(candidate)}
                      left={() => <List.Icon icon="radiobox-blank" />}
                      disabled={submitting}
                    />
                  )),
                ]
              : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setAddVisible(false)
                setFeedCandidates([])
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            {feedCandidates.length > 1 ? null : (
              <Button onPress={handleAdd} loading={submitting}>
                Add
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={removeVisible} onDismiss={handleCancelRemove}>
          <Dialog.Title>
            Are you sure you want to remove {feedToRemove?.title ?? 'this feed'}?
          </Dialog.Title>
          <Dialog.Actions>
            <Button onPress={handleCancelRemove}>Cancel</Button>
            <Button onPress={handleConfirmRemove}>Remove</Button>
          </Dialog.Actions>
        </Dialog>

        <Snackbar
          visible={Boolean(snackbar)}
          onDismiss={() => setSnackbar(null)}
          duration={3000}
          action={{ label: 'Dismiss', onPress: () => setSnackbar(null) }}
        >
          {snackbar}
        </Snackbar>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 16,
    paddingBottom: 64,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
})
