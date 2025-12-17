import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Appbar, Button, useTheme } from 'react-native-paper';

import { useArticlesStore } from '@/store/articles';

export default function ArticleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = useArticlesStore((state) => state.articles.find((a) => a.id === id));
  const toggleSaved = useArticlesStore((state) => state.toggleSaved);
  const toggleSeen = useArticlesStore((state) => state.toggleSeen);
  const { colors } = useTheme();

  const htmlContent = useMemo(() => {
    const body =
      article?.content ??
      article?.description ??
      'This stub simulates the HTML-rendered body. Swap in `react-native-render-html` or a WebView to render the parsed RSS description and content nodes.';
    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: -apple-system, Roboto, sans-serif; padding: 16px; line-height: 1.6; background: ${colors.surface}; color: ${colors.onSurface}; }
            img { max-width: 100%; height: auto; border-radius: 12px; }
            h1, h2, h3, h4 { line-height: 1.2; }
            a { color: ${colors.primary}; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .title { font-size: 24px; font-weight: 700; margin: 8px 0; }
            .meta { color: ${colors.onSurfaceVariant}; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="title">${article?.title ?? 'Loading article'}</div>
          <div class="meta">${article?.source ?? ''} · ${
            article?.publishedAt ?? article?.updatedAt ?? 'Just now'
          }</div>
          ${body}
        </body>
      </html>
    `;
  }, [
    article?.content,
    article?.description,
    article?.publishedAt,
    article?.source,
    article?.title,
    article?.updatedAt,
    colors.onSurface,
    colors.primary,
    colors.surface,
    colors.onSurfaceVariant,
  ]);

  useEffect(() => {
    if (id) {
      toggleSeen(id);
    }
  }, [id, toggleSeen]);

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={article?.title ?? 'Article'}
          subtitle={article?.source ?? 'Rendered from RSS content'}
        />
        <Appbar.Action
          icon={article?.saved ? 'bookmark' : 'bookmark-outline'}
          onPress={() => (id ? toggleSaved(id) : undefined)}
        />
      </Appbar.Header>

      <View style={styles.webviewContainer}>
        <WebView originWhitelist={['*']} source={{ html: htmlContent }} />
      </View>

      <Button
        mode="contained"
        icon="web"
        style={styles.cta}
        onPress={() => {
          if (article?.link) {
            // WebBrowser could be added later; for now placeholder.
          }
        }}>
        Open original
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    marginBottom: 8,
  },
  title: {
    marginTop: 12,
    marginBottom: 4,
  },
  meta: {
    marginBottom: 12,
  },
  cta: {
    alignSelf: 'center',
    width: '100%',
    marginTop: 12,
  },
  webviewContainer: {
    flex: 1,
    minHeight: 300,
    overflow: 'hidden',
  },
});
