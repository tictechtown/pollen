// Tests for folder database helpers.
import type { SQLiteDatabase } from 'expo-sqlite'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./database', () => ({ getDb: vi.fn(), runWrite: vi.fn() }))
vi.mock('./uuid-generator', () => ({ generateUUID: vi.fn(() => 'folder-1') }))

// eslint-disable-next-line import/first
import { getDb, runWrite } from './database'
// eslint-disable-next-line import/first
import {
  createFolderInDb,
  deleteFolderInDb,
  getFoldersFromDb,
  renameFolderInDb,
  setFeedFolderIdInDb,
} from './folders-db'

describe('getFoldersFromDb', () => {
  it('loads folders from the database', async () => {
    const getAllAsync = vi.fn().mockResolvedValue([{ id: 'f1', title: 'News', createdAt: 0 }])
    vi.mocked(getDb).mockResolvedValue({ getAllAsync } as unknown as SQLiteDatabase)

    const folders = await getFoldersFromDb()

    expect(folders).toHaveLength(1)
    expect(getAllAsync).toHaveBeenCalled()
  })
})

describe('createFolderInDb', () => {
  it('inserts a folder and returns it', async () => {
    const runAsync = vi.fn().mockResolvedValue(undefined)
    const runWriteMock = vi.mocked(runWrite)
    runWriteMock.mockImplementation(async (task) => task({ runAsync } as unknown as SQLiteDatabase))

    const folder = await createFolderInDb('  News  ')

    expect(folder.id).toBe('folder-1')
    expect(folder.title).toBe('News')
    expect(runAsync).toHaveBeenCalledTimes(1)
  })
})

describe('renameFolderInDb', () => {
  it('updates the folder title', async () => {
    const runAsync = vi.fn().mockResolvedValue(undefined)
    vi.mocked(runWrite).mockImplementation(async (task) =>
      task({ runAsync } as unknown as SQLiteDatabase),
    )

    await renameFolderInDb('folder-1', 'Updated')

    expect(runAsync).toHaveBeenCalledTimes(1)
  })
})

describe('deleteFolderInDb', () => {
  it('unassigns feeds and deletes the folder', async () => {
    const runAsync = vi.fn().mockResolvedValue(undefined)
    const withTransactionAsync = vi.fn(async (task: () => Promise<void>) => task())
    vi.mocked(runWrite).mockImplementation(async (task) =>
      task({ runAsync, withTransactionAsync } as unknown as SQLiteDatabase),
    )

    await deleteFolderInDb('folder-1')

    expect(runAsync).toHaveBeenCalledTimes(2)
  })
})

describe('setFeedFolderIdInDb', () => {
  it('sets the folder id on the feed record', async () => {
    const runAsync = vi.fn().mockResolvedValue(undefined)
    vi.mocked(runWrite).mockImplementation(async (task) =>
      task({ runAsync } as unknown as SQLiteDatabase),
    )

    await setFeedFolderIdInDb('feed-1', 'folder-1')

    expect(runAsync).toHaveBeenCalledTimes(1)
  })
})
