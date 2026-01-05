/**
 * Source management screen
 * User can
 * - see all the feed sources
 * - remove them by swiping left
 * - add a new Feed using the FAB
 * - (TODO) organize feed per folder
 */
import { useRouter } from 'expo-router'
import he from 'he'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SectionList, StyleSheet, View } from 'react-native'
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'

import SourceListItem from '@/components/ui/SourceListItem'
import { getArticlesFromDb, upsertArticles } from '@/services/articles-db'
import { discoverFeedUrls, FeedCandidate } from '@/services/feedDiscovery'
import { buildFeedSections, groupFeedsByFolderId } from '@/services/feed-sections'
import { removeFeedFromDb, upsertFeeds } from '@/services/feeds-db'
import {
  createFolderInDb,
  deleteFolderInDb,
  getFoldersFromDb,
  renameFolderInDb,
  setFeedFolderIdInDb,
} from '@/services/folders-db'
import { importFeedsFromOpmlUri } from '@/services/refresh'
import { fetchFeed } from '@/services/rssClient'
import { normalizeUrl } from '@/services/urls'
import { generateUUID } from '@/services/uuid-generator'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'
import { useFiltersStore } from '@/store/filters'
import { useFoldersStore } from '@/store/folders'
import { Feed, FeedFolder } from '@/types'
import * as DocumentPicker from 'expo-document-picker'
import {
  Appbar,
  Button,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper'

export default function SourcesScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const feeds = useFeedsStore((state) => state.feeds)
  const addFeeds = useFeedsStore((state) => state.addFeeds)
  const addFeed = useFeedsStore((state) => state.addFeed)
  const removeFeed = useFeedsStore((state) => state.removeFeed)
  const updateFeed = useFeedsStore((state) => state.updateFeed)
  const folders = useFoldersStore((state) => state.folders)
  const setFolders = useFoldersStore((state) => state.setFolders)
  const addFolder = useFoldersStore((state) => state.addFolder)
  const updateFolder = useFoldersStore((state) => state.updateFolder)
  const removeFolder = useFoldersStore((state) => state.removeFolder)
  const setArticles = useArticlesStore((state) => state.setArticles)
  const { setFeedFilter, selectedFeedId } = useFiltersStore()

  const [addVisible, setAddVisible] = useState(false)
  const [removeVisible, setRemoveVisible] = useState(false)
  const [moveVisible, setMoveVisible] = useState(false)
  const [folderCreateVisible, setFolderCreateVisible] = useState(false)
  const [folderRenameVisible, setFolderRenameVisible] = useState(false)
  const [folderDeleteVisible, setFolderDeleteVisible] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [feedToRemove, setFeedToRemove] = useState<Feed | null>(null)
  const [feedToMove, setFeedToMove] = useState<Feed | null>(null)
  const [feedCandidates, setFeedCandidates] = useState<FeedCandidate[]>([])
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const swipeableRefs = useRef<Record<string, SwipeableMethods | null>>({})
  const [importingOpml, setImportingOpml] = useState(false)
  const [state, setState] = useState({ open: false })
  const [folderName, setFolderName] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<FeedFolder | null>(null)

  const onStateChange = useCallback(({ open }: { open: boolean }) => setState({ open }), [setState])

  const feedsByFolderId = useMemo(() => groupFeedsByFolderId(feeds), [feeds])
  const sections = useMemo(() => buildFeedSections(feeds, folders), [feeds, folders])

  useEffect(() => {
    getFoldersFromDb()
      .then((rows) => setFolders(rows))
      .catch((err) => console.error('Failed to load folders', err))
  }, [setFolders])

  const handleSelect = (feed?: Feed) => {
    if (!feed || feed.id === 'all') {
      setFeedFilter(undefined, undefined)
    } else {
      setFeedFilter(feed.id, feed.title)
    }
    router.push('/(tabs)')
  }

  const handleRemove = (feed: Feed) => {
    removeFeedFromDb(feed.id).then(async () => {
      removeFeed(feed.id)
      const nextFeedId = selectedFeedId === feed.id ? undefined : selectedFeedId
      if (selectedFeedId === feed.id) {
        setFeedFilter(undefined, undefined)
      }
      const remainingArticles = await getArticlesFromDb(nextFeedId)
      setArticles(remainingArticles)
      setSnackbar(`Removed ${feed.title}`)
    })
  }

  const handleMoveFeed = (feed: Feed) => {
    setFeedToMove(feed)
    setMoveVisible(true)
  }

  const applyMoveToFolder = async (folderId: string | null) => {
    if (!feedToMove) return
    try {
      await setFeedFolderIdInDb(feedToMove.id, folderId)
      updateFeed({ ...feedToMove, folderId })
      setSnackbar('Updated folder')
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : 'Failed to move feed')
    } finally {
      setMoveVisible(false)
      setFeedToMove(null)
    }
  }

  const handleCreateFolder = async () => {
    try {
      const created = await createFolderInDb(folderName)
      addFolder(created)
      setFolderCreateVisible(false)
      setSnackbar('Folder created')
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : 'Failed to create folder')
    }
  }

  const openRenameFolder = (folder: FeedFolder) => {
    setSelectedFolder(folder)
    setFolderName(folder.title)
    setFolderRenameVisible(true)
  }

  const handleRenameFolder = async () => {
    if (!selectedFolder) return
    try {
      const title = folderName.trim()
      await renameFolderInDb(selectedFolder.id, title)
      updateFolder({ ...selectedFolder, title })
      setFolderRenameVisible(false)
      setSelectedFolder(null)
      setSnackbar('Folder renamed')
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : 'Failed to rename folder')
    }
  }

  const openDeleteFolder = (folder: FeedFolder) => {
    setSelectedFolder(folder)
    setFolderDeleteVisible(true)
  }

  const closeDeleteFolder = () => {
    setFolderDeleteVisible(false)
    setSelectedFolder(null)
  }

  const handleDeleteFolderMoveFeeds = async () => {
    if (!selectedFolder) return
    const folderId = selectedFolder.id
    try {
      await deleteFolderInDb(folderId)
      const feedsInFolder = feedsByFolderId.get(folderId) ?? []
      feedsInFolder.forEach((feed) => updateFeed({ ...feed, folderId: null }))
      removeFolder(folderId)
      setSnackbar('Folder deleted')
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : 'Failed to delete folder')
    } finally {
      closeDeleteFolder()
    }
  }

  const handleDeleteFolderAndFeeds = async () => {
    if (!selectedFolder) return
    const folderId = selectedFolder.id
    const feedsInFolder = feedsByFolderId.get(folderId) ?? []
    const removedFeedIds = new Set(feedsInFolder.map((feed) => feed.id))
    try {
      for (const feed of feedsInFolder) {
        await removeFeedFromDb(feed.id)
        removeFeed(feed.id)
      }
      await deleteFolderInDb(folderId)
      removeFolder(folderId)
      if (selectedFeedId && removedFeedIds.has(selectedFeedId)) {
        setFeedFilter(undefined, undefined)
        const remainingArticles = await getArticlesFromDb(undefined)
        setArticles(remainingArticles)
      }
      setSnackbar('Folder and feeds deleted')
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : 'Failed to delete folder')
    } finally {
      closeDeleteFolder()
    }
  }

  const handleConfirmRemove = () => {
    if (!feedToRemove) {
      return
    }
    handleRemove(feedToRemove)
    setRemoveVisible(false)
    setFeedToRemove(null)
  }

  const handleCancelRemove = () => {
    if (feedToRemove) {
      swipeableRefs.current[feedToRemove.id]?.close()
    }
    setRemoveVisible(false)
    setFeedToRemove(null)
  }

  const finalizeAdd = () => {
    setFeedUrl('')
    setFeedCandidates([])
    setAddVisible(false)
    router.push('/(tabs)')
  }

  const addFeedByUrl = async (url: string) => {
    const feedId = String(generateUUID())
    const { feed, articles } = await fetchFeed(feedId, url, {
      cutoffTs: 0,
    })
    try {
      await upsertFeeds([feed])
    } catch (e) {
      if ((e as Error).message.includes('UNIQUE constraint failed: feeds.xmlUrl')) {
        setSnackbar('Feed already exists')
      } else {
        setSnackbar('Error adding feed.')
      }
      return false
    }
    await upsertArticles(articles)
    addFeed(feed)
    setFeedFilter(feed.id, feed.title)
    return true
  }

  const withSubmitting = async (action: () => Promise<void>) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await action()
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdd = async () => {
    const trimmedUrl = normalizeUrl(feedUrl)
    if (!trimmedUrl) {
      setSnackbar('Enter a feed URL')
      return
    }
    await withSubmitting(async () => {
      try {
        const { directUrl, candidates } = await discoverFeedUrls(trimmedUrl)
        if (directUrl) {
          if (await addFeedByUrl(directUrl)) {
            finalizeAdd()
          }
          return
        }
        if (candidates.length === 1) {
          if (await addFeedByUrl(candidates[0].url)) {
            finalizeAdd()
          }
          return
        }
        if (candidates.length > 1) {
          setFeedCandidates(candidates)
          return
        }
        setSnackbar('No RSS or Atom feed found')
      } catch (err) {
        setSnackbar(err instanceof Error ? err.message : 'Failed to add feed')
      }
    })
  }

  const handleSelectCandidate = async (candidate: FeedCandidate) => {
    await withSubmitting(async () => {
      try {
        await addFeedByUrl(candidate.url)
        finalizeAdd()
      } catch (err) {
        setSnackbar(err instanceof Error ? err.message : 'Failed to add feed')
      }
    })
  }

  const handleImportOpml = useCallback(async () => {
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

      const imported = await importFeedsFromOpmlUri(asset.uri)
      addFeeds(imported)
      setSnackbar(imported.length ? `Imported ${imported.length} feeds` : 'No feeds found in OPML')
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : 'Failed to import OPML')
    } finally {
      setImportingOpml(false)
    }
  }, [addFeeds, setSnackbar, setImportingOpml, importingOpml])

  const FABActions = useMemo(() => {
    const openCreateFolder = () => {
      setFolderName('')
      setFolderCreateVisible(true)
    }

    return [
      { icon: 'plus', label: 'Add feed', onPress: () => setAddVisible(true) },
      {
        icon: 'bookshelf',
        label: 'Import OPML',
        onPress: handleImportOpml,
      },
      { icon: 'folder-plus', label: 'Create folder', onPress: openCreateFolder },
    ]
  }, [setAddVisible, handleImportOpml])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header mode="center-aligned">
        <Appbar.Content title="Sources" />
      </Appbar.Header>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <List.Section title="All">
              <SourceListItem
                item={{ id: 'all', title: 'All', xmlUrl: '' }}
                isAll
                isSelected={!selectedFeedId}
                isFirst
                isLast
                onSelect={handleSelect}
                onRequestRemove={() => {}}
              />
            </List.Section>
          </View>
        }
        renderSectionHeader={({ section }) => {
          const folder = section.folder
          return (
            <View style={styles.sectionHeader}>
              {/* @ts-ignore */}
              <List.Section title={folder ? folder.title : 'Default'} />
              {folder ? (
                <View style={styles.folderActions}>
                  <IconButton icon="pencil" size={16} onPress={() => openRenameFolder(folder)} />
                  <IconButton icon="delete" size={16} onPress={() => openDeleteFolder(folder)} />
                </View>
              ) : null}
            </View>
          )
        }}
        renderItem={({ item, index, section }) => {
          return (
            <SourceListItem
              item={item}
              isAll={false}
              isSelected={selectedFeedId === item.id}
              isFirst={index === 0}
              isLast={index === section.data.length - 1}
              onSelect={handleSelect}
              onRequestRemove={(feed) => {
                setFeedToRemove(feed)
                setRemoveVisible(true)
              }}
              onRequestMove={handleMoveFeed}
              registerSwipeableRef={(id, ref) => {
                swipeableRefs.current[id] = ref
              }}
            />
          )
        }}
        stickySectionHeadersEnabled={false}
      />
      <FAB.Group
        open={state.open}
        visible
        icon={importingOpml ? 'import' : state.open ? 'close' : 'plus'}
        actions={FABActions}
        onStateChange={onStateChange}
      />

      <Portal>
        <Dialog
          visible={addVisible}
          onDismiss={() => {
            setAddVisible(false)
            setFeedCandidates([])
          }}
        >
          <Dialog.Title>Add a feed</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Feed URL"
              value={feedUrl}
              onChangeText={(value) => {
                setFeedUrl(value)
                if (feedCandidates.length) {
                  setFeedCandidates([])
                }
              }}
              editable={feedCandidates.length <= 1 && !submitting}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {feedCandidates.length > 1
              ? [
                  <Text key="candidate-title" variant="titleMedium" style={{ marginTop: 16 }}>
                    Select Feed
                  </Text>,
                  ...feedCandidates.map((candidate) => (
                    <List.Item
                      key={candidate.url}
                      title={`${he.decode(candidate.title ?? candidate.url)} (${
                        candidate.kind === 'atom'
                          ? 'Atom'
                          : candidate.kind === 'rss'
                          ? 'RSS'
                          : 'Feed'
                      })`}
                      description={candidate.title ? candidate.url : undefined}
                      onPress={() => handleSelectCandidate(candidate)}
                      left={() => <List.Icon icon="radiobox-blank" />}
                      disabled={submitting}
                    />
                  )),
                ]
              : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setAddVisible(false)
                setFeedUrl('')
                setFeedCandidates([])
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            {feedCandidates.length > 1 ? null : (
              <Button onPress={handleAdd} loading={submitting} disabled={feedUrl.length === 0}>
                Add
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={moveVisible} onDismiss={() => setMoveVisible(false)}>
          <Dialog.Title>Move to folder</Dialog.Title>
          <Dialog.ScrollArea>
            <View>
              <List.Item title="Default" onPress={() => applyMoveToFolder(null)} />
              {folders.map((folder) => (
                <List.Item
                  key={folder.id}
                  title={folder.title}
                  onPress={() => applyMoveToFolder(folder.id)}
                />
              ))}
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setMoveVisible(false)
                setFeedToMove(null)
              }}
            >
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={folderCreateVisible} onDismiss={() => setFolderCreateVisible(false)}>
          <Dialog.Title>Create folder</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Folder name" value={folderName} onChangeText={setFolderName} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setFolderCreateVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateFolder}>Create</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={folderRenameVisible} onDismiss={() => setFolderRenameVisible(false)}>
          <Dialog.Title>Rename folder</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Folder name" value={folderName} onChangeText={setFolderName} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setFolderRenameVisible(false)}>Cancel</Button>
            <Button onPress={handleRenameFolder}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={folderDeleteVisible} onDismiss={closeDeleteFolder}>
          <Dialog.Title>Delete folder</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Delete folder{' '}
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                {selectedFolder?.title}
              </Text>
              ?
            </Text>
            <Text style={{ marginTop: 8 }} variant="bodySmall">
              Choose what to do with the{' '}
              {selectedFolder ? feedsByFolderId.get(selectedFolder.id)?.length ?? 0 : 0} feed(s)
              inside.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDeleteFolder}>Cancel</Button>
            <Button onPress={handleDeleteFolderMoveFeeds}>Move to Default</Button>
            <Button onPress={handleDeleteFolderAndFeeds}>Delete feeds too</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={removeVisible} onDismiss={handleCancelRemove}>
          <Dialog.Title>
            Are you sure you want to remove {feedToRemove?.title ?? 'this feed'}?
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall">Saved items will be kept in Read Later.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelRemove}>Cancel</Button>
            <Button onPress={handleConfirmRemove}>Remove</Button>
          </Dialog.Actions>
        </Dialog>

        <Snackbar
          visible={Boolean(snackbar)}
          onDismiss={() => setSnackbar(null)}
          duration={3000}
          action={{ label: 'Dismiss', onPress: () => setSnackbar(null) }}
        >
          {snackbar}
        </Snackbar>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 16,
    paddingBottom: 64,
  },
  folderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderTitles: {
    flex: 1,
  },
})
