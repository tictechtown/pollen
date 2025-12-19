import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import React from 'react'

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Feed</Label>
        <Icon src={require('@/assets/images/rss_feed_24dp.png')} />
        {/* <Icon drawable={'rss_feed_24px'} /> */}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <Icon src={require('@/assets/images/bookmark_24dp.png')} />
        <Label>Saved</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Icon src={require('@/assets/images/settings_24dp.png')} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )

  /*
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.elevation.level2,
          height: 84,
          paddingTop: 10,
          paddingBottom: 18,
          borderTopWidth: 0,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarHideOnKeyboard: true,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="rss" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bookmark-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
  */
}
