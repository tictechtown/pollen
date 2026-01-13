import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  InteractionManager,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Share,
  StyleSheet,
  View,
} from 'react-native'
import { Appbar, Snackbar, Surface, useTheme } from 'react-native-paper'
import { WebView, WebViewNavigation } from 'react-native-webview'

import { useArticle } from '@/hooks/useArticle'
import { buildArticleHtml } from '@/services/article-html'
import { ArticleMode, toggleArticleMode } from '@/services/article-mode'
import { fetchAndExtractReader, ReaderExtractionResult } from '@/services/reader'
import { readerApi } from '@/services/reader-api'
import { buildEdgeGestureBlockerScript } from '@/services/webview-gestures'
import { shouldOpenExternally } from '@/services/webview-navigation'
import { useArticlesStore } from '@/store/articles'

const AnimatedSurface = Animated.createAnimatedComponent(Surface)
const EDGE_GESTURE_BLOCKER_SCRIPT = buildEdgeGestureBlockerScript()

export default function ArticleScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const updateSavedLocal = useArticlesStore((state) => state.updateSavedLocal)
  const updateReadLocal = useArticlesStore((state) => state.updateReadLocal)
  const invalidate = useArticlesStore((state) => state.invalidate)
  const { article } = useArticle(id)
  const { colors, fonts } = useTheme()
  const [mode, setMode] = useState<ArticleMode>('rss')
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [reader, setReader] = useState<ReaderExtractionResult>({ status: 'idle' })
  const [bottomBarVisible, setBottomBarVisible] = useState(true)
  const lastMissingLinkId = useRef<string | null>(null)
  const lastMarkedReadId = useRef<string | null>(null)
  const webViewRef = useRef<WebView>(null)
  const initialNavigationUrl = useRef<string | null>(null)
  const lastOpenedUrl = useRef<string | null>(null)
  const lastScrollY = useRef(0)
  const bottomBarVisibilityRef = useRef(true)
  const bottomBarAnim = useRef(new Animated.Value(0)).current

  const displayDate = useMemo(() => {
    const raw = article?.publishedAt ?? article?.updatedAt
    if (!raw) return 'Just now'
    try {
      const d = new Date(raw)
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return raw
    }
  }, [article?.publishedAt, article?.updatedAt])

  const rssHtml = useMemo(() => {
    const body =
      article?.content ??
      article?.description ??
      'No content available. Try switching to the original page or Reader mode.'

    return buildArticleHtml({
      article: article ?? undefined,
      colors,
      fonts,
      displayDate,
      title: article?.title,
      body,
    })
  }, [article, colors, fonts, displayDate])

  const readerHtml = useMemo(() => {
    if (reader.status !== 'ok' || !reader.html) return null

    return buildArticleHtml({
      article: article ?? undefined,
      colors,
      fonts,
      displayDate,
      title: reader.title ?? article?.title,
      body: reader.html,
    })
  }, [article, colors, fonts, displayDate, reader])

  useEffect(() => {
    if (!id || !article || article.read) return
    if (lastMarkedReadId.current === id) return
    lastMarkedReadId.current = id

    const task = InteractionManager.runAfterInteractions(() => {
      void readerApi.articles.setRead(id, true)
      updateReadLocal(id, true)
      // invalidate()
    })

    return () => {
      task.cancel()
    }
  }, [article, id, invalidate, updateReadLocal])

  useEffect(() => {
    if (!article || article.link) return
    if (lastMissingLinkId.current === article.id) return
    setSnackbar('No link available')
    lastMissingLinkId.current = article.id
  }, [article])

  useEffect(() => {
    initialNavigationUrl.current = null
    lastOpenedUrl.current = null
  }, [article?.id, mode])

  useEffect(() => {
    bottomBarVisibilityRef.current = bottomBarVisible
    Animated.spring(bottomBarAnim, {
      toValue: bottomBarVisible ? 0 : 1,
      damping: 22,
      stiffness: 700,
      mass: 0.8,
      useNativeDriver: true,
    }).start()
  }, [bottomBarAnim, bottomBarVisible])

  const handleToggleSaved = async () => {
    if (!id || !article) return
    const next = !article.saved
    await readerApi.articles.setSaved(id, next)
    updateSavedLocal(id, next)
    invalidate('local')
  }

  const handleShare = useCallback(async () => {
    if (!article?.link) return
    await Share.share({
      title: article.title,
      message: article.link,
      url: article.link,
    })
  }, [article?.link, article?.title])

  const handleLoadReader = useCallback(async () => {
    if (!article?.link) {
      setSnackbar('No link available')
      return
    }
    setMode('reader')
    setReader({ status: 'pending' })
    const result = await fetchAndExtractReader(article.link)
    setReader(result)
    if (result.status !== 'ok') {
      setSnackbar(result.error ?? 'Failed to load reader mode')
    }
  }, [article?.link])

  const handleToggleMode = useCallback(() => {
    const nextMode = toggleArticleMode(mode)
    if (nextMode === 'reader') {
      void handleLoadReader()
      return
    }
    setMode('rss')
  }, [handleLoadReader, mode])

  const resolvedSource =
    mode === 'reader' ? (readerHtml ? { html: readerHtml } : { html: rssHtml }) : { html: rssHtml }

  const ReaderIcon = useCallback(
    ({ size, color }: { size: number; color: string }) => (
      <MaterialIcons
        name="description"
        size={size}
        color={mode === 'rss' ? color : colors.primary}
      />
    ),
    [colors.primary, mode],
  )

  const handleNavigationStateChange = useCallback(async (navState: WebViewNavigation) => {
    if (!initialNavigationUrl.current) {
      initialNavigationUrl.current = navState.url
      return
    }

    if (
      !shouldOpenExternally({
        url: navState.url,
        initialUrl: initialNavigationUrl.current,
        lastOpenedUrl: lastOpenedUrl.current,
      })
    ) {
      return
    }

    lastOpenedUrl.current = navState.url
    webViewRef.current?.stopLoading()

    await WebBrowser.openBrowserAsync(navState.url)

    if (navState.canGoBack) {
      webViewRef.current?.goBack()
    }
  }, [])

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset?.y ?? 0
    const deltaY = offsetY - lastScrollY.current
    lastScrollY.current = offsetY
    if (Math.abs(deltaY) < 4) return
    if (deltaY > 0 && bottomBarVisibilityRef.current) {
      setBottomBarVisible(false)
    } else if (deltaY < 0 && !bottomBarVisibilityRef.current) {
      setBottomBarVisible(true)
    }
  }, [])

  const bottomBarAnimatedStyle = {
    opacity: bottomBarAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      {
        translateY: bottomBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }),
      },
    ],
  }

  if (!article) {
    return null
  }

  return (
    <View style={styles.container}>
      <Appbar.Header mode="small" elevated={false} style={{ backgroundColor: colors.scrim }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="" />
      </Appbar.Header>

      <WebView
        originWhitelist={['*']}
        source={resolvedSource}
        style={[styles.webView, { backgroundColor: colors.surface }]}
        ref={webViewRef}
        injectedJavaScriptBeforeContentLoaded={
          Platform.OS === 'android' ? EDGE_GESTURE_BLOCKER_SCRIPT : undefined
        }
        onNavigationStateChange={handleNavigationStateChange}
        pullToRefreshEnabled
        onRefresh={handleToggleMode}
        mediaPlaybackRequiresUserAction={false}
        // @ts-expect-error onScroll and handleScroll events are incompatible
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      <AnimatedSurface
        style={[
          styles.bottomBar,
          bottomBarAnimatedStyle,
          { backgroundColor: colors.elevation?.level1 ?? colors.surface },
        ]}
        elevation={2}
        pointerEvents={bottomBarVisible ? 'auto' : 'none'}
      >
        <Appbar.Action
          icon="share-variant-outline"
          accessibilityLabel="Share article"
          onPress={handleShare}
          disabled={!article?.link}
        />

        <Appbar.Action
          icon={({ size, color }) => (
            <MaterialCommunityIcons name="open-in-new" size={size} color={color} />
          )}
          accessibilityLabel="Open original"
          onPress={async () => {
            if (!article?.link) {
              setSnackbar('No link available')
              return
            }
            await WebBrowser.openBrowserAsync(article.link, { createTask: false })
          }}
          animated={false}
        />
        <Appbar.Action
          icon={ReaderIcon}
          accessibilityLabel={mode === 'rss' ? 'Reader mode' : 'Show RSS content'}
          onPress={handleToggleMode}
          disabled={reader.status === 'pending'}
        />
        <Appbar.Action
          icon={article?.saved ? 'bookmark' : 'bookmark-outline'}
          onPress={handleToggleSaved}
        />
      </AnimatedSurface>

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
  webView: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 44,
    height: 64,
    borderRadius: 64,
    paddingInline: 8,
    gap: 4,
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
})
