import { MaterialIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Appbar, Snackbar, useTheme } from 'react-native-paper'
import { WebView } from 'react-native-webview'

import { setArticleSaved } from '@/services/articles-db'
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
  const [mode, setMode] = useState<'reader' | 'original'>('reader')
  const [snackbar, setSnackbar] = useState<string | null>(null)

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

  const htmlContent = useMemo(() => {
    const body =
      article?.content ??
      article?.description ??
      'This stub simulates the HTML-rendered body. Swap in `react-native-render-html` or a WebView to render the parsed RSS description and content nodes.'
    const hero = article?.thumbnail
      ? `<img class="hero" src="${article.thumbnail}" alt="thumbnail" />`
      : ''
    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: -apple-system, Roboto, sans-serif; padding: 16px; line-height: 1.6; background: ${
              colors.surface
            }; color: ${colors.onSurface}; }
            img { max-width: 100%; height: auto; border-radius: 12px; }
            h1, h2, h3, h4 { line-height: 1.2; }
            a { color: ${colors.primary}; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .hero { width: 100%; height: auto; border-radius: 16px; margin-bottom: 12px; }
            .meta { color: ${
              colors.onSurface
            }; opacity: 0.7; margin-top: 12px; margin-bottom: 4px; }
            .title { font-size: 24px; font-weight: 700; margin-top: 4px; margin-bottom: 4px; }
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
  }, [
    article?.content,
    article?.description,
    article?.source,
    article?.thumbnail,
    article?.title,
    colors.onSurface,
    colors.outlineVariant,
    colors.primary,
    colors.surface,
    displayDate,
  ])

  const hasReaderContent = Boolean(article?.content || article?.description)
  const resolvedMode = mode === 'reader' && !hasReaderContent ? 'original' : mode

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

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content />
        <Appbar.Action
          icon={({ size, color }) => (
            <MaterialIcons name="chrome-reader-mode" size={size} color={color} />
          )}
          accessibilityLabel="Reader mode"
          onPress={() => {
            setMode('reader')
            setSnackbar('Reader mode')
          }}
          animated
        />
        <Appbar.Action
          icon={({ size, color }) => <MaterialIcons name="language" size={size} color={color} />}
          accessibilityLabel="Open original"
          onPress={() => {
            setMode('original')
            setSnackbar('Original page')
          }}
          animated
        />
        <Appbar.Action
          icon={article?.saved ? 'bookmark' : 'bookmark-outline'}
          onPress={handleToggleSaved}
        />
      </Appbar.Header>

      <WebView
        originWhitelist={['*']}
        source={
          resolvedMode === 'reader'
            ? { html: htmlContent }
            : { uri: article?.link ?? 'about:blank' }
        }
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
  hero: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 12,
  },
})
