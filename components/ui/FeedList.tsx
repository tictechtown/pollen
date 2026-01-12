import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import {
  ActivityIndicator,
  AnimatedFAB,
  Appbar,
  Banner,
  Button,
  Card,
  Text,
  useTheme,
} from 'react-native-paper'

import FeedListItem from '@/components/ui/FeedListItem'
import { useArticles } from '@/hooks/useArticles'
import { useFiltersStore } from '@/store/filters'
import { Article } from '@/types'
import { Image } from 'expo-image'

interface Props {
  unreadOnly?: boolean
}

export default function FeedList(props: Props) {
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const {
    articles,
    loading,
    refresh,
    loadNextPage,
    hasMore,
    hasUnread,
    manualRefreshing,
    toggleSaved,
    toggleRead,
    markAllRead,
    error,
  } = useArticles(props)
  const selectedFeedTitle = useFiltersStore((state) => state.selectedFeedTitle)
  const selectedFolderTitle = useFiltersStore((state) => state.selectedFolderTitle)
  const { colors } = useTheme()
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset?.y ?? 0
    const nextScrolled = offsetY !== 0
    setIsScrolled(nextScrolled)
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <FeedListItem
        article={item}
        onOpen={() => {
          router.push(`/article/${item.id}`)
        }}
        onToggleSaved={() => toggleSaved(item.id)}
        onToggleRead={() => toggleRead(item.id)}
        colors={colors}
      />
    ),
    [colors, router, toggleSaved, toggleRead],
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Appbar.Header mode="small">
        <Appbar.Action icon={'menu'} onPress={() => router.dismissTo('/sources')} />
        <Appbar.Content title={selectedFeedTitle ?? selectedFolderTitle ?? 'All'} />
        <Appbar.Action icon="magnify" onPress={() => router.push('/search' as any)} />
        <Appbar.Action icon="refresh" onPress={() => refresh()} />
        <Appbar.Action icon="cog-outline" onPress={() => router.push('/settings')} />
      </Appbar.Header>

      {error ? (
        <Banner visible icon="alert-circle" actions={[{ label: 'Retry', onPress: refresh }]}>
          {error}
        </Banner>
      ) : null}

      <FlatList
        style={{ backgroundColor: colors.surface }}
        contentContainerStyle={styles.listContent}
        data={articles}
        refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={refresh} />}
        keyExtractor={(item) => item.id}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={() => {
          if (hasMore) {
            loadNextPage()
          }
        }}
        onEndReachedThreshold={0.6}
        renderItem={renderItem}
        ListEmptyComponent={
          loading ? (
            <Card contentStyle={{ gap: 12 }} style={styles.emptyCard}>
              <Image
                style={styles.image}
                source={require('../../assets/images/undraw_loading_3kqt.svg')}
              />

              <Card.Content style={{ alignItems: 'center', gap: 12 }}>
                <ActivityIndicator />
                <Text>Loading…</Text>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <Image style={styles.image} source={require('../../assets/images/no-unread.svg')} />

              <Card.Title
                titleVariant="titleMedium"
                title={props.unreadOnly ? 'All caught up' : 'No Feed yet'}
              />
              <Card.Actions>
                <Button
                  mode="contained"
                  onPress={() => {
                    if (props.unreadOnly) {
                      router.push('/(tabs)')
                    } else {
                      router.push(`/sources`)
                    }
                  }}
                >
                  {props.unreadOnly ? 'Show all' : 'Add new Feed'}
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={() => {
                    if (props.unreadOnly) {
                      refresh()
                    } else {
                      router.push(`/sources`)
                    }
                  }}
                >
                  {props.unreadOnly ? 'Refresh' : 'Import OPML'}
                </Button>
              </Card.Actions>
            </Card>
          )
        }
      />

      {hasUnread ? (
        <AnimatedFAB
          icon="check-all"
          label="Mark all read"
          extended={!isScrolled}
          onPress={() => markAllRead()}
          style={styles.fab}
          variant="tertiary"
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  emptyCard: {
    margin: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 128,
  },
  image: {
    flex: 1,
    height: 300,
    margin: 16,
  },
})
