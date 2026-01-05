import type { Feed, FeedFolder } from '@/types'

export type FeedSection = {
  key: string
  title: string
  folder: FeedFolder | null
  data: Feed[]
}

export const groupFeedsByFolderId = (feeds: Feed[]): Map<string, Feed[]> => {
  const grouped = new Map<string, Feed[]>()
  for (const feed of feeds) {
    const folderId = feed.folderId ?? ''
    const entries = grouped.get(folderId) ?? []
    entries.push(feed)
    grouped.set(folderId, entries)
  }
  return grouped
}

const sortFeedsByTitle = (feeds: Feed[]): Feed[] =>
  feeds.slice().sort((a, b) => a.title.localeCompare(b.title))

export const buildFeedSections = (feeds: Feed[], folders: FeedFolder[]): FeedSection[] => {
  const grouped = groupFeedsByFolderId(feeds)
  const unfiled = sortFeedsByTitle(feeds.filter((feed) => !feed.folderId))
  const folderSections = folders.map((folder) => ({
    key: folder.id,
    title: folder.title,
    folder,
    data: sortFeedsByTitle(grouped.get(folder.id) ?? []),
  }))

  return [
    {
      key: 'unfiled',
      title: 'Unfiled',
      folder: null,
      data: unfiled,
    },
    ...folderSections,
  ]
}

