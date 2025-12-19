import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs'
import React from 'react'

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="unread">
        <Label>Unread</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="radio-button-unchecked" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Label>Feed</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="notes" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <Label>Read Later</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="bookmarks" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
