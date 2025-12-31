// Article CRUD helpers for the SQLite database.
import { Article } from '@/types'

import { getDb, runWrite } from './database'

const toSortTimestamp = (article: Pick<Article, 'updatedAt' | 'publishedAt'>) => {
  const ts = article.updatedAt ?? article.publishedAt
  const asDate = ts ? new Date(ts).getTime() : 0
  return Number.isFinite(asDate) ? asDate : 0
}

export const upsertArticles = async (articles: Article[]) => {
  if (!articles.length) return
  const db = await getDb()

  const ids = articles.map((a) => a.id)
  const placeholders = ids.map(() => '?').join(',')
  const savedLookup: Record<string, number> = {}

  if (ids.length) {
    const existing = await db.getAllAsync<{ articleId: string; starred: number }>(
      `SELECT articleId, starred FROM article_statuses WHERE articleId IN (${placeholders})`,
      ids,
    )
    existing.forEach((row) => {
      savedLookup[row.articleId] = row.starred
    })
  }

  await runWrite(async (db) => {
    await db.withTransactionAsync(async () => {
      for (const article of articles) {
        const sortTimestamp = toSortTimestamp(article)
        const saved = savedLookup[article.id] ?? (article.saved ? 1 : 0)
        await db.runAsync(
          `
        INSERT INTO articles (id, feedId, title, link, source, publishedAt, updatedAt, description, content, thumbnail, saved, sortTimestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          feedId=excluded.feedId,
          title=excluded.title,
          link=excluded.link,
          source=excluded.source,
          publishedAt=excluded.publishedAt,
          updatedAt=excluded.updatedAt,
          description=excluded.description,
          content=excluded.content,
          thumbnail=excluded.thumbnail,
          sortTimestamp=excluded.sortTimestamp,
          saved=COALESCE(articles.saved, excluded.saved);
      `,
          [
            article.id,
            article.feedId ?? null,
            article.title,
            article.link,
            article.source,
            article.publishedAt ?? null,
            article.updatedAt ?? null,
            article.description ?? null,
            article.content ?? null,
            article.thumbnail ?? null,
            saved,
            sortTimestamp,
          ],
        )
        if (savedLookup[article.id] === undefined && saved === 1) {
          const now = Math.floor(Date.now() / 1000)
          await db.runAsync(
            `
            INSERT INTO article_statuses (articleId, starred, updatedAt)
            VALUES (?, ?, ?)
            ON CONFLICT(articleId) DO UPDATE SET
              starred=excluded.starred,
              updatedAt=excluded.updatedAt;
          `,
            [article.id, 1, now],
          )
        }
      }
    })
  })
}

export const getArticlesFromDb = async (feedId?: string): Promise<Article[]> => {
  const db = await getDb()
  const query = feedId
    ? `
        SELECT articles.*, article_statuses.read, article_statuses.starred
        FROM articles
        LEFT JOIN article_statuses ON article_statuses.articleId = articles.id
        WHERE articles.feedId = ?
        ORDER BY articles.sortTimestamp DESC, articles.createdAt DESC
      `
    : `
        SELECT articles.*, article_statuses.read, article_statuses.starred
        FROM articles
        LEFT JOIN article_statuses ON article_statuses.articleId = articles.id
        ORDER BY articles.sortTimestamp DESC, articles.createdAt DESC
      `

  const rows = feedId
    ? await db.getAllAsync<
        Omit<Article, 'seen' | 'saved'> & { read: number | null; starred: number | null }
      >(query, [feedId])
    : await db.getAllAsync<
        Omit<Article, 'seen' | 'saved'> & { read: number | null; starred: number | null }
      >(query)
  return rows.map((row) => {
    const { read, starred, ...article } = row
    return {
      ...article,
      saved: Boolean(starred),
      seen: Boolean(read),
    }
  })
}

export const getArticleReadStatus = async (id: string): Promise<boolean> => {
  const db = await getDb()
  const row = await db.getFirstAsync<{ read: number | null }>(
    `SELECT read FROM article_statuses WHERE articleId = ?`,
    [id],
  )
  return Boolean(row?.read)
}

export const getArticleStarredStatus = async (id: string): Promise<boolean> => {
  const db = await getDb()
  const row = await db.getFirstAsync<{ starred: number | null }>(
    `SELECT starred FROM article_statuses WHERE articleId = ?`,
    [id],
  )
  return Boolean(row?.starred)
}

export const setArticleSaved = async (id: string, saved: boolean) => {
  const now = Math.floor(Date.now() / 1000)
  await runWrite(async (db) => {
    await db.runAsync(
      `
      INSERT INTO article_statuses (articleId, starred, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(articleId) DO UPDATE SET
        starred=excluded.starred,
        updatedAt=excluded.updatedAt;
    `,
      [id, saved ? 1 : 0, now],
    )
  })
}

export const setArticleRead = async (id: string, read: boolean) => {
  const now = Math.floor(Date.now() / 1000)
  const lastReadAt = read ? now : null
  await runWrite(async (db) => {
    await db.runAsync(
      `
      INSERT INTO article_statuses (articleId, read, lastReadAt, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(articleId) DO UPDATE SET
        read=excluded.read,
        lastReadAt=excluded.lastReadAt,
        updatedAt=excluded.updatedAt;
    `,
      [id, read ? 1 : 0, lastReadAt, now],
    )
  })
}

export const setManyArticlesRead = async (ids: string[], read: boolean) => {
  if (!ids.length) return
  const now = Math.floor(Date.now() / 1000)
  const lastReadAt = read ? now : null
  await runWrite(async (db) => {
    await db.withTransactionAsync(async () => {
      for (const id of ids) {
        await db.runAsync(
          `
          INSERT INTO article_statuses (articleId, read, lastReadAt, updatedAt)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(articleId) DO UPDATE SET
            read=excluded.read,
            lastReadAt=excluded.lastReadAt,
            updatedAt=excluded.updatedAt;
        `,
          [id, read ? 1 : 0, lastReadAt, now],
        )
      }
    })
  })
}

export const removeArticlesByFeed = async (feedId: string) => {
  await runWrite(async (db) => {
    await db.runAsync(
      `DELETE FROM article_statuses WHERE articleId IN (SELECT id FROM articles WHERE feedId = ?)`,
      [feedId],
    )
    await db.runAsync(`DELETE FROM articles WHERE feedId = ?`, [feedId])
  })
}

export const deleteArticlesOlderThan = async (olderThanMs: number) => {
  await runWrite(async (db) => {
    await db.runAsync(
      `
      DELETE FROM article_statuses
      WHERE articleId IN (
        SELECT id FROM articles WHERE sortTimestamp > 0 AND sortTimestamp < ?
      )
    `,
      [olderThanMs],
    )
    await db.runAsync(`DELETE FROM articles WHERE sortTimestamp > 0 AND sortTimestamp < ?`, [
      olderThanMs,
    ])
  })
}
