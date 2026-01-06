import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Appbar, Snackbar, useTheme } from 'react-native-paper'
import { WebView, WebViewNavigation } from 'react-native-webview'

import { buildArticleHtml } from '@/services/article-html'
import { readerApi } from '@/services/reader-api'
import { fetchAndExtractReader, ReaderExtractionResult } from '@/services/reader'
import { shouldOpenExternally } from '@/services/webview-navigation'
import { useArticle } from '@/hooks/useArticle'
import { useArticlesStore } from '@/store/articles'

export default function ArticleScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const updateSavedLocal = useArticlesStore((state) => state.updateSavedLocal)
  const updateReadLocal = useArticlesStore((state) => state.updateReadLocal)
  const invalidate = useArticlesStore((state) => state.invalidate)
  const { article } = useArticle(id)
  const { colors } = useTheme()
  const [mode, setMode] = useState<'rss' | 'reader' | 'original'>('rss')
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [reader, setReader] = useState<ReaderExtractionResult>({ status: 'idle' })
  const lastMissingLinkId = useRef<string | null>(null)
  const webViewRef = useRef<WebView>(null)
  const initialNavigationUrl = useRef<string | null>(null)
  const lastOpenedUrl = useRef<string | null>(null)

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

    return buildArticleHtml({ article: article ?? undefined, colors, displayDate, title: article?.title, body })
  }, [article, colors, displayDate])

  const readerHtml = useMemo(() => {
    if (reader.status !== 'ok' || !reader.html) return null

    return buildArticleHtml({
      article: article ?? undefined,
      colors,
      displayDate,
      title: reader.title ?? article?.title,
      body: reader.html,
    })
  }, [article, colors, displayDate, reader])

  useEffect(() => {
    if (id && article && !article.read) {
      void readerApi.articles.setRead(id, true)
      updateReadLocal(id, true)
      invalidate()
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

  const handleToggleSaved = async () => {
    if (!id || !article) return
    const next = !article.saved
    await readerApi.articles.setSaved(id, next)
    updateSavedLocal(id, next)
    invalidate()
  }

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

  const resolvedSource =
    mode === 'reader'
      ? readerHtml
        ? { html: readerHtml }
        : { html: rssHtml }
      : mode === 'original'
      ? { uri: article?.link ?? 'about:blank' }
      : { html: rssHtml }

  const originalIconName: ComponentProps<typeof MaterialCommunityIcons>['name'] =
    mode === 'original' ? 'earth-box' : 'earth'

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

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="" />
        <Appbar.Action
          icon={({ size, color }) => (
            <MaterialCommunityIcons name={originalIconName} size={size} color={color} />
          )}
          accessibilityLabel="Open original"
          onPress={() => {
            setMode('original')
          }}
          animated={false}
        />
        <Appbar.Action
          icon={ReaderIcon}
          accessibilityLabel={mode === 'rss' ? 'Reader mode' : 'Show RSS content'}
          onPress={() => {
            if (mode === 'rss') {
              handleLoadReader()
            } else {
              setMode('rss')
            }
          }}
          disabled={reader.status === 'pending'}
        />
        <Appbar.Action
          icon={article?.saved ? 'bookmark' : 'bookmark-outline'}
          onPress={handleToggleSaved}
        />
      </Appbar.Header>

      <WebView
        originWhitelist={['*']}
        source={resolvedSource}
        style={{ backgroundColor: colors.surface }}
        ref={webViewRef}
        onNavigationStateChange={handleNavigationStateChange}
      />

      <Snackbar
        visible={Boolean(snackbar)}
        onDismiss={() => setSnackbar(null)}
        duration={1500}
        action={{ label: 'OK', onPress: () => setSnackbar(null) }}
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
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    marginTop: 4,
    marginBottom: 4,
  },
  webviewContainer: {
    flex: 1,
    height: 400,
  },
})
