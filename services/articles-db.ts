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
    const existing = await db.getAllAsync<{ id: string; saved: number }>(
      `SELECT id, saved FROM articles WHERE id IN (${placeholders})`,
      ids,
    )
    existing.forEach((row) => {
      savedLookup[row.id] = row.saved
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
      }
    })
  })
}

export const getArticlesFromDb = async (feedId?: string): Promise<Article[]> => {
  const db = await getDb()
  const rows = await db.getAllAsync<Omit<Article, 'seen' | 'saved'> & { saved: number }>(
    feedId
      ? `SELECT * FROM articles WHERE feedId = ? ORDER BY sortTimestamp DESC, createdAt DESC`
      : `SELECT * FROM articles ORDER BY sortTimestamp DESC, createdAt DESC`,
    feedId ? [feedId] : undefined,
  )
  return rows.map((row) => ({
    ...row,
    saved: Boolean(row.saved),
    seen: false,
  }))
}

export const setArticleSaved = async (id: string, saved: boolean) => {
  await runWrite(async (db) => {
    await db.runAsync(`UPDATE articles SET saved = ? WHERE id = ?`, [saved ? 1 : 0, id])
  })
}

export const removeArticlesByFeed = async (feedId: string) => {
  await runWrite(async (db) => {
    await db.runAsync(`DELETE FROM articles WHERE feedId = ?`, [feedId])
  })
}

export const deleteArticlesOlderThan = async (olderThanMs: number) => {
  await runWrite(async (db) => {
    await db.runAsync(`DELETE FROM articles WHERE sortTimestamp > 0 AND sortTimestamp < ?`, [
      olderThanMs,
    ])
  })
}
