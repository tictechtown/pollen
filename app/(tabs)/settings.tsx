import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Divider, List, Switch, Text } from 'react-native-paper';

export default function SettingsScreen() {
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
            onPress={() => {}}
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
