import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native'
import { MD3DarkTheme, MD3LightTheme, MD3Theme, adaptNavigationTheme } from 'react-native-paper'

export const getPaperTheme = (scheme: 'light' | 'dark' | null, theme: any): MD3Theme =>
  scheme === 'dark'
    ? { ...MD3DarkTheme, colors: theme.dark }
    : { ...MD3LightTheme, colors: theme.light }

export const getNavigationTheme = (
  scheme: 'light' | 'dark' | null,
  paperTheme: MD3Theme,
): NavigationTheme => {
  const { LightTheme: NavigationLight, DarkTheme: NavigationDark } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
    materialLight: paperTheme,
    materialDark: paperTheme,
  })
  return scheme === 'dark' ? NavigationDark : NavigationLight
}
