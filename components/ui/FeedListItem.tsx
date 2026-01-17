import { useArticlesStore } from '@/store/articles'
import { Article, ModernMD3Colors } from '@/types'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import { memo, useCallback, useRef, useState } from 'react'
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native'
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import { Icon, Menu, Text } from 'react-native-paper'
import Reanimated, {
  clamp,
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import {
  getSwipeIconTranslateX,
  SWIPE_ACTION_ICON_SIZE,
  SWIPE_ACTION_MAX_WIDTH,
  SWIPE_ACTION_TRIGGER_THRESHOLD,
} from '@/components/ui/swipeActionUtils'
import { formatRelativeTime } from '@/services/time'
import { getReadMenuLabel, getSavedMenuLabel } from './feedListItemMenu'
import { getRippleDiameter } from './rippleUtils'

type SwipeActionProps = {
  dragX: SharedValue<number>
  backgroundColor: string
  iconColor: string
  icon: string
  isLeft?: boolean
}

type FeedListItemProps = {
  article: Article
  onOpen: (id: string) => void
  onToggleSaved: (id: string, currentSaved: boolean) => void
  onToggleRead: (id: string, currentRead: boolean) => void
  colors: ModernMD3Colors
  readOnly?: boolean
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
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press)
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
  readOnly,
}: FeedListItemProps) => {
  const reanimatedRef = useRef<SwipeableMethods>(null)
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)
  const [pressableLayout, setPressableLayout] = useState({ width: 0, height: 0 })
  const [rippleLayout, setRippleLayout] = useState({ x: 0, y: 0, size: 0 })
  const longPressTriggeredRef = useRef(false)
  const rippleScale = useSharedValue(0)
  const rippleOpacity = useSharedValue(0)

  const read = useArticlesStore((state) => state.localReadArticles.get(article.id)) ?? article.read
  const saved =
    useArticlesStore((state) => state.localSavedArticles.get(article.id)) ?? article.saved

  const opacity = read && !readOnly ? 0.5 : 1
  const hasLink = Boolean(article.link)

  const handlePressableLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setPressableLayout((current) =>
      current.width === width && current.height === height ? current : { width, height },
    )
  }, [])

  const handlePressOut = useCallback(() => {
    if (longPressTriggeredRef.current) {
      rippleOpacity.value = withTiming(0, { duration: 450, easing: Easing.out(Easing.quad) })
    } else {
      rippleOpacity.value = 0.2
      rippleScale.value = 0
    }
  }, [rippleOpacity, rippleScale])

  const triggerLongPressRipple = useCallback(
    (event: GestureResponderEvent) => {
      const { width, height } = pressableLayout
      if (!width || !height) return
      const { locationX, locationY } = event.nativeEvent
      const size = getRippleDiameter({ width, height }, { x: locationX, y: locationY })
      setRippleLayout({ x: locationX - size / 2, y: locationY - size / 2, size })
      rippleScale.value = 0
      rippleOpacity.value = 0.2
      rippleScale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) })
      rippleOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) })
    },
    [pressableLayout, rippleOpacity, rippleScale],
  )

  const openMenu = useCallback(
    (event: GestureResponderEvent) => {
      longPressTriggeredRef.current = true
      triggerLongPressRipple(event)
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press)
      setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })
      setMenuVisible(true)
    },
    [triggerLongPressRipple],
  )

  const closeMenu = useCallback(() => {
    longPressTriggeredRef.current = false
    setMenuVisible(false)
    setMenuAnchor(null)
  }, [])

  const handlePress = useCallback(() => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    onOpen(article.id)
  }, [article.id, onOpen])

  const rippleAnimationStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }))

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'left') {
        onToggleSaved(article.id, saved)
      } else {
        onToggleRead(article.id, read)
      }
      reanimatedRef.current?.close()
    },
    [article.id, read, saved, onToggleSaved, onToggleRead, reanimatedRef],
  )

  return (
    <>
      <Swipeable
        ref={reanimatedRef}
        rightThreshold={SWIPE_ACTION_TRIGGER_THRESHOLD}
        leftThreshold={SWIPE_ACTION_TRIGGER_THRESHOLD}
        friction={1}
        dragOffsetFromLeftEdge={20}
        dragOffsetFromRightEdge={20}
        overshootFriction={8}
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
        onSwipeableOpen={handleSwipeOpen}
      >
        <Pressable
          onLayout={handlePressableLayout}
          style={{
            opacity: 1,
            flex: 1,
            gap: 4,
            paddingBlock: 6,
            marginBlock: 6,
            paddingHorizontal: 12,
            marginHorizontal: 4,
            borderRadius: 20,
            minHeight: 90,
            overflow: 'hidden',
          }}
          onPress={handlePress}
          onLongPress={openMenu}
          onPressOut={handlePressOut}
        >
          <Reanimated.View
            pointerEvents="none"
            style={[
              styles.longPressRipple,
              {
                left: rippleLayout.x,
                top: rippleLayout.y,
                width: rippleLayout.size,
                height: rippleLayout.size,
                borderRadius: rippleLayout.size / 2,
                backgroundColor: colors.surfaceVariant,
              },
              rippleAnimationStyle,
            ]}
          />
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
              style={{ color: read && !readOnly ? colors.onSurfaceDisabled : colors.tertiary }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {article.source.slice(0, 50)}
            </Text>
            {/* Relative time */}
            <Text
              variant="labelMedium"
              style={{
                borderWidth: 1,
                borderColor: colors.surfaceContainerLowest,
                color: read && !readOnly ? colors.onSurfaceDisabled : colors.onSurfaceVariant,
              }}
            >
              {formatRelativeTime(article.updatedAt ?? article.publishedAt)}
            </Text>
          </View>

          <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 10, gap: 4 }}>
              {/* Article title */}
              <Text
                variant="titleMedium"
                style={[
                  styles.title,
                  {
                    color: read && !readOnly ? colors.onSurfaceDisabled : colors.onSurfaceVariant,
                  },
                ]}
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
                  style={{
                    color: read && !readOnly ? colors.onSurfaceDisabled : colors.onSurfaceVariant,
                  }}
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
      <Menu visible={menuVisible} onDismiss={closeMenu} anchor={menuAnchor ?? { x: 0, y: 0 }}>
        <Menu.Item
          title={getReadMenuLabel(read)}
          onPress={() => {
            closeMenu()
            onToggleRead(article.id, read)
          }}
        />
        <Menu.Item
          title={getSavedMenuLabel(saved)}
          onPress={() => {
            closeMenu()
            onToggleSaved(article.id, saved)
          }}
        />
        <Menu.Item
          title="Go to original url"
          onPress={() => {
            closeMenu()
            if (!article.link) return
            void WebBrowser.openBrowserAsync(article.link, { createTask: false })
          }}
          disabled={!hasLink}
        />
        <Menu.Item
          title="Share"
          onPress={() => {
            closeMenu()
            if (!article.link) return
            void Share.share({
              title: article.title,
              message: article.link,
              url: article.link,
            })
          }}
          disabled={!hasLink}
        />
      </Menu>
    </>
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
    width: '100%',
  },
  longPressRipple: {
    position: 'absolute',
  },
})

export default memo(FeedListItem)
