// Article CRUD helpers for the SQLite database.
import { Article } from '@/types'

import { getDb, runWrite } from './database'

type DbKey = string | undefined

const toSortTimestamp = (article: Pick<Article, 'updatedAt' | 'publishedAt'>) => {
  const ts = article.updatedAt ?? article.publishedAt
  const asDate = ts ? new Date(ts).getTime() : 0
  return Number.isFinite(asDate) ? asDate : 0
}

export const upsertArticles = async (articles: Article[], dbKey?: DbKey) => {
  if (!articles.length) return
  const db = await getDb(dbKey)

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
        console.log('inserting articles', article.source)

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
  }, dbKey)
}

export const getArticlesFromDb = async (feedId?: string, dbKey?: DbKey): Promise<Article[]> => {
  const db = await getDb(dbKey)
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
        Omit<Article, 'read' | 'saved'> & { read: number | null; starred: number | null }
      >(query, [feedId])
    : await db.getAllAsync<
        Omit<Article, 'read' | 'saved'> & { read: number | null; starred: number | null }
      >(query)
  return rows.map((row) => {
    const { read, starred, ...article } = row
    return {
      ...article,
      saved: Boolean(starred),
      read: Boolean(read),
    }
  })
}

type ArticleDbRow = Omit<Article, 'read' | 'saved'> & { read: number | null; starred: number | null }

const mapRowToArticle = (row: ArticleDbRow): Article => {
  const { read, starred, ...article } = row
  return {
    ...article,
    saved: Boolean(starred),
    read: Boolean(read),
  }
}

type ArticleListFilters = {
  feedId?: string
  unreadOnly?: boolean
  savedOnly?: boolean
}

