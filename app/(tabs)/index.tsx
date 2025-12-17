import { useRouter } from 'expo-router'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { Appbar, Avatar, Badge, Banner, Button, Card, Chip, Text } from 'react-native-paper'

import { useArticles } from '@/hooks/useArticles'
import { Article } from '@/types'

const relativeTime = (date?: string) => {
  if (!date) return 'Just now'
  const diffMs = Date.now() - new Date(date).getTime()
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const ArticleCard = ({
  article,
  onOpen,
  onToggleSaved,
  onToggleSeen,
}: {
  article: Article
  onOpen: () => void
  onToggleSaved: () => void
  onToggleSeen: () => void
}) => (
  <Card style={[styles.card, article.seen && styles.cardSeen]} onPress={onOpen}>
    <Card.Title
      title={article.title}
      titleNumberOfLines={2}
      subtitle={`${article.source} · ${relativeTime(article.updatedAt ?? article.publishedAt)}`}
      left={(props) =>
        article.thumbnail ? (
          <Avatar.Image {...props} source={{ uri: article.thumbnail }} />
        ) : (
          <Avatar.Icon {...props} icon="rss" />
        )
      }
      right={() =>
        article.saved ? (
          <Badge style={styles.badge} size={24}>
            Saved
          </Badge>
        ) : null
      }
    />
    {article.description ? (
      <Card.Content>
        <Text variant="bodyMedium" numberOfLines={2}>
          {article.description}
        </Text>
      </Card.Content>
    ) : null}
    <Card.Actions>
      <Button icon={article.saved ? 'bookmark-remove' : 'bookmark-outline'} onPress={onToggleSaved}>
        {article.saved ? 'Unsave' : 'Save for later'}
      </Button>
      <Button icon={article.seen ? 'eye-off-outline' : 'eye-outline'} onPress={onToggleSeen}>
        {article.seen ? 'Mark unseen' : 'Mark seen'}
      </Button>
    </Card.Actions>
  </Card>
)

export default function FeedScreen() {
  const router = useRouter()
  const { articles, loading, refresh, toggleSaved, toggleSeen, error } = useArticles()

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.Content title="Newsfeed" subtitle="The Verge RSS" />
        <Appbar.Action icon="refresh" onPress={() => refresh()} />
      </Appbar.Header>

      <View style={styles.filters}>
        <Chip icon="rss">Sources</Chip>
        <Chip icon="eye-outline">Seen</Chip>
        <Chip icon="bookmark">Saved</Chip>
      </View>

      {error ? (
        <Banner visible icon="alert-circle" actions={[{ label: 'Retry', onPress: refresh }]}>
          {error}
        </Banner>
      ) : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={articles}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onOpen={() => {
              console.log('opening', `/article/${item.id}`)
              router.push(`/article/${item.id}`)
            }}
            onToggleSaved={() => toggleSaved(item.id)}
            onToggleSeen={() => toggleSeen(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">No articles yet. Pull to refresh.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    overflow: 'hidden',
  },
  cardSeen: {
    opacity: 0.7,
  },
  badge: {
    marginRight: 8,
    alignSelf: 'center',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
})
