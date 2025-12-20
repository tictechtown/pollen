import { useRouter } from 'expo-router'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { Appbar, Banner, Divider, FAB, Text, useTheme } from 'react-native-paper'

import FeedItem from '@/components/ui/FeedItem'
import { useArticles } from '@/hooks/useArticles'
import { useFiltersStore } from '@/store/filters'

interface Props {
  unseenOnly?: boolean
}

export default function FeedList(props: Props) {
  const router = useRouter()
  const {
    articles,
    loading,
    refresh,
    loadNextPage,
    hasMore,
    hasUnseen,
    toggleSaved,
    toggleSeen,
    markAllSeen,
    error,
  } = useArticles(props)
  const { selectedFeedTitle } = useFiltersStore()
  const { colors } = useTheme()

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
        onEndReached={() => {
          if (hasMore) {
            loadNextPage()
          }
        }}
        onEndReachedThreshold={0.6}
        renderItem={({ item }) => (
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
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">No articles yet. Pull to refresh.</Text>
          </View>
        }
      />

      <FAB
        icon="check-all"
        label="Mark all seen"
        visible={hasUnseen}
        onPress={() => markAllSeen()}
        style={styles.fab}
        variant="secondary"
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
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 128,
  },
})
