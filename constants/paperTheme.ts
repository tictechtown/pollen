import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { MD3DarkTheme, MD3LightTheme, MD3Theme, adaptNavigationTheme } from 'react-native-paper';

const { LightTheme: NavigationLight, DarkTheme: NavigationDark } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

export const getPaperTheme = (scheme: 'light' | 'dark' | null): MD3Theme =>
  scheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

export const getNavigationTheme = (scheme: 'light' | 'dark' | null): NavigationTheme =>
  scheme === 'dark' ? NavigationDark : NavigationLight;
