import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable'

import {
  Appbar,
  Button,
  Dialog,
  FAB,
  List,
  Portal,
  Snackbar,
  TextInput,
  useTheme,
} from 'react-native-paper'

import { getArticlesFromDb } from '@/services/articles-db'
import { removeFeedFromDb, upsertFeeds } from '@/services/feeds-db'
import { encodeBase64 } from '@/services/rssClient'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'
import { Feed } from '@/types'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'

const toFeed = (url: string): Feed => {
  const normalized = url.trim()
  const id = encodeBase64(normalized) ?? normalized
  return {
    id,
    url: normalized,
    title: normalized,
  }
}

type RightActionProps = {
  dragX: SharedValue<number>
  backgroundColor: string
  iconColor: string
}

const RightAction = ({ dragX, backgroundColor, iconColor }: RightActionProps) => {
  const styleAnimation = useAnimatedStyle(() => ({
    width: Math.max(0, -dragX.value),
  }))

  return (
    <View style={styles.deleteActionContainer}>
      <Reanimated.View style={[styles.deleteAction, { backgroundColor }, styleAnimation]}>
        <List.Icon color={iconColor} icon="delete" />
      </Reanimated.View>
    </View>
  )
}

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
  const [snackbar, setSnackbar] = useState<string | null>(null)

  const listData = useMemo(() => [{ id: 'all', title: 'All', url: '' }, ...feeds], [feeds])

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

  const handleAdd = async () => {
    if (!feedUrl.trim()) {
      setSnackbar('Enter a feed URL')
      return
    }
    const feed = toFeed(feedUrl)
    await upsertFeeds([feed])
    addFeed(feed)
    setFeedFilter(feed.id, feed.title)
    setFeedUrl('')
    setAddVisible(false)
    router.back()
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Sources" />
      </Appbar.Header>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) =>
          item.id === 'all' ? (
            <List.Item
              title="All"
              description="See every article"
              left={(props) => <List.Icon {...props} icon="infinity" />}
              right={(props) =>
                selectedFeedId ? (
                  <List.Icon {...props} icon="chevron-right" />
                ) : (
                  <List.Icon {...props} icon="check" />
                )
              }
              onPress={() => handleSelect(undefined)}
            />
          ) : (
            <Swipeable
              renderRightActions={(_, dragX) => (
                <RightAction
                  dragX={dragX}
                  backgroundColor={colors.errorContainer}
                  iconColor={colors.onErrorContainer}
                />
              )}
              onSwipeableOpen={() => {
                setFeedToRemove(item)
                setRemoveVisible(true)
              }}
            >
              <List.Item
                title={item.title || item.url}
                description={item.url}
                left={(props) => <List.Icon {...props} icon="rss" />}
                right={(props) =>
                  selectedFeedId === item.id ? (
                    <List.Icon {...props} icon="check-circle" color={colors.primary} />
                  ) : (
                    <List.Icon {...props} icon="chevron-right" />
                  )
                }
                onPress={() => handleSelect(item)}
              />
            </Swipeable>
          )
        }
      />

      <Portal>
        <FAB icon="plus" label="Add feed" style={styles.fab} onPress={() => setAddVisible(true)} />

        <Dialog visible={addVisible} onDismiss={() => setAddVisible(false)}>
          <Dialog.Title>Add a feed</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Feed URL"
              placeholder="https://example.com/rss"
              value={feedUrl}
              onChangeText={setFeedUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddVisible(false)}>Cancel</Button>
            <Button onPress={handleAdd}>Add</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={removeVisible}
          onDismiss={() => {
            setRemoveVisible(false)
            setFeedToRemove(null)
          }}
        >
          <Dialog.Title>
            Are you sure you want to remove {feedToRemove?.title ?? 'this feed'}?
          </Dialog.Title>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setRemoveVisible(false)
                setFeedToRemove(null)
              }}
            >
              Cancel
            </Button>
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
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    marginLeft: 72,
    opacity: 0.1,
  },
  deleteAction: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: '100%',
  },
  deleteActionContainer: {
    alignItems: 'flex-end',
    width: '100%',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
})
