import { useArticlesStore } from '@/store/articles'
import { Article } from '@/types'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { memo, useCallback, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import { Icon, Text } from 'react-native-paper'
import { MD3Colors } from 'react-native-paper/lib/typescript/types'
import Reanimated, {
  clamp,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated'

import {
  getSwipeIconTranslateX,
  SWIPE_ACTION_ICON_SIZE,
  SWIPE_ACTION_MAX_WIDTH,
  SWIPE_ACTION_TRIGGER_THRESHOLD,
} from '@/components/ui/swipeActionUtils'
import { formatRelativeTime } from '@/services/time'

type SwipeActionProps = {
  dragX: SharedValue<number>
  backgroundColor: string
  iconColor: string
  icon: string
  isLeft?: boolean
}

const SWIPE_ACTION_BACKGROUND_COLOR = '#6dd58c'

const SwipeAction = ({
  dragX,
  backgroundColor,
  iconColor,
  icon,
  isLeft = false,
}: SwipeActionProps) => {
  const triggerHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const actionWidth = useDerivedValue(
    () => clamp(isLeft ? dragX.value : -dragX.value, 0, SWIPE_ACTION_MAX_WIDTH),
    [isLeft],
  )

  const styleAnimation = useAnimatedStyle(() => ({
    width: actionWidth.value,
  }))
  const opacityAnimation = useAnimatedStyle(() => ({
    opacity: clamp(actionWidth.value - SWIPE_ACTION_TRIGGER_THRESHOLD / 4, 0, 1),
  }))
  const iconTranslateAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: getSwipeIconTranslateX(actionWidth.value, isLeft) }],
  }))

  useAnimatedReaction(
    () => actionWidth.value >= SWIPE_ACTION_TRIGGER_THRESHOLD,
    (isTriggered, wasTriggered) => {
      if (isTriggered && !wasTriggered) {
        runOnJS(triggerHaptic)()
      }
    },
    [isLeft],
  )

  return (
    <View style={[styles.swipeActionContainer, { alignItems: isLeft ? 'flex-start' : 'flex-end' }]}>
      <Reanimated.View style={[styles.swipeAction, { backgroundColor }, styleAnimation]}>
        <Reanimated.View style={[opacityAnimation, iconTranslateAnimation]}>
          <Icon source={icon} color={iconColor} size={SWIPE_ACTION_ICON_SIZE} />
        </Reanimated.View>
      </Reanimated.View>
    </View>
  )
}

const FeedListItem = ({
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

  const opacity = read ? 0.5 : 1

  return (
    <Swipeable
      ref={reanimatedRef}
      rightThreshold={SWIPE_ACTION_TRIGGER_THRESHOLD}
      leftThreshold={SWIPE_ACTION_TRIGGER_THRESHOLD}
      friction={1.5}
      renderLeftActions={(_, dragX) => (
        <SwipeAction
          dragX={dragX}
          backgroundColor={SWIPE_ACTION_BACKGROUND_COLOR}
          iconColor={colors.scrim}
          icon={read ? 'circle-outline' : 'check-circle-outline'}
          isLeft
        />
      )}
      renderRightActions={(_, dragX) => (
        <SwipeAction
          dragX={dragX}
          backgroundColor={SWIPE_ACTION_BACKGROUND_COLOR}
          iconColor={colors.scrim}
          icon={saved ? 'bookmark-minus-outline' : 'bookmark-check-outline'}
        />
      )}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') {
          onToggleSaved()
        } else {
          onToggleRead()
        }
        reanimatedRef.current?.close()
      }}
    >
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.surfaceVariant : colors.surface,
          opacity: pressed ? 0.8 : 1,
          flex: 1,
          gap: 4,
          paddingBlock: 6,
          marginBlock: 6,
          paddingHorizontal: 12,
          marginHorizontal: 4,
          borderRadius: 20,
          minHeight: 90,
        })}
        onPress={onOpen}
      >
        <View
          style={{
            flexDirection: 'row',
            flex: 1,
            justifyContent: 'space-between',
            gap: 32,
            alignItems: 'center',
          }}
        >
          {/* Feed name */}
          <Text
            variant="labelMedium"
            style={{ color: read ? colors.onSurfaceDisabled : colors.tertiary }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {article.source.slice(0, 50)}
          </Text>
          {/* Relative time */}
          <Text
            variant="labelMedium"
            style={{ color: read ? colors.onSurfaceDisabled : colors.onSurfaceVariant }}
          >
            {formatRelativeTime(article.updatedAt ?? article.publishedAt)}
          </Text>
        </View>

        <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 10, gap: 4 }}>
            {/* Article title */}
            <Text
              variant="titleMedium"
              style={[styles.title, { color: read ? colors.onSurfaceDisabled : colors.onSurface }]}
              numberOfLines={2}
            >
              {article.title.trimStart()}
            </Text>
            {/* Article description */}
            {!!article.description && (
              <Text
                variant="bodySmall"
                // If title has a short title, we add an extra line of description, so we always have title + description = 4 lines
                numberOfLines={article.title.length < 35 ? 3 : 2}
                style={{ color: read ? colors.onSurfaceDisabled : colors.onSurfaceVariant }}
              >
                {article.description.trimStart()}
              </Text>
            )}
          </View>
          {!!article.thumbnail && (
            <View style={{ flex: 4 }}>
              <Image
                source={{ uri: article.thumbnail }}
                style={[styles.image, { opacity }]}
                contentFit="cover"
              />
            </View>
          )}
        </View>
      </Pressable>
    </Swipeable>
  )
}

const styles = StyleSheet.create({
  title: {
    lineHeight: 20,
  },
  image: {
    height: 76,
    borderRadius: 16,
  },
  swipeAction: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    height: '100%',
  },
  swipeActionContainer: {
    width: SWIPE_ACTION_MAX_WIDTH,
  },
})

export default memo(FeedListItem)
