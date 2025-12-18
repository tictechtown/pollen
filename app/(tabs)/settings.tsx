import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Appbar, Button, Divider, List, Snackbar, Switch, Text } from 'react-native-paper'

import { deleteArticlesOlderThan, getArticlesFromDb } from '@/services/articles-db'
import { useArticlesStore } from '@/store/articles'
import { useFiltersStore } from '@/store/filters'

export default function SettingsScreen() {
  const router = useRouter()
  const setArticles = useArticlesStore((state) => state.setArticles)
  const { selectedFeedId } = useFiltersStore()
  const [snackbar, setSnackbar] = useState<string | null>(null)

  const handleClearOld = async () => {
    const sixMonthsAgo = Date.now() - 1000 * 60 * 60 * 24 * 180
    await deleteArticlesOlderThan(sixMonthsAgo)
    // Reload articles scoped to current filter to reflect deletions
    const refreshed = await getArticlesFromDb(selectedFeedId)
    setArticles(refreshed)
    setSnackbar('Removed articles older than 6 months')
  }
  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.Content title="Settings" subtitle="Feeds, cache, and theme" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <List.Section title="Feeds">
          <List.Item
            title="Manage sources"
            description="Add or remove feeds from your newsfeed"
            left={(props) => <List.Icon {...props} icon="rss" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/sources')}
          />
          <List.Item
            title="Pull interval"
            description="Every 30 minutes"
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </List.Section>

        <Divider />

        <List.Section title="Offline & cache">
          <List.Item
            title="Keep articles offline"
            description="Store article bodies and metadata on device"
            left={(props) => <List.Icon {...props} icon="download-circle" />}
            right={() => <Switch value />}
            onPress={() => {}}
          />
          <List.Item
            title="Clear image cache"
            description="Remove cached thumbnails without deleting articles"
            left={(props) => <List.Icon {...props} icon="image-multiple" />}
            right={(props) => <List.Icon {...props} icon="delete-outline" />}
            onPress={() => {}}
          />
          <List.Item
            title="Clear articles older than 6 months"
            description="Keeps your database small by pruning old stories"
            left={(props) => <List.Icon {...props} icon="delete-clock" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleClearOld}
          />
        </List.Section>

        <Divider />

        <List.Section title="Appearance">
          <List.Item
            title="Use system theme"
            description="Material You will follow the device mode"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <Switch value />}
            onPress={() => {}}
          />
          <Text style={styles.helper} variant="bodySmall">
            Material You dynamic colors are applied on supported Android versions.
          </Text>
        </List.Section>

        <Button mode="contained-tonal" icon="export" style={styles.cta} onPress={() => {}}>
          Export subscriptions (OPML)
        </Button>
      </ScrollView>

      <Snackbar
        visible={Boolean(snackbar)}
        onDismiss={() => setSnackbar(null)}
        duration={2500}
        action={{ label: 'OK', onPress: () => setSnackbar(null) }}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  helper: {
    paddingHorizontal: 16,
  },
  cta: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});
