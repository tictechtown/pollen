import { describe, expect, it } from 'vitest'

import type { Feed, FeedFolder } from '@/types'

import { applyFolderExpansion, buildFeedSections, groupFeedsByFolderId } from './feed-sections'

describe('feed-sections', () => {
  const feeds: Feed[] = [
    { id: 'f1', title: 'Zebra', xmlUrl: 'z', folderId: null },
    { id: 'f2', title: 'Alpha', xmlUrl: 'a', folderId: null },
    { id: 'f3', title: 'Bravo', xmlUrl: 'b', folderId: 'folder-1' },
  ]
  const folders: FeedFolder[] = [{ id: 'folder-1', title: 'Folder 1', createdAt: 0 }]

  it('groups feeds by folder id (including unfiled)', () => {
    const grouped = groupFeedsByFolderId(feeds)
    expect(grouped.get('folder-1')?.map((f) => f.id)).toEqual(['f3'])
    expect(
      grouped
        .get('')
        ?.map((f) => f.id)
        .sort(),
    ).toEqual(['f1', 'f2'])
  })

  it('buildFeedSections sorts feeds and includes empty folders', () => {
    const sections = buildFeedSections(feeds, folders)
    expect(sections.map((s) => s.key)).toEqual(['unfiled', 'folder-1'])
    expect(sections[0].data.map((f) => f.id)).toEqual(['f2', 'f1'])
    expect(sections[1].data.map((f) => f.id)).toEqual(['f3'])

    const empty = buildFeedSections([], folders)
    expect(empty[1].data).toEqual([])
  })

  it('applyFolderExpansion hides folder data when collapsed', () => {
    const sections = buildFeedSections(feeds, folders)
    const collapsed = applyFolderExpansion(sections, { 'folder-1': false, default: true })
    expect(collapsed[0].data.map((f) => f.id)).toEqual(['f2', 'f1'])
    expect(collapsed[1].data).toEqual([])
  })
})
