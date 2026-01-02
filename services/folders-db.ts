// Folder CRUD + feed assignment helpers for the SQLite database.
import { FeedFolder } from '@/types'

import { getDb, runWrite } from './database'
import { generateUUID } from './uuid-generator'

export const getFoldersFromDb = async (): Promise<FeedFolder[]> => {
  const db = await getDb()
  return db.getAllAsync<FeedFolder>(`SELECT * FROM feed_folders ORDER BY title ASC`)
}

export const createFolderInDb = async (title: string): Promise<FeedFolder> => {
  const trimmed = title.trim()
  if (!trimmed) {
    throw new Error('Folder name is required')
  }

  const folder: FeedFolder = {
    id: generateUUID(),
    title: trimmed,
    createdAt: Math.floor(Date.now() / 1000),
  }

  await runWrite(async (db) => {
    await db.runAsync(`INSERT INTO feed_folders (id, title, createdAt) VALUES (?, ?, ?)`, [
      folder.id,
      folder.title,
      folder.createdAt,
    ])
  })

  return folder
}

export const renameFolderInDb = async (id: string, title: string) => {
  const trimmed = title.trim()
  if (!trimmed) {
    throw new Error('Folder name is required')
  }

  await runWrite(async (db) => {
    await db.runAsync(`UPDATE feed_folders SET title = ? WHERE id = ?`, [trimmed, id])
  })
}

export const deleteFolderInDb = async (id: string) => {
  await runWrite(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync(`UPDATE feeds SET folderId = NULL WHERE folderId = ?`, [id])
      await db.runAsync(`DELETE FROM feed_folders WHERE id = ?`, [id])
    })
  })
}

export const setFeedFolderIdInDb = async (feedId: string, folderId?: string | null) => {
  await runWrite(async (db) => {
    await db.runAsync(`UPDATE feeds SET folderId = ? WHERE id = ?`, [folderId ?? null, feedId])
  })
}

