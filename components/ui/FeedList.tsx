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
import { AnimatedFAB, Appbar, Banner, Divider, Text, useTheme } from 'react-native-paper'

import FeedItem from '@/components/ui/FeedItem'
import { useArticles } from '@/hooks/useArticles'
import { useFiltersStore } from '@/store/filters'
import { Article } from '@/types'

interface Props {
  unseenOnly?: boolean
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
    toggleSaved,
    toggleSeen,
    markAllSeen,
    error,
  } = useArticles(props)
  const { selectedFeedTitle } = useFiltersStore()
  const { colors } = useTheme()
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset?.y ?? 0
    const nextScrolled = offsetY !== 0
    setIsScrolled(nextScrolled)
  }, [])

  console.log('rendering feedlist', { unseen: !!props.unseenOnly })

  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <FeedItem
        article={item}
        onOpen={() => {
          console.log('opening', `/article/${item.id}`)
          router.push(`/article/${item.id}`)
        }}
        onToggleSaved={() => toggleSaved(item.id)}
        onToggleSeen={() => toggleSeen(item.id)}
        colors={colors}
      />
    ),
    [colors, router, toggleSaved, toggleSeen],
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Appbar.Header mode="small">
        <Appbar.Action icon={'menu'} onPress={() => router.push('/sources')} />
        <Appbar.Content title={selectedFeedTitle ? selectedFeedTitle : 'All'} />
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <Divider horizontalInset />}
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
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>
              {props.unseenOnly ? 'All caught up' : 'No articles yet. Pull to refresh.'}
            </Text>
          </View>
        }
      />

      <AnimatedFAB
        icon="check-all"
        label="Mark all seen"
        extended={!isScrolled}
        onPress={() => markAllSeen()}
        style={styles.fab}
        variant="tertiary"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
    gap: 12,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 128,
  },
})
