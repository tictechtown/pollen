import { Article } from '@/types'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import { IconButton, Text } from 'react-native-paper'
import { MD3Colors } from 'react-native-paper/lib/typescript/types'

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
  colors,
}: {
  article: Article
  onOpen: () => void
  onToggleSaved: () => void
  onToggleSeen: () => void
  colors: MD3Colors
}) => (
  <Pressable
    style={{ flex: 1, gap: 4, marginBottom: 8, opacity: article.seen ? 0.5 : 1 }}
    onPress={onOpen}
  >
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Text
        variant="labelSmall"
        style={{ color: colors.onSurfaceVariant }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {article.source.slice(0, 50)}
      </Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <View style={{ flex: 2 }}>
        <Text variant="titleMedium" style={styles.title} numberOfLines={3}>
          {article.title}
        </Text>
      </View>
      {!!article.thumbnail && (
        <View style={{ flex: 1 }}>
          <Image source={{ uri: article.thumbnail }} style={styles.image} />
        </View>
      )}
    </View>
    <View
      style={{
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'space-between',
        gap: 32,
        alignItems: 'center',
      }}
    >
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
        {relativeTime(article.updatedAt ?? article.publishedAt)}
      </Text>
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
  </Pressable>
)

const styles = StyleSheet.create({
  title: {
    lineHeight: 20,
  },
  image: {
    height: 90,
    borderRadius: 16,
  },
})

export default FeedItem
