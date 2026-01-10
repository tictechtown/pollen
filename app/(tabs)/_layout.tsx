import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs'
import React from 'react'
import { useTheme } from 'react-native-paper'

export default function TabLayout() {
  const theme = useTheme()

  return (
    <NativeTabs
      backBehavior="none"
      backgroundColor={theme.colors.elevation.level1}
      indicatorColor={theme.colors.secondaryContainer}
      iconColor={{
        default: theme.colors.onSurfaceVariant,
        selected: theme.colors.onSecondaryContainer,
      }}
      labelStyle={{
        default: { color: theme.colors.onSurfaceVariant, fontWeight: '500' },
        selected: { color: theme.colors.secondary, fontWeight: '700' },
      }}
    >
      <NativeTabs.Trigger name="unread">
        <Label>Unread</Label>
        <Icon
          src={{
            default: <VectorIcon family={MaterialIcons} name="radio-button-unchecked" />,
            selected: <VectorIcon family={MaterialIcons} name="radio-button-checked" />,
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Label>Feed</Label>
        <Icon
          src={{
            default: <VectorIcon family={MaterialIcons} name="list" />,
            selected: <VectorIcon family={MaterialIcons} name="notes" />,
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <Label>Read Later</Label>
        <Icon
          src={{
            default: <VectorIcon family={MaterialIcons} name="bookmarks" />,
            selected: <VectorIcon family={MaterialIcons} name="bookmark" />,
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
