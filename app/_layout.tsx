import { ThemeProvider } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { AppState, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { PaperProvider, Snackbar } from 'react-native-paper'
import 'react-native-reanimated'

import { getNavigationTheme, getPaperTheme } from '@/constants/paperTheme'
import { consumeBackgroundMarker, registerBackgroundRefresh } from '@/services/background-refresh'
import { parseSharedUrl } from '@/services/share-intent'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const paperTheme = getPaperTheme(colorScheme ?? null)
  const navigationTheme = getNavigationTheme(colorScheme ?? null)
  const [newArticlesCount, setNewArticlesCount] = useState(0)
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const lastSharedUrl = useRef<string | null>(null)

  useEffect(() => {
    registerBackgroundRefresh().catch((err) => console.warn('Background refresh registration failed', err))

    const checkMarker = async () => {
      const marker = await consumeBackgroundMarker()
      if (marker?.count) {
        setNewArticlesCount(marker.count)
        setSnackbarVisible(true)
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
    const handleShareIntent = (url?: string | null) => {
      const shared = parseSharedUrl(url ?? '')
      if (shared && shared !== lastSharedUrl.current) {
        lastSharedUrl.current = shared
        setTimeout(() => {
          lastSharedUrl.current = null
        }, 1000)
        router.push({ pathname: '/share', params: { url: encodeURIComponent(shared) } })
      }
    }

    Linking.getInitialURL().then((url) => handleShareIntent(url))
    const sub = Linking.addEventListener('url', ({ url }) => handleShareIntent(url))
    return () => sub.remove()
  }, [router])

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <GestureHandlerRootView>
          <View style={{ flex: 1, backgroundColor: navigationTheme.colors.background }}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="article/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="sources" options={{ headerShown: false, presentation: 'card' }} />
              <Stack.Screen name="share" options={{ headerShown: false, presentation: 'modal' }} />
            </Stack>
            <Snackbar
              visible={snackbarVisible}
              duration={3000}
              onDismiss={() => setSnackbarVisible(false)}
              action={{ label: 'OK', onPress: () => setSnackbarVisible(false) }}
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
