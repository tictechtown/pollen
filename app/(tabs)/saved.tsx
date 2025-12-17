import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Appbar, Card, List, Text } from 'react-native-paper';

import { useArticlesStore } from '@/store/articles';

export default function SavedScreen() {
  const router = useRouter();
  const saved = useArticlesStore((state) => state.articles.filter((a) => a.saved));

  return (
    <View style={styles.container}>
      <Appbar.Header mode="center-aligned">
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Saved for later" />
        <Appbar.Action icon="dots-vertical" onPress={() => {}} />
      </Appbar.Header>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={saved}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Card.Title title="No saved articles" />
            <Card.Content>
              <Text variant="bodyMedium">Swipe left on a card in your feed to save it.</Text>
            </Card.Content>
          </Card>
        }
        renderItem={({ item }) => (
          <List.Item
            title={item.title}
            description={`${item.source}`}
            left={(props) => <List.Icon {...props} icon="bookmark" />}
            onPress={() => router.push(`/article/${item.id}`)}
            right={(props) => <List.Icon {...props} icon="open-in-new" />}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 8,
  },
  emptyCard: {
    margin: 16,
  },
});
