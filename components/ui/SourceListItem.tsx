// Swipeable feed picker row used inside sources lists.
import { StyleSheet, View } from 'react-native'
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import { Avatar, List, useTheme } from 'react-native-paper'
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
  registerSwipeableRef,
}: SourceListItemProps) {
  const { colors } = useTheme()
  const cornerRadius = isSelected ? 16 : 4
  const edgeRadius = isSelected ? 22 : 16

  const containerStyle = [
    styles.segmentItem,
    {
      backgroundColor: isSelected ? colors.secondaryContainer : colors.elevation.level1,
      borderTopLeftRadius: isFirst ? edgeRadius : cornerRadius,
      borderTopRightRadius: isFirst ? edgeRadius : cornerRadius,
      borderBottomLeftRadius: isLast ? edgeRadius : cornerRadius,
      borderBottomRightRadius: isLast ? edgeRadius : cornerRadius,
    },
  ]

  const content = (
    <View style={containerStyle}>
      <List.Item
        title={isAll ? 'All' : item.title || item.url}
        description={isAll ? 'See every article' : item.url}
        titleNumberOfLines={1}
        descriptionNumberOfLines={1}
        left={(props) =>
          isAll ? (
            <List.Icon {...props} icon="folder" />
          ) : item.image ? (
            <Avatar.Image size={32} source={{ uri: item.image }} style={{ marginLeft: 12 }} />
          ) : (
            <Avatar.Icon size={32} icon="rss" style={{ marginLeft: 12 }} />
          )
        }
        onPress={() => onSelect(isAll ? undefined : item)}
      />
    </View>
  )

  if (isAll) {
    return <View style={styles.segmentItemWrapper}>{content}</View>
  }

  return (
    <View style={styles.segmentItemWrapper}>
      <Swipeable
        ref={(ref: SwipeableMethods) => {
          registerSwipeableRef?.(item.id, ref)
        }}
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
  },
  deleteAction: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: '100%',
  },
  deleteActionContainer: {
    alignItems: 'flex-end',
    width: '100%',
  },
})
