// Swipeable feed picker row used inside sources lists.
import { useEffect, useRef, useState } from 'react'
import { Share, StyleSheet, View } from 'react-native'
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import { Avatar, Badge, IconButton, List, Menu, useTheme } from 'react-native-paper'
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'

import { Feed } from '@/types'

type SourceListItemProps = {
  item: Feed
  isAll: boolean
  isSelected: boolean
  isFirst: boolean
  isLast: boolean
  onSelect: (feed?: Feed) => void
  onRequestRemove: (feed: Feed) => void
  unreadCount?: number
  folderLabel?: string
  onRequestMove?: (feed: Feed) => void
  registerSwipeableRef?: (id: string, ref: SwipeableMethods | null) => void
}

type RightActionProps = {
  dragX: SharedValue<number>
  backgroundColor: string
  iconColor: string
}

const getDomainFromUrl = (url?: string) => {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const RightAction = ({ dragX, backgroundColor, iconColor }: RightActionProps) => {
  const styleAnimation = useAnimatedStyle(() => ({
    width: Math.max(0, -dragX.value),
  }))

  return (
    <View style={styles.deleteActionContainer}>
      <Reanimated.View style={[styles.deleteAction, { backgroundColor }, styleAnimation]}>
        <List.Icon color={iconColor} icon="delete" />
      </Reanimated.View>
    </View>
  )
}

export default function SourceListItem({
  item,
  isAll,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onRequestRemove,
  unreadCount,
  folderLabel,
  onRequestMove,
  registerSwipeableRef,
}: SourceListItemProps) {
  const { colors } = useTheme()
  const swipeableRef = useRef<SwipeableMethods | null>(null)
  const [menuVisible, setMenuVisible] = useState(false)
  const cornerRadius = isSelected ? 82 : 4
  const edgeRadius = isSelected ? 82 : 16
  const showUnreadBadge = typeof unreadCount === 'number' && unreadCount > 0
  const unreadLabel = unreadCount && unreadCount > 99 ? '99+' : String(unreadCount ?? 0)

  const containerStyle = [
    styles.segmentItem,
    {
      backgroundColor: isSelected ? colors.primaryContainer : colors.elevation.level1,
      borderTopLeftRadius: isFirst ? edgeRadius : cornerRadius,
      borderTopRightRadius: isFirst ? edgeRadius : cornerRadius,
      borderBottomLeftRadius: isLast ? edgeRadius : cornerRadius,
      borderBottomRightRadius: isLast ? edgeRadius : cornerRadius,
    },
  ]

  const content = (
    <View style={containerStyle}>
      <List.Item
        title={isAll ? 'All' : item.title || item.htmlUrl}
        description={
          isAll
            ? 'See every article'
            : `${getDomainFromUrl(item.xmlUrl)}${folderLabel ? ` • ${folderLabel}` : ''}`
        }
        titleNumberOfLines={1}
        descriptionNumberOfLines={1}
        left={(props) =>
          isAll ? (
            <List.Icon icon="folder" />
          ) : item.image ? (
            <Avatar.Image
              {...props}
              size={24}
              source={{ uri: item.image }}
              style={{ backgroundColor: 'white', alignSelf: 'center' }}
            />
          ) : (
            <List.Icon
              icon="rss"
              color="orange"
              style={{
                backgroundColor: 'white',
                height: 24,
                alignSelf: 'center',
                borderRadius: 24,
              }}
            />
          )
        }
        right={() =>
          showUnreadBadge || (!isAll && onRequestMove) ? (
            <View style={styles.rightContainer}>
              {showUnreadBadge ? (
                <Badge style={[styles.unreadBadge, isAll ? { marginRight: 16 } : undefined]}>
                  {unreadLabel}
                </Badge>
              ) : null}
              {!isAll ? (
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(() => false)}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      onPress={() => setMenuVisible(() => true)}
                      accessibilityLabel="Feed options"
                    />
                  }
                >
                  <Menu.Item
                    title="Move to Folder"
                    onPress={() => {
                      setMenuVisible(false)
                      onRequestMove?.(item)
                    }}
                    disabled={!onRequestMove}
                  />
                  <Menu.Item
                    title="Share"
                    onPress={async () => {
                      setMenuVisible(false)
                      if (!item.xmlUrl) return
                      await Share.share({
                        title: item.title ?? undefined,
                        message: item.xmlUrl,
                        url: item.xmlUrl,
                      })
                    }}
                    disabled={!item.xmlUrl}
                  />
                  <Menu.Item
                    title="Delete"
                    onPress={() => {
                      setMenuVisible(false)
                      onRequestRemove(item)
                    }}
                  />
                </Menu>
              ) : null}
            </View>
          ) : null
        }
        style={{ paddingRight: 0, marginLeft: 16 }}
        onPress={() => onSelect(isAll ? undefined : item)}
      />
    </View>
  )

  useEffect(() => {
    if (!registerSwipeableRef) return
    registerSwipeableRef(item.id, swipeableRef.current)
    return () => registerSwipeableRef(item.id, null)
  }, [item.id, registerSwipeableRef])

  if (isAll) {
    return <View style={styles.segmentItemWrapper}>{content}</View>
  }

  return (
    <View style={styles.segmentItemWrapper}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={(_, dragX) => (
          <RightAction
            dragX={dragX}
            backgroundColor={colors.errorContainer}
            iconColor={colors.onErrorContainer}
          />
        )}
        onSwipeableOpen={() => onRequestRemove(item)}
      >
        {content}
      </Swipeable>
    </View>
  )
}

const styles = StyleSheet.create({
  segmentItemWrapper: {
    marginBottom: 2,
  },
  segmentItem: {
    overflow: 'hidden',
    paddingLeft: 0,
    paddingRight: 0,
    marginHorizontal: 16,
  },
  deleteAction: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    height: '100%',
  },
  deleteActionContainer: {
    alignItems: 'flex-end',
    width: '100%',
    marginRight: 16,
  },
  rightContainer: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    alignSelf: 'center',
  },
})
