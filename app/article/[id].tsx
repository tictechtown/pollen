import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Appbar, Snackbar, useTheme } from 'react-native-paper'
import { WebView } from 'react-native-webview'

import { setArticleSaved } from '@/services/articles-db'
import { fetchAndExtractReader, ReaderExtractionResult } from '@/services/reader'
import { useArticlesStore } from '@/store/articles'
import { useSeenStore } from '@/store/seen'

export default function ArticleScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const article = useArticlesStore((state) => state.articles.find((a) => a.id === id))
  const updateSavedLocal = useArticlesStore((state) => state.updateSavedLocal)
  const markSeen = useSeenStore((state) => state.markSeen)
  const isSeen = useSeenStore((state) => state.isSeen)
  const { colors } = useTheme()
  const [mode, setMode] = useState<'rss' | 'reader' | 'original'>('rss')
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [reader, setReader] = useState<ReaderExtractionResult>({ status: 'idle' })

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
    const hero = article?.thumbnail
      ? `<img class="hero" src="${article.thumbnail}" alt="thumbnail" />`
      : ''

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: -apple-system, Roboto, sans-serif; padding: 16px; padding-top:0; padding-bottom: 64px; line-height: 1.6; background: ${
              colors.surface
            }; color: ${colors.onSurface}; }
            figure { width: 100%; margin:0; padding:0 }
            figcaption {font-style: italic; line-height: 1.2; margin-top: 4px}
            img { max-width: 100%; height: auto; border-radius: 12px; }
            h1, h2, h3, h4 { line-height: 1.2; }
            a { color: ${colors.primary}; text-decoration: none; }
            a:hover { text-decoration: underline; }
            blockquote { border-left: 3px solid ${
              colors.outlineVariant
            }; padding-left: 12px; margin-left: 0; color: ${colors.onSurface}; opacity: 0.8; }
            .hero { width: 100%; height: auto; border-radius: 16px; margin-bottom: 12px; }
            .meta { color: ${
              colors.onSurface
            }; opacity: 0.7; margin-top: 12px; margin-bottom: 4px; }
            .title { font-size: 24px; font-weight: 700; margin-block: 4px; line-height:1.2; }
            .source { color: ${colors.onSurface}; opacity: 0.7; margin-bottom: 12px; }
            .divider { height: 1px; background: ${colors.outlineVariant}; margin: 16px 0; }
          </style>
        </head>
        <body>
          ${hero}
          <div class="meta">${displayDate}</div>
          <div class="title">${article?.title ?? 'Loading article'}</div>
          <div class="source">${article?.source ?? ''}</div>
          <div class="divider"></div>
          ${body}
        </body>
      </html>
    `
  }, [article, colors, displayDate])

  const readerHtml = useMemo(() => {
    if (reader.status !== 'ok' || !reader.html) return null

    const hero = article?.thumbnail
      ? `<img class="hero" src="${article.thumbnail}" alt="thumbnail" />`
      : ''

    console.log(`${reader.html}`)

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { padding: 16px; padding-top:0; padding-bottom: 64px; font-family: -apple-system, Roboto, sans-serif; line-height: 1.6; background: ${
              colors.surface
            }; color: ${colors.onSurface}; }
            figure { width: 100%; margin:0; padding:0 }
            figcaption {font-style: italic; line-height: 1.2; margin-top: 4px}
            img { max-width: 100%; height: auto; border-radius: 12px; }
            h1, h2, h3, h4 { line-height: 1.2; }
            a { color: ${colors.primary}; text-decoration: none; }
            a:hover { text-decoration: underline; }
            figure { margin: 0 0 16px 0; }
            article > header { border-radius: 12px; background: ${
              colors.surfaceVariant
            }; padding: 12px}
            blockquote { border-left: 3px solid ${
              colors.outlineVariant
            }; padding-left: 12px; margin-left: 0; color: ${colors.onSurface}; opacity: 0.8; }
            .hero { width: 100%; height: auto; border-radius: 16px; margin-bottom: 12px; }
            .meta { color: ${
              colors.onSurface
            }; opacity: 0.7; margin-top: 12px; margin-bottom: 4px; }
            .title { font-size: 24px; font-weight: 700; margin-block: 4px; line-height:1.2; }
            .divider { height: 1px; background: ${colors.outlineVariant}; margin: 16px 0; }
            li[":empty"] { display: none; }
          </style>
        </head>
        <body>
          ${hero}
          <div class="meta">${displayDate}</div>
          <div class="title">${reader.title ?? article?.title ?? ''}</div>
          <div class="source">${article?.source ?? ''}</div>
          <div class="divider"></div>
          ${reader.html}
        </body>
      </html>
    `
  }, [article, colors, displayDate, reader])

  useEffect(() => {
    if (id && !isSeen(id)) {
      markSeen(id, true)
    }
  }, [id, isSeen, markSeen])

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
    setSnackbar('Loading reader mode...')
    const result = await fetchAndExtractReader(article.link)
    setReader(result)
    if (result.status === 'ok') {
      setSnackbar('Reader mode ready')
    } else {
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

  const originalIconName = mode === 'original' ? 'earth-box' : 'earth'

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content />
        <Appbar.Action
          icon={({ size, color }) => (
            <MaterialCommunityIcons name={originalIconName as any} size={size} color={color} />
          )}
          accessibilityLabel="Open original"
          onPress={() => {
            setMode('original')
            setSnackbar('Original page')
          }}
          animated
        />
        <Appbar.Action
          icon={({ size, color }) => (
            <MaterialIcons
              name="description"
              size={size}
              color={mode === 'rss' ? colors.primary : color}
            />
          )}
          accessibilityLabel={mode === 'rss' ? 'Reader mode' : 'Show RSS content'}
          onPress={() => {
            if (mode === 'rss') {
              handleLoadReader()
            } else {
              setMode('rss')
              setSnackbar('RSS content')
            }
          }}
          disabled={reader.status === 'pending'}
          animated
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
