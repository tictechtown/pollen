import { useMaterial3Theme } from '@pchmn/expo-material3-theme'
import { ThemeProvider } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus, View } from 'react-native'
import { PaperProvider, Snackbar } from 'react-native-paper'
import 'react-native-reanimated'

import { getNavigationTheme, getPaperTheme } from '@/constants/paperTheme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { consumeBackgroundMarker, registerBackgroundRefresh } from '@/services/background-refresh'
import { hydrateArticlesAndFeeds, refreshFeedsAndArticles } from '@/services/refresh'
import { parseSharedUrl } from '@/services/share-intent'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

const MIN_REFRESH_MS = 5 * 60 * 1000

export default function RootLayout() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const { theme } = useMaterial3Theme()
  const paperTheme = getPaperTheme(colorScheme ?? null, theme)
  const navigationTheme = getNavigationTheme(colorScheme ?? null, paperTheme)
  const [newArticlesCount, setNewArticlesCount] = useState(0)
  const lastSharedUrl = useRef<string | null>(null)

  // refresh feeds/articles when coming back from background
  const appState = useRef<AppStateStatus>(AppState.currentState)
  const lastForegroundRefresh = useRef(0)
  const setArticles = useArticlesStore((state) => state.setArticles)
  const setFeeds = useFeedsStore((state) => state.setFeeds)
  const selectedFeedId = useFiltersStore((state) => state.selectedFeedId)

  useEffect(() => {
    registerBackgroundRefresh().catch((err) =>
      console.warn('Background refresh registration failed', err),
    )

    const checkMarker = async () => {
      const marker = await consumeBackgroundMarker()
      if (marker?.count) {
        setNewArticlesCount(marker.count)
      }
    }

    checkMarker()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkMarker()
      }
    })
    return () => {
      sub.remove()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const refreshOnForeground = async () => {
      const now = Date.now()
      if (now - lastForegroundRefresh.current < MIN_REFRESH_MS) {
        return
      }
      lastForegroundRefresh.current = now
      try {
        const result = await refreshFeedsAndArticles({ selectedFeedId })
        if (!result.feedsUsed.length) return
        const { feeds, articles } = await hydrateArticlesAndFeeds(selectedFeedId)
        if (cancelled) return
        if (feeds.length) {
          setFeeds(feeds)
        }
        setArticles(articles)
      } catch (err) {
        console.warn('Foreground refresh failed', err)
      }
    }

    const handleAppStateChange = (state: AppStateStatus) => {
      const previous = appState.current
      appState.current = state
      if (previous.match(/inactive|background/) && state === 'active') {
        void refreshOnForeground()
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange)
    return () => {
      cancelled = true
      sub.remove()
    }
  }, [selectedFeedId, setArticles, setFeeds])

  const url = Linking.useLinkingURL()

  useEffect(() => {
    // TODO - Check handleShareIntent - it doesn't seem to be working
    const handleShareIntent = (url?: string | null) => {
      console.log('linking url', url)
      const shared = parseSharedUrl(url ?? '')
      if (shared) {
        try {
          router.push({ pathname: '/share', params: { url: encodeURIComponent(shared) } })
        } catch (e) {}
      }
    }
    console.log('url', url)
    if (url) {
      handleShareIntent(url)
    }
  }, [router, url])

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <GestureHandlerRootView>
          <View style={{ flex: 1, backgroundColor: navigationTheme.colors.background }}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="article/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="sources" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen name="share" options={{ headerShown: false, presentation: 'modal' }} />
            </Stack>
            <Snackbar
              visible={newArticlesCount > 0}
              duration={3000}
              onDismiss={() => setNewArticlesCount(0)}
              action={{ label: 'OK', onPress: () => setNewArticlesCount(0) }}
            >
              {`${newArticlesCount} new articles`}
            </Snackbar>
          </View>
        </GestureHandlerRootView>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  )
}
