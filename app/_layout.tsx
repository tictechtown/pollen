import { ThemeProvider } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { PaperProvider } from 'react-native-paper'
import 'react-native-reanimated'

import { getNavigationTheme, getPaperTheme } from '@/constants/paperTheme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const paperTheme = getPaperTheme(colorScheme ?? null)
  const navigationTheme = getNavigationTheme(colorScheme ?? null)

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <GestureHandlerRootView>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="article/[id]"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
            <Stack.Screen name="sources" options={{ headerShown: false, presentation: 'card' }} />
          </Stack>
        </GestureHandlerRootView>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  )
}
