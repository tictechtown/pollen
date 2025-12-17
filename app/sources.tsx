import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
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

import { encodeBase64 } from '@/services/rssClient'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'
import { Feed } from '@/types'

const toFeed = (url: string): Feed => {
  const normalized = url.trim()
  const id = encodeBase64(normalized) ?? normalized
  return {
    id,
    url: normalized,
    title: normalized,
  }
}

export default function SourcesScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const feeds = useFeedsStore((state) => state.feeds)
  const addFeed = useFeedsStore((state) => state.addFeed)
  const removeFeed = useFeedsStore((state) => state.removeFeed)
  const removeArticlesByFeed = useArticlesStore((state) => state.removeByFeed)
  const { setFeedFilter, selectedFeedId } = useFiltersStore()

  const [addVisible, setAddVisible] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
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
    removeFeed(feed.id)
    removeArticlesByFeed(feed.id)
    if (selectedFeedId === feed.id) {
      setFeedFilter(undefined, undefined)
    }
    setSnackbar(`Removed ${feed.title}`)
  }

  const handleAdd = () => {
    if (!feedUrl.trim()) {
      setSnackbar('Enter a feed URL')
      return
    }
    const feed = toFeed(feedUrl)
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) =>
          item.id === 'all' ? (
            <List.Item
              title="All"
              description="See every article"
              left={(props) => <List.Icon {...props} icon="infinity" />}
              right={(props) =>
                selectedFeedId ? <List.Icon {...props} icon="chevron-right" /> : <List.Icon {...props} icon="check" />
              }
              onPress={() => handleSelect(undefined)}
            />
          ) : (
            <Swipeable
              renderRightActions={() => (
                <View style={[styles.deleteAction, { backgroundColor: colors.errorContainer }]}>
                  <List.Icon color={colors.onErrorContainer} icon="delete" />
                </View>
              )}
              onSwipeableOpen={() => handleRemove(item)}
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
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
})
