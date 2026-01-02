import { useMaterial3Theme } from '@pchmn/expo-material3-theme'
import { ThemeProvider } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { Stack, usePathname, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus, View } from 'react-native'
import { PaperProvider, Snackbar } from 'react-native-paper'
import 'react-native-reanimated'

import { getNavigationTheme, getPaperTheme } from '@/constants/paperTheme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { parseSharedUrl } from '@/services/share-intent'
import { useArticlesStore } from '@/store/articles'
import { useFiltersStore } from '@/store/filters'
import { useRefreshStore } from '@/store/refresh'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function RootLayout() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const { theme } = useMaterial3Theme({ fallbackSourceColor: '#63A002' })
  const paperTheme = getPaperTheme(colorScheme ?? null, theme)
  const navigationTheme = getNavigationTheme(colorScheme ?? null, paperTheme)
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

  const pathname = usePathname()

  useEffect(() => {
    console.log('useeffect', pathname)
    if (!initialized) return
    if (pathname !== '/') return
    router.push('/(tabs)') // keeps sources underneath
  }, [initialized, pathname, router])

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <GestureHandlerRootView>
          <View style={{ flex: 1, backgroundColor: navigationTheme.colors.background }}>
            <Stack initialRouteName="sources">
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="sources" options={{ headerShown: false }} />
              <Stack.Screen name="article/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="share" options={{ headerShown: false, presentation: 'modal' }} />
            </Stack>
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
