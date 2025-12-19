import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import React from 'react'

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="unread">
        <Label>Unread</Label>
        <Icon src={require('@/assets/images/circle_24dp.svg')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Label>Feed</Label>
        <Icon src={require('@/assets/images/notes_24dp.svg')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <Icon src={require('@/assets/images/bookmarks_24dp.svg')} />
        <Label>Read Later</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
