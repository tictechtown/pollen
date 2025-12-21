import { useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import {
  Appbar,
  Button,
  Card,
  Dialog,
  Divider,
  FAB,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper'

import FeedItem from '@/components/ui/FeedItem'
import { setArticleRead, setArticleSaved } from '@/services/articles-db'
import { saveArticleForLater } from '@/services/save-for-later'
import { normalizeUrl } from '@/services/urls'
import { useArticlesStore } from '@/store/articles'
import { useShallow } from 'zustand/react/shallow'

export default function SavedScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { articles, updateSavedLocal, upsertArticleLocal } = useArticlesStore(
    useShallow((state) => ({
      articles: state.articles,
      updateSavedLocal: state.updateSavedLocal,
      upsertArticleLocal: state.upsertArticle,
    })),
  )
  const updateSeenLocal = useArticlesStore((state) => state.updateSeenLocal)
  const [addVisible, setAddVisible] = useState(false)
  const [inputUrl, setInputUrl] = useState('')
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const saved = useMemo(() => articles.filter((article) => article.saved), [articles])

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

  const handleCloseDialog = () => {
    setAddVisible(false)
    setInputUrl('')
  }

  const handleAdd = async () => {
    if (submitting) return
    const normalized = normalizeUrl(inputUrl)
    if (!normalized) {
      setSnackbar('Invalid URL')
      return
    }
    setSubmitting(true)
    try {
      const result = await saveArticleForLater({
        url: normalized,
        articles,
        updateSavedLocal,
        upsertArticleLocal,
      })
      if (result.status === 'already-saved') {
        setSnackbar('Already saved')
        return
      }
      setSnackbar('Saved for later')
      handleCloseDialog()
    } catch (err) {
      console.error('Failed to save article', err)
      setSnackbar('Failed to save article')
    } finally {
      setSubmitting(false)
    }
  }

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

      <FAB
        icon="plus"
        size="medium"
        onPress={() => setAddVisible(true)}
        style={styles.fab}
        variant="tertiary"
        mode="flat"
      />

      <Dialog visible={addVisible} onDismiss={handleCloseDialog}>
        <Dialog.Title>Save a link</Dialog.Title>
        <Dialog.Content>
          <TextInput
            mode="outlined"
            label="URL"
            placeholder="https://example.com/article"
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button onPress={handleAdd} loading={submitting}>
            Add
          </Button>
        </Dialog.Actions>
      </Dialog>

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
  listContent: {
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },
  emptyCard: {
    margin: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 128,
  },
})
