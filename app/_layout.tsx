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
import { parseSharedUrl } from '@/services/share-intent'
import { useArticlesStore } from '@/store/articles'
import { useFiltersStore } from '@/store/filters'
import { useRefreshStore } from '@/store/refresh'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function RootLayout() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const { theme } = useMaterial3Theme()
  const paperTheme = getPaperTheme(colorScheme ?? null, theme)
  const navigationTheme = getNavigationTheme(colorScheme ?? null, paperTheme)
  const [newArticlesCount, setNewArticlesCount] = useState(0)
  const [dismissedError, setDismissedError] = useState<string | null>(null)

  // refresh feeds/articles when coming back from background
  const appState = useRef<AppStateStatus>(AppState.currentState)
  const selectedFeedId = useFiltersStore((state) => state.selectedFeedId)
  const refresh = useRefreshStore((state) => state.refresh)
  const hydrate = useRefreshStore((state) => state.hydrate)
  const refreshStatus = useRefreshStore((state) => state.status)
  const refreshError = useRefreshStore((state) => state.lastError)
  const { initialized, setInitialized } = useArticlesStore()

  // Startup effect
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

  // Startup effect
  useEffect(() => {
    const boot = async () => {
      console.log('[boot]')
      setInitialized()
      // we load from disk
      await hydrate()
      // we force a refresh
      await refresh({ reason: 'foreground' })
    }
    if (!initialized) {
      boot()
    }
  }, [hydrate, initialized, setInitialized, refresh])

  useEffect(() => {
    const refreshOnForeground = async () => {
      try {
        await refresh({ reason: 'foreground', selectedFeedId })
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
      sub.remove()
    }
  }, [refresh, selectedFeedId])

  useEffect(() => {
    if (refreshError && refreshError !== dismissedError) {
      setDismissedError(null)
    }
  }, [dismissedError, refreshError])

  const url = Linking.useLinkingURL()

  useEffect(() => {
    const handleShareIntent = (url?: string | null) => {
      const shared = parseSharedUrl(url ?? '')
      if (shared) {
        router.push({ pathname: '/share', params: { url: encodeURIComponent(shared) } })
      }
    }
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
            <Snackbar
              visible={
                refreshStatus === 'error' && !!refreshError && dismissedError !== refreshError
              }
              duration={4000}
              onDismiss={() => setDismissedError(refreshError)}
              action={{
                label: 'Retry',
                onPress: () => {
                  void refresh({ reason: 'manual', selectedFeedId })
                },
              }}
            >
              {refreshError ?? ''}
            </Snackbar>
          </View>
        </GestureHandlerRootView>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  )
}
