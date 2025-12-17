import { useRouter } from 'expo-router'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { Appbar, Banner, Chip, Divider, FAB, Text, useTheme } from 'react-native-paper'

import FeedItem from '@/components/ui/FeedItem'
import { useArticles } from '@/hooks/useArticles'
import { useFiltersStore } from '@/store/filters'

export default function FeedScreen() {
  const router = useRouter()
  const { articles, loading, refresh, toggleSaved, toggleSeen, markAllSeen, error } = useArticles()
  const { selectedFeedTitle, showUnseenOnly, setShowUnseenOnly } = useFiltersStore()
  const { colors } = useTheme()
  const hasArticles = articles.length > 0
  const hasUnseen = articles.some((article) => !article.seen)

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Appbar.Header mode="center-aligned">
        <Appbar.Content title="Newsfeed" subtitle="The Verge RSS" />
        <Appbar.Action icon="refresh" onPress={() => refresh()} />
      </Appbar.Header>

      <View style={styles.filters}>
        <Chip
          icon="rss"
          onPress={() => router.push('/sources')}
          selected={Boolean(selectedFeedTitle)}
          mode="flat"
        >
          {selectedFeedTitle ? `Sources: ${selectedFeedTitle}` : 'Sources'}
        </Chip>
        <Chip
          icon="eye-off-outline"
          onPress={() => setShowUnseenOnly(!showUnseenOnly)}
          selected={showUnseenOnly}
          mode="flat"
        >
          Seen
        </Chip>
      </View>

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
        renderItem={({ item }) => (
          <>
            <FeedItem
              article={item}
              onOpen={() => {
                console.log('opening', `/article/${item.id}`)
                router.push(`/article/${item.id}`)
              }}
              onToggleSaved={() => toggleSaved(item.id)}
              onToggleSeen={() => toggleSeen(item.id)}
            />
            <Divider />
          </>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">No articles yet. Pull to refresh.</Text>
          </View>
        }
      />

      {hasArticles ? (
        <FAB
          icon="check-all"
          label="Mark all seen"
          visible={hasUnseen}
          onPress={() => markAllSeen()}
          style={styles.fab}
          variant="secondary"
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    overflow: 'hidden',
  },
  cardSeen: {
    opacity: 0.7,
  },
  badge: {
    marginRight: 8,
    alignSelf: 'center',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
})
