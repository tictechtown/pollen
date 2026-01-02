// Swipeable feed picker row used inside sources lists.
import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import { Avatar, IconButton, List, useTheme } from 'react-native-paper'
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
  folderLabel?: string
  onRequestMove?: (feed: Feed) => void
  registerSwipeableRef?: (id: string, ref: SwipeableMethods | null) => void
}

type RightActionProps = {
  dragX: SharedValue<number>
  backgroundColor: string
  iconColor: string
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
  folderLabel,
  onRequestMove,
  registerSwipeableRef,
}: SourceListItemProps) {
  const { colors } = useTheme()
  const swipeableRef = useRef<SwipeableMethods | null>(null)
  const cornerRadius = isSelected ? 36 : 4
  const edgeRadius = isSelected ? 36 : 16

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
          isAll ? 'See every article' : `${item.xmlUrl}${folderLabel ? ` • ${folderLabel}` : ''}`
        }
        titleNumberOfLines={1}
        descriptionNumberOfLines={1}
        left={(props) =>
          isAll ? (
            <List.Icon {...props} icon="folder" />
          ) : item.image ? (
            <Avatar.Image
              {...props}
              size={24}
              source={{ uri: item.image }}
              style={{ marginLeft: 12, backgroundColor: 'white', alignSelf: 'center' }}
            />
          ) : (
            <List.Icon {...props} icon="rss" color="orange" style={{ backgroundColor: 'white' }} />
          )
        }
        right={() =>
          !isAll && onRequestMove ? (
            <IconButton icon="folder-move" onPress={() => onRequestMove(item)} />
          ) : null
        }
        style={{ paddingRight: 0 }}
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
})
