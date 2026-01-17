import { useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import {
  ActivityIndicator,
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

import FeedListItem from '@/components/ui/FeedListItem'
import { getListPerformanceProps } from '@/components/ui/listPerformance'
import { useSavedArticles } from '@/hooks/useSavedArticles'
import { readerApi } from '@/services/reader-api'
import { saveArticleForLater } from '@/services/save-for-later'
import { normalizeUrl } from '@/services/urls'
import { useArticlesStore } from '@/store/articles'
import { Article, ModernMD3Colors } from '@/types'
import { Image } from 'expo-image'

export default function SavedScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const updateSavedLocal = useArticlesStore((state) => state.updateSavedLocal)
  const updateReadLocal = useArticlesStore((state) => state.updateReadLocal)
  const invalidate = useArticlesStore((state) => state.invalidate)
  const { articles: saved, loading } = useSavedArticles()
  const [addVisible, setAddVisible] = useState(false)
  const [inputUrl, setInputUrl] = useState('')
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const listPerformanceProps = useMemo(() => getListPerformanceProps(saved.length), [saved.length])

  const toggleSaved = useCallback(
    async (id: string, currentSaved: boolean) => {
      const nextSaved = !currentSaved
      try {
        await readerApi.articles.setSaved(id, nextSaved)
        updateSavedLocal(id, nextSaved)
        invalidate('local')
      } catch {
        // ignore and keep local state unchanged
      }
    },
    [invalidate, updateSavedLocal],
  )

  const toggleRead = useCallback(
    async (id: string, currentRead: boolean) => {
      const nextRead = !currentRead
      try {
        await readerApi.articles.setRead(id, nextRead)
        updateReadLocal(id, nextRead)
        invalidate('local')
      } catch {
        // ignore and keep local state unchanged
      }
    },
    [invalidate, updateReadLocal],
  )

  const handleOpen = useCallback(
    (id: string) => {
      router.push(`/article/${id}`)
    },
    [router],
  )

  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <FeedListItem
        article={item}
        onOpen={handleOpen}
        onToggleSaved={toggleSaved}
        onToggleRead={toggleRead}
        readOnly
        colors={colors as ModernMD3Colors}
      />
    ),
    [colors, handleOpen, toggleRead, toggleSaved],
  )

  const renderSeparator = useCallback(() => <Divider horizontalInset />, [])

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
        updateSavedLocal,
        invalidate,
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
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.Content title="Read Later" />
        <Appbar.Action
          icon="cog-outline"
          onPress={() =>
            router.push({
              pathname: '/share',
              params: {
                url: 'https://raw.githubusercontent.com/spians/awesome-RSS-feeds/master/recommended/with_category/Photography.opml',
              },
            })
          }
        />

        <Appbar.Action icon="cog-outline" onPress={() => router.push('/settings')} />
      </Appbar.Header>

      <FlatList
        {...listPerformanceProps}
        contentContainerStyle={styles.listContent}
        data={saved}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          loading ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={{ alignItems: 'center', gap: 12 }}>
                <ActivityIndicator />
                <Text variant="bodyMedium">Loading…</Text>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <Image
                style={styles.image}
                source={require('../../assets/images/undraw_save-to-bookmarks_9o51.svg')}
              />

              <Card.Title titleVariant="titleMedium" title="No saved articles" />
              <Card.Content>
                <Text>Swipe left on a card in your feed to save it.</Text>
              </Card.Content>
            </Card>
          )
        }
        ItemSeparatorComponent={renderSeparator}
        renderItem={renderItem}
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
        onIconPress={() => setSnackbar(null)}
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