const buildArticlesWhere = (filters: ArticleListFilters) => {
  const clauses: string[] = []
  const args: (string | number)[] = []

  if (filters.feedId) {
    clauses.push(`articles.feedId = ?`)
    args.push(filters.feedId)
  } else if (!filters.savedOnly) {
    clauses.push(`articles.feedId IS NOT NULL`)
    clauses.push(`articles.feedId != ''`)
  }

  if (filters.unreadOnly) {
    clauses.push(`COALESCE(article_statuses.read, 0) = 0`)
  }

  if (filters.savedOnly) {
    clauses.push(`COALESCE(article_statuses.starred, articles.saved, 0) = 1`)
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return { whereSql, args }
}

export const getArticlesPageFromDb = async (
  filters: ArticleListFilters & { page: number; pageSize: number; dbKey?: DbKey },
): Promise<{ articles: Article[]; total: number }> => {
  const db = await getDb(filters.dbKey)
  const page = Math.max(1, Math.floor(filters.page))
  const pageSize = Math.max(1, Math.floor(filters.pageSize))
  const offset = (page - 1) * pageSize
  const { whereSql, args } = buildArticlesWhere(filters)

  const countRow = await db.getFirstAsync<{ total: number }>(
    `
      SELECT COUNT(articles.id) AS total
      FROM articles
      LEFT JOIN article_statuses ON article_statuses.articleId = articles.id
      ${whereSql}
    `,
    args,
  )
  const total = Number(countRow?.total) || 0

  const rows = await db.getAllAsync<ArticleDbRow>(
    `
      SELECT articles.*, article_statuses.read, article_statuses.starred
      FROM articles
      LEFT JOIN article_statuses ON article_statuses.articleId = articles.id
      ${whereSql}
      ORDER BY articles.sortTimestamp DESC, articles.createdAt DESC
      LIMIT ? OFFSET ?
    `,
    [...args, pageSize, offset],
  )

  return { articles: rows.map(mapRowToArticle), total }
}

export const getArticleByIdFromDb = async (
  id: string,
  dbKey?: DbKey,
): Promise<Article | null> => {
  const db = await getDb(dbKey)
  const row = await db.getFirstAsync<ArticleDbRow>(
    `
      SELECT articles.*, article_statuses.read, article_statuses.starred
      FROM articles
      LEFT JOIN article_statuses ON article_statuses.articleId = articles.id
      WHERE articles.id = ?
      LIMIT 1
    `,
    [id],
  )
  return row ? mapRowToArticle(row) : null
}

export const getUnreadCountFromDb = async (feedId?: string, dbKey?: DbKey): Promise<number> => {
  const db = await getDb(dbKey)
  const { whereSql, args } = buildArticlesWhere({ feedId, unreadOnly: true })
  const row = await db.getFirstAsync<{ total: number }>(
    `
      SELECT COUNT(articles.id) AS total
      FROM articles
      LEFT JOIN article_statuses ON article_statuses.articleId = articles.id
      ${whereSql}
    `,
    args,
  )
  return Number(row?.total) || 0
}

export const getUnreadArticleIdsFromDb = async (
  feedId?: string,
  dbKey?: DbKey,
): Promise<string[]> => {
  const db = await getDb(dbKey)
  const { whereSql, args } = buildArticlesWhere({ feedId, unreadOnly: true })
  const rows = await db.getAllAsync<{ id: string }>(
    `
      SELECT articles.id AS id
      FROM articles
      LEFT JOIN article_statuses ON article_statuses.articleId = articles.id
      ${whereSql}
    `,
    args,
  )
  return rows.map((row) => row.id)
}

export const setAllArticlesReadFromDb = async (feedId?: string, dbKey?: DbKey) => {
  const now = Math.floor(Date.now() / 1000)
  await runWrite(async (db) => {
    const { whereSql, args } = buildArticlesWhere({ feedId })
    await db.runAsync(
      `
        INSERT INTO article_statuses (articleId, read, lastReadAt, updatedAt)
        SELECT articles.id, 1, ?, ?
        FROM articles
        LEFT JOIN article_statuses ON article_statuses.articleId = articles.id
        ${whereSql}
        ON CONFLICT(articleId) DO UPDATE SET
          read=excluded.read,
          lastReadAt=excluded.lastReadAt,
          updatedAt=excluded.updatedAt;
      `,
      [now, now, ...args],
    )
  }, dbKey)
}

export const getUnreadCountsByFeedFromDb = async (dbKey?: DbKey): Promise<Map<string, number>> => {
  const db = await getDb(dbKey)
  const rows = await db.getAllAsync<{ feedId: string | null; unreadCount: number }>(
    `
      SELECT
        articles.feedId AS feedId,
        COUNT(articles.id) AS unreadCount
      FROM articles
      LEFT JOIN article_statuses
        ON article_statuses.articleId = articles.id
      WHERE COALESCE(article_statuses.read, 0) = 0
        AND articles.feedId IS NOT NULL
        AND articles.feedId != ''
      GROUP BY articles.feedId
    `,
  )

  const counts = new Map<string, number>()
  for (const row of rows) {
    if (!row.feedId) continue
    counts.set(row.feedId, Number(row.unreadCount) || 0)
  }
  return counts
}

export const getArticleReadStatus = async (id: string, dbKey?: DbKey): Promise<boolean> => {
  const db = await getDb(dbKey)
  const row = await db.getFirstAsync<{ read: number | null }>(
    `SELECT read FROM article_statuses WHERE articleId = ?`,
    [id],
  )
  return Boolean(row?.read)
}

export const getArticleStarredStatus = async (id: string, dbKey?: DbKey): Promise<boolean> => {
  const db = await getDb(dbKey)
  const row = await db.getFirstAsync<{ starred: number | null }>(
    `SELECT starred FROM article_statuses WHERE articleId = ?`,
    [id],
  )
  return Boolean(row?.starred)
}

export const setArticleSaved = async (id: string, saved: boolean, dbKey?: DbKey) => {
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
  }, dbKey)
}

export const setArticleRead = async (id: string, read: boolean, dbKey?: DbKey) => {
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
  }, dbKey)
}

export const setManyArticlesRead = async (ids: string[], read: boolean, dbKey?: DbKey) => {
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
  }, dbKey)
}

export const removeArticlesByFeed = async (feedId: string, dbKey?: DbKey) => {
  await runWrite(async (db) => {
    await db.runAsync(
      `DELETE FROM article_statuses WHERE articleId IN (SELECT id FROM articles WHERE feedId = ?)`,
      [feedId],
    )
    await db.runAsync(`DELETE FROM articles WHERE feedId = ?`, [feedId])
  }, dbKey)
}

export const deleteArticlesOlderThan = async (olderThanMs: number, dbKey?: DbKey) => {
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
  }, dbKey)
}
