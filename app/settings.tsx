import * as DocumentPicker from 'expo-document-picker'
// TODO migrate to expo-file-system: https://docs.expo.dev/versions/latest/sdk/filesystem/
import * as FileSystem from 'expo-file-system/legacy'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Platform, ScrollView, Share, StyleSheet, View } from 'react-native'
import { Appbar, Button, Divider, List, Snackbar, Switch, Text } from 'react-native-paper'

import { buildOpml } from '@/services/opml'
import { buildOpmlExportFilename } from '@/services/opml-export'
import { readerApi } from '@/services/reader-api'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'

export default function SettingsScreen() {
  const router = useRouter()
  const setArticles = useArticlesStore((state) => state.setArticles)
  const setFeeds = useFeedsStore((state) => state.setFeeds)
  const feeds = useFeedsStore((state) => state.feeds)
  const { selectedFeedId } = useFiltersStore()
  const [snackbar, setSnackbar] = useState<string | null>(null)

  const handleClearOld = async () => {
    const sixMonthsAgo = Date.now() - 1000 * 60 * 60 * 24 * 180
    await readerApi.articles.deleteOlderThan(sixMonthsAgo)
    // Reload articles scoped to current filter to reflect deletions
    const refreshed = await readerApi.articles.list(selectedFeedId)
    setArticles(refreshed)
    setSnackbar('Removed articles older than 6 months')
  }
  const [importingOpml, setImportingOpml] = useState(false)
  const [exportingOpml, setExportingOpml] = useState(false)
  const handleImportOpml = async () => {
    if (importingOpml) return
    setImportingOpml(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['text/xml', 'application/xml', 'application/octet-stream', '*/*'],
      })

      if (result.canceled) {
        return
      }

      const asset = result.assets?.[0]
      if (!asset?.uri) {
        setSnackbar('No file selected')
        return
      }

      const imported = await readerApi.importOpml(asset.uri)
      const feeds = await readerApi.feeds.list()
      setFeeds(feeds)
      setSnackbar(imported.length ? `Imported ${imported.length} feeds` : 'No feeds found in OPML')
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : 'Failed to import OPML')
    } finally {
      setImportingOpml(false)
    }
  }

  const handleExportOpml = async () => {
    if (exportingOpml) return

    if (!feeds.length) {
      setSnackbar('No feeds to export')
      return
    }

    setExportingOpml(true)
    const filename = buildOpmlExportFilename()
    const opml = buildOpml(feeds, { title: 'Pollen subscriptions' })

    try {
      if (Platform.OS === 'android') {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()
        if (!permissions.granted) {
          setSnackbar('Export cancelled')
          return
        }

        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          'text/xml',
        )
        await FileSystem.writeAsStringAsync(destUri, opml, {
          encoding: FileSystem.EncodingType.UTF8,
        })
        setSnackbar('Export saved')
        return
      }

      if (!FileSystem.cacheDirectory) {
        setSnackbar('Export is not available on this platform')
        return
      }

      const fileUri = `${FileSystem.cacheDirectory}${filename}`
      await FileSystem.writeAsStringAsync(fileUri, opml, {
        encoding: FileSystem.EncodingType.UTF8,
      })
      await Share.share({ title: filename, url: fileUri })
      setSnackbar('Export ready')
    } catch (err) {
      console.error('Failed to export OPML', err)
      setSnackbar(err instanceof Error ? err.message : 'Failed to export OPML')
    } finally {
      setExportingOpml(false)
    }
  }

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
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

        <List.Section title="Import / export">
          <Button
            mode="contained"
            icon="file-import-outline"
            style={styles.fullBleedCta}
            contentStyle={styles.fullBleedCtaContent}
            onPress={handleImportOpml}
            loading={importingOpml}
            disabled={importingOpml || exportingOpml}
          >
            import from OPML
          </Button>
          <Button
            mode="contained-tonal"
            icon="file-export-outline"
            style={styles.fullBleedCta}
            contentStyle={styles.fullBleedCtaContent}
            onPress={handleExportOpml}
            loading={exportingOpml}
            disabled={exportingOpml || importingOpml}
          >
            export to OPML
          </Button>
        </List.Section>
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
  )
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
  fullBleedCta: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 24,
  },
  fullBleedCtaContent: {
    height: 56,
    paddingHorizontal: 16,
  },
})
