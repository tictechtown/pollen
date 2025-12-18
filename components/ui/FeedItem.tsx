import { Article } from '@/types'
import { Image, Pressable, View } from 'react-native'
import { IconButton, Text } from 'react-native-paper'

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

const FeedItem = ({
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
  <Pressable
    style={{ flex: 1, gap: 16, marginTop: 8, marginBottom: 12, opacity: article.seen ? 0.5 : 1 }}
    onPress={onOpen}
  >
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <View style={{ flex: 2 }}>
        <Text variant="titleMedium" numberOfLines={3}>
          {article.title}
        </Text>
      </View>
      {!!article.thumbnail && (
        <View style={{ flex: 1 }}>
          <Image source={{ uri: article.thumbnail }} style={{ height: 90, borderRadius: 16 }} />
        </View>
      )}
    </View>
    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 32 }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="labelSmall" numberOfLines={1} ellipsizeMode="tail">
          {article.source.slice(0, 50)}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        <Text variant="labelSmall">{relativeTime(article.updatedAt ?? article.publishedAt)}</Text>
        <View style={{ flex: 0, flexDirection: 'row', alignItems: 'center', gap: 0 }}>
          <IconButton
            size={16}
            icon="share-variant-outline"
            style={{ margin: 0 }}
            onPress={() => {
              /** TODO, should share the article */
            }}
          />
          <IconButton
            size={16}
            style={{ margin: 0 }}
            icon={article.saved ? 'bookmark' : 'bookmark-outline'}
            onPress={onToggleSaved}
          />
        </View>
      </View>
    </View>
  </Pressable>
)

/**
 *   <Card style={[styles.card, article.seen && styles.cardSeen]} onPress={onOpen}>
    <Card.Title
      title={article.title}
      titleNumberOfLines={article.description ? 2 : 3}
      subtitle={article.description}
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
    <Card.Content>
      <Text variant="bodyMedium" numberOfLines={1}>
        {`${article.source} · ${}`}
      </Text>
    </Card.Content>

    <Card.Actions>
      <Button icon={article.saved ? 'bookmark-remove' : 'bookmark-outline'} onPress={onToggleSaved}>
        {article.saved ? 'Unsave' : 'Save for later'}
      </Button>
      <Button icon={article.seen ? 'eye-off-outline' : 'eye-outline'} onPress={onToggleSeen}>
        {article.seen ? 'Mark unseen' : 'Mark seen'}
      </Button>
    </Card.Actions>
  </Card>

 */

export default FeedItem
