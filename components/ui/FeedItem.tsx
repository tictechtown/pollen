import { useArticlesStore } from '@/store/articles'
import { Article } from '@/types'
import { useRef } from 'react'
import { Image, Pressable, Share, StyleSheet, View } from 'react-native'
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import { IconButton, Text } from 'react-native-paper'
import { MD3Colors } from 'react-native-paper/lib/typescript/types'
import Reanimated, { clamp, SharedValue, useAnimatedStyle } from 'react-native-reanimated'

import { formatRelativeTime } from '@/services/time'

type SwipeActionProps = {
  dragX: SharedValue<number>
  backgroundColor: string
  iconColor: string
  icon: string
  isLeft?: boolean
}

const SwipeAction = ({
  dragX,
  backgroundColor,
  iconColor,
  icon,
  isLeft = false,
}: SwipeActionProps) => {
  const styleAnimation = useAnimatedStyle(() => ({
    width: clamp(isLeft ? dragX.value : -dragX.value, 0, 180),
  }))
  const opacityAnimation = useAnimatedStyle(() => ({
    opacity: clamp(Math.abs(dragX.value) - 25, 0, 1),
  }))

  return (
    <View style={[styles.swipeActionContainer, { alignItems: isLeft ? 'flex-start' : 'flex-end' }]}>
      <Reanimated.View style={[styles.swipeAction, { backgroundColor }, styleAnimation]}>
        <Reanimated.View style={opacityAnimation}>
          <IconButton icon={icon} iconColor={iconColor} size={20} />
        </Reanimated.View>
      </Reanimated.View>
    </View>
  )
}

const FeedItem = ({
  article,
  onOpen,
  onToggleSaved,
  onToggleRead,
  colors,
}: {
  article: Article
  onOpen: () => void
  onToggleSaved: () => void
  onToggleRead: () => void
  colors: MD3Colors
}) => {
  const reanimatedRef = useRef<SwipeableMethods>(null)

  const read = useArticlesStore((state) => state.localReadArticles.get(article.id)) ?? article.read
  const saved =
    useArticlesStore((state) => state.localSavedArticles.get(article.id)) ?? article.saved

  const opacity = read ? 0.7 : 1

  return (
    <View style={styles.wrapper}>
      <Swipeable
        ref={reanimatedRef}
        rightThreshold={60}
        leftThreshold={60}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
        renderLeftActions={(_, dragX) => (
          <SwipeAction
            dragX={dragX}
            backgroundColor={colors.secondaryContainer}
            iconColor={colors.onSecondaryContainer}
            icon={read ? 'circle-outline' : 'check-circle-outline'}
            isLeft
          />
        )}
        renderRightActions={(_, dragX) => (
          <SwipeAction
            dragX={dragX}
            backgroundColor={colors.secondaryContainer}
            iconColor={colors.onSecondaryContainer}
            icon={saved ? 'bookmark-outline' : 'bookmark'}
          />
        )}
        onSwipeableOpen={(direction) => {
          if (direction === 'left') {
            onToggleRead()
          } else {
            onToggleSaved()
          }
          reanimatedRef.current?.close()
        }}
      >
        <Pressable style={{ flex: 1, gap: 0, paddingHorizontal: 16 }} onPress={onOpen}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text
              variant="labelSmall"
              style={{ color: colors.onSurfaceVariant, opacity }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {article.source.slice(0, 50)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 2 }}>
              <Text variant="titleMedium" style={[styles.title, { opacity }]} numberOfLines={3}>
                {article.title}
              </Text>
              {!!article.description && (
                <Text variant="bodySmall" numberOfLines={2} style={{ opacity }}>
                  {article.description}
                </Text>
              )}
            </View>
            {!!article.thumbnail && (
              <View style={{ flex: 1 }}>
                <Image source={{ uri: article.thumbnail }} style={[styles.image, { opacity }]} />
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
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, opacity }}>
              {formatRelativeTime(article.updatedAt ?? article.publishedAt)}
            </Text>
            <View style={{ flex: 0, flexDirection: 'row', alignItems: 'center', gap: 0 }}>
              <IconButton
                size={16}
                icon="share-variant-outline"
                style={{ margin: 0 }}
                onPress={async () => {
                  await Share.share({
                    title: article.title,
                    message: article.link,
                    url: article.link,
                  })
                }}
              />
              <IconButton
                size={16}
                style={{ margin: 0 }}
                icon={saved ? 'bookmark' : 'bookmark-outline'}
                onPress={onToggleSaved}
              />
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  title: {
    lineHeight: 20,
    marginBottom: 2,
  },
  image: {
    height: 90,
    borderRadius: 16,
  },
  swipeAction: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    height: '100%',
  },
  swipeActionContainer: {
    width: 180,
  },
})

export default FeedItem
