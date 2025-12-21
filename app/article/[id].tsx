import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Appbar, Snackbar, useTheme } from 'react-native-paper'
import { WebView, WebViewNavigation } from 'react-native-webview'

import { setArticleRead, setArticleSaved } from '@/services/articles-db'
import { fetchAndExtractReader, ReaderExtractionResult } from '@/services/reader'
import { useArticlesStore } from '@/store/articles'
import { Article } from '@/types'
import { MD3Colors } from 'react-native-paper/lib/typescript/types'

const renderHTML = (
  article: Article | undefined,
  colors: MD3Colors,
  displayDate: string,
  title: string | undefined,
  body: string,
): string => {
  const hero = article?.thumbnail
    ? `<img class="hero" src="${article.thumbnail}" alt="thumbnail" />`
    : ''
  const headerInner = `
      <header class="article-header">
        ${hero}
        <div class="meta">${displayDate}</div>
        <div class="title">${title ?? ''}</div>
        <div class="source">${article?.source ?? ''}</div>
      </header>
    `
  const headerBlock = article?.link
    ? `<a class="header-link" href="${article.link}">${headerInner}</a>`
    : headerInner

  return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { padding: 16px; padding-top:0; padding-bottom: 64px; font-family: -apple-system, Roboto, sans-serif; line-height: 1.6; background: ${colors.surface}; color: ${colors.onSurface}; }
            figure { width: 100%; margin:0; padding:0 }
            figcaption {font-style: italic; line-height: 1.2; margin-top: 4px}
            img { max-width: 100%; height: auto; border-radius: 12px; }
            h1, h2, h3, h4 { line-height: 1.2; }
            a { color: ${colors.primary}; text-decoration: none; }
            a:hover { text-decoration: underline; }
            figure { margin: 0 0 16px 0; }
            .article-header { border-radius: 12px; background: ${colors.surfaceVariant}; padding: 12px}
            .header-link { color: inherit; text-decoration: none; display: block; }
            .header-link:hover { text-decoration: none; }
            .header-link:active { opacity: 0.6; }
            blockquote { border-left: 3px solid ${colors.outlineVariant}; padding-left: 12px; margin-left: 0; color: ${colors.onSurface}; opacity: 0.8; }
            pre { background-color: ${colors.surfaceVariant}; color: ${colors.onSurfaceVariant}; white-space: pre; border-radius: 16px; padding: 8px; padding-inline: 12px; overflow-x: auto }
            code {background-color: ${colors.surfaceVariant}; color: ${colors.onSurfaceVariant}}
            .hero { width: 100%; height: auto; border-radius: 16px; margin-bottom: 12px; }
            .meta { color: ${colors.onSurface}; opacity: 0.7; margin-top: 12px; margin-bottom: 4px; }
            .title { font-size: 24px; font-weight: 700; margin-block: 4px; line-height:1.2; }
            .source { color: ${colors.onSurface}; opacity: 0.7; margin-bottom: 12px; }
            .divider { height: 1px; background: ${colors.outlineVariant}; margin: 16px 0; }
            
            .pane { will-change: transform, opacity; }
            .enter {
              animation: enter-up 200ms cubic-bezier(0, 0, 0.2, 1) 100ms both;
            }
            @keyframes enter-up {
              from { opacity: 0; transform: translateY(20%); }
              to   { opacity: 1; transform: translateY(0); }
            }

          </style>
        </head>
        <body class="pane enter">
          ${headerBlock}
          <div class="divider"></div>
          ${body}
        </body>
      </html>
    `
}

export default function ArticleScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const article = useArticlesStore((state) => state.articles.find((a) => a.id === id))
  const updateSavedLocal = useArticlesStore((state) => state.updateSavedLocal)
  const updateSeenLocal = useArticlesStore((state) => state.updateSeenLocal)
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

    return renderHTML(article, colors, displayDate, article?.title, body)
  }, [article, colors, displayDate])

  const readerHtml = useMemo(() => {
    if (reader.status !== 'ok' || !reader.html) return null

    return renderHTML(article, colors, displayDate, reader.title ?? article?.title, reader.html)
  }, [article, colors, displayDate, reader])

  useEffect(() => {
    if (id && article && !article.seen) {
      void setArticleRead(id, true)
      updateSeenLocal(id, true)
    }
  }, [article, id, updateSeenLocal])

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
    await setArticleSaved(id, next)
    updateSavedLocal(id, next)
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
    }

    if (!navState.url.startsWith('http')) return
    if (navState.url === initialNavigationUrl.current) return
    if (navState.url === lastOpenedUrl.current) return

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
