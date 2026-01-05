// Feed CRUD helpers for the SQLite database.
import { Feed } from '@/types'

import { getDb, runWrite } from './database'

type DbKey = string | undefined

export const upsertFeeds = async (feeds: Feed[], dbKey?: DbKey) => {
  if (!feeds.length) return
  await runWrite(async (db) => {
    await db.withTransactionAsync(async () => {
      for (const feed of feeds) {
        console.log(
          'inserting feeds',
          feed.id,
          feed.title,
          feed.xmlUrl,
          feed.expires,
          feed.ETag,
          feed.lastModified,
        )

        await db.runAsync(
          `
        INSERT INTO feeds (
          id,
          title,
          xmlUrl,
          htmlUrl,
          description,
          image,
          folderId,
          lastUpdated,
          lastPublishedTs,
          expiresTS,
          expires,
          ETag,
          lastModified
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title,
          xmlUrl=excluded.xmlUrl,
          description=excluded.description,
          image=excluded.image,
          folderId=COALESCE(excluded.folderId, feeds.folderId),
          lastUpdated=excluded.lastUpdated,
          lastPublishedTs=COALESCE(excluded.lastPublishedTs, feeds.lastPublishedTs),
          expiresTS=COALESCE(excluded.expiresTS, feeds.expiresTS),
          expires=COALESCE(excluded.expires, feeds.expires),
          ETag=COALESCE(excluded.ETag, feeds.ETag),
          lastModified=COALESCE(excluded.lastModified, feeds.lastModified);
      `,
          [
            feed.id,
            feed.title,
            feed.xmlUrl,
            feed.htmlUrl ?? null,
            feed.description ?? null,
            feed.image ?? null,
            feed.folderId ?? null,
            feed.lastUpdated ?? null,
            feed.lastPublishedTs ?? null,
            feed.expiresTS ?? null,
            feed.expires ?? null,
            feed.ETag ?? null,
            feed.lastModified ?? null,
          ],
        )
      }
    })
  }, dbKey)
}

export const getFeedsFromDb = async (dbKey?: DbKey): Promise<Feed[]> => {
  const db = await getDb(dbKey)
  return db.getAllAsync<Feed>(`SELECT * FROM feeds ORDER BY title ASC`)
}

export const removeFeedFromDb = async (id: string, dbKey?: DbKey) => {
  await runWrite(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        UPDATE articles
        SET feedId = NULL
        WHERE feedId = ?
          AND id IN (SELECT articleId FROM article_statuses WHERE starred = 1)
      `,
        [id],
      )
      await db.runAsync(
        `DELETE FROM article_statuses WHERE articleId IN (SELECT id FROM articles WHERE feedId = ?)`,
        [id],
      )
      await db.runAsync(`DELETE FROM articles WHERE feedId = ?`, [id])
      await db.runAsync(`DELETE FROM feeds WHERE id = ?`, [id])
    })
  }, dbKey)
}
