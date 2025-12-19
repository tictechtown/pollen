import { useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { Appbar, Card, Divider, Text, useTheme } from 'react-native-paper'

import FeedItem from '@/components/ui/FeedItem'
import { setArticleRead, setArticleSaved } from '@/services/articles-db'
import { useArticlesStore } from '@/store/articles'
import { useShallow } from 'zustand/react/shallow'

export default function SavedScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { articles, updateSavedLocal } = useArticlesStore(
    useShallow((state) => ({
      articles: state.articles,
      updateSavedLocal: state.updateSavedLocal,
    })),
  )
  const updateSeenLocal = useArticlesStore((state) => state.updateSeenLocal)

  const saved = useMemo(
    () => articles.filter((article) => article.saved),
    [articles],
  )

  const toggleSaved = useCallback(
    async (id: string) => {
      const current = articles.find((article) => article.id === id)
      if (!current) return
      const nextSaved = !current.saved
      await setArticleSaved(id, nextSaved)
      updateSavedLocal(id, nextSaved)
    },
    [articles, updateSavedLocal],
  )

  const toggleSeen = useCallback(
    async (id: string) => {
      const current = articles.find((article) => article.id === id)
      if (!current) return
      const nextSeen = !current.seen
      await setArticleRead(id, nextSeen)
      updateSeenLocal(id, nextSeen)
    },
    [articles, updateSeenLocal],
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Appbar.Header mode="center-aligned">
        <Appbar.Content title="Read Later" />
        <Appbar.Action icon="cog-outline" onPress={() => router.push('/settings')} />
      </Appbar.Header>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={saved}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Card.Title title="No saved articles" />
            <Card.Content>
              <Text variant="bodyMedium">Swipe left on a card in your feed to save it.</Text>
            </Card.Content>
          </Card>
        }
        ItemSeparatorComponent={() => <Divider horizontalInset />}
        renderItem={({ item }) => (
          <FeedItem
            article={item}
            onOpen={() => router.push(`/article/${item.id}`)}
            onToggleSaved={() => toggleSaved(item.id)}
            onToggleSeen={() => toggleSeen(item.id)}
            colors={colors}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },
  emptyCard: {
    margin: 16,
  },
})
