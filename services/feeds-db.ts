import { Feed } from '@/types'

import { getDb } from './database'

export const upsertFeeds = async (feeds: Feed[]) => {
  if (!feeds.length) return
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    for (const feed of feeds) {
      await db.runAsync(
        `
        INSERT INTO feeds (id, title, url, description, image, lastUpdated, lastPublishedAt, lastPublishedTs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title,
          url=excluded.url,
          description=excluded.description,
          image=excluded.image,
          lastUpdated=excluded.lastUpdated,
          lastPublishedAt=COALESCE(excluded.lastPublishedAt, feeds.lastPublishedAt),
          lastPublishedTs=COALESCE(excluded.lastPublishedTs, feeds.lastPublishedTs);
      `,
        [
          feed.id,
          feed.title,
          feed.url,
          feed.description ?? null,
          feed.image ?? null,
          feed.lastUpdated ?? null,
          feed.lastPublishedAt ?? null,
          feed.lastPublishedTs ?? null,
        ],
      )
    }
  })
}

export const getFeedsFromDb = async (): Promise<Feed[]> => {
  const db = await getDb()
  return db.getAllAsync<Feed>(`SELECT * FROM feeds ORDER BY title ASC`)
}

export const removeFeedFromDb = async (id: string) => {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM articles WHERE feedId = ?`, [id])
    await db.runAsync(`DELETE FROM feeds WHERE id = ?`, [id])
  })
}
