import FeedListItem from '@/components/ui/FeedListItem'
import { readerApi } from '@/services/reader-api'
import { useArticlesStore } from '@/store/articles'
import { useFiltersStore } from '@/store/filters'
import type { Article } from '@/types'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native'
import { ActivityIndicator, Appbar, Banner, Searchbar, Text, useTheme } from 'react-native-paper'

const PAGE_SIZE = 50
const DEBOUNCE_MS = 200

export default function SearchScreen() {
  const router = useRouter()
  const { colors } = useTheme()

  const selectedFeedId = useFiltersStore((state) => state.selectedFeedId)
  const selectedFeedTitle = useFiltersStore((state) => state.selectedFeedTitle)
  const scopeLabel = selectedFeedTitle ? selectedFeedTitle : 'All articles'

  const updateSavedLocal = useArticlesStore((state) => state.updateSavedLocal)
  const updateReadLocal = useArticlesStore((state) => state.updateReadLocal)
  const invalidate = useArticlesStore((state) => state.invalidate)

  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchbarRef = useRef<TextInput>(null)

  const hasMore = articles.length < total

  const runSearch = useCallback(
    async (params: { query: string; page: number; append: boolean }) => {
      const trimmed = params.query.trim()
      if (!trimmed) {
        setArticles([])
        setTotal(0)
        setPage(1)
        setError(null)
        return
      }

      if (params.append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const result = await readerApi.articles.searchPage({
          query: trimmed,
          feedId: selectedFeedId,
          page: params.page,
          pageSize: PAGE_SIZE,
        })
        setTotal(result.total)
        setPage(params.page)
        setArticles((current) =>
          params.append ? [...current, ...result.articles] : result.articles,
        )
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        if (!params.append) {
          setArticles([])
          setTotal(0)
          setPage(1)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [selectedFeedId],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch({ query, page: 1, append: false })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, runSearch])

  useEffect(() => {
    void runSearch({ query, page: 1, append: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeedId])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchbarRef.current?.focus()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const toggleSaved = useCallback(
    async (id: string) => {
      const { localSavedArticles } = useArticlesStore.getState()
      const nextSaved = !(localSavedArticles.get(id) ?? false)
      try {
        await readerApi.articles.setSaved(id, nextSaved)
        updateSavedLocal(id, nextSaved)
        invalidate('local')
      } catch {
        // ignore
      }
    },
    [invalidate, updateSavedLocal],
  )

  const toggleRead = useCallback(
    async (id: string) => {
      const { localReadArticles } = useArticlesStore.getState()
      const nextRead = !(localReadArticles.get(id) ?? false)
      try {
        await readerApi.articles.setRead(id, nextRead)
        updateReadLocal(id, nextRead)
        invalidate('local')
      } catch {
        // ignore
      }
    },
    [invalidate, updateReadLocal],
  )

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
    [colors, router, toggleRead, toggleSaved],
  )

  const listHeader = useMemo(
    () => (
      <View style={styles.scope}>
        <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
          Searching in {scopeLabel}
        </Text>
      </View>
    ),
    [colors.onSurfaceVariant, scopeLabel],
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Appbar.Header mode="small">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Search" />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          ref={searchbarRef}
          value={query}
          placeholder="Search articles"
          onChangeText={setQuery}
          autoFocus
          style={styles.searchbar}
        />
        {listHeader}
      </View>

      {error ? (
        <Banner
          visible
          icon="alert-circle"
          actions={[
            { label: 'Retry', onPress: () => runSearch({ query, page: 1, append: false }) },
          ]}
        >
          {error}
        </Banner>
      ) : null}

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!query.trim()}
            onRefresh={() => runSearch({ query, page: 1, append: false })}
          />
        }
        onEndReached={() => {
          if (!query.trim()) return
          if (!hasMore) return
          if (loading || loadingMore) return
          void runSearch({ query, page: page + 1, append: true })
        }}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          loading && query.trim() ? (
            <View style={styles.empty}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={{ color: colors.onSurfaceVariant }}>
                {query.trim() ? 'No matches' : 'Start typing to search your articles'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchbar: {
    borderRadius: 16,
  },
  scope: {
    paddingTop: 8,
  },
  listContent: {
    paddingBottom: 120,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
