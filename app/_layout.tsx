import { useMaterial3Theme } from '@pchmn/expo-material3-theme'
import { ThemeProvider } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { Stack, usePathname, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
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

void SplashScreen.preventAutoHideAsync().catch(() => {
  // best-effort; don't block startup if splash control isn't available
})

export default function RootLayout() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const { theme } = useMaterial3Theme({ fallbackSourceColor: '#63A002' })
  const paperTheme = getPaperTheme(colorScheme ?? null, theme)
  const navigationTheme = getNavigationTheme(colorScheme ?? null, paperTheme)
  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const [appReady, setAppReady] = useState(false)
  const rootViewLaidOut = useRef(false)
  const didBoot = useRef(false)

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
      try {
        // Load from disk first so we can render immediately.
        await hydrate()
      } finally {
        setInitialized()
        setAppReady(true)
      }
      // Kick off a refresh in the background (may hit the network).
      void refresh({ reason: 'foreground' })
    }
    if (!initialized && !didBoot.current) {
      didBoot.current = true
      boot()
    }
  }, [hydrate, initialized, setInitialized, refresh])

  const onLayoutRootView = useCallback(() => {
    rootViewLaidOut.current = true
    if (appReady) {
      void SplashScreen.hideAsync()
    }
  }, [appReady])

  useEffect(() => {
    if (appReady && rootViewLaidOut.current) {
      void SplashScreen.hideAsync()
    }
  }, [appReady])

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
    if (!initialized) return
    if (pathname !== '/') return
    router.push('/(tabs)') // keeps sources underneath
  }, [initialized, pathname, router])

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <GestureHandlerRootView>
          <View
            style={{ flex: 1, backgroundColor: navigationTheme.colors.background }}
            onLayout={onLayoutRootView}
          >
            {appReady ? (
              <Stack initialRouteName="sources">
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="sources" options={{ headerShown: false }} />
                <Stack.Screen name="article/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen
                  name="share"
                  options={{ headerShown: false, presentation: 'modal' }}
                />
              </Stack>
            ) : null}
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
