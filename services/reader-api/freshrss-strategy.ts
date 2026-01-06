import type { Article, Feed, FeedFolder } from '@/types'

import {
  deleteArticlesOlderThan,
  getArticleByIdFromDb,
  getArticlesPageFromDb,
  getUnreadArticleIdsFromDb,
  getUnreadCountFromDb,
  getUnreadCountsByFeedFromDb,
  setAllArticlesReadFromDb,
  setArticleRead,
  setArticleSaved,
  setManyArticlesRead,
  upsertArticles,
} from '@/services/articles-db'
import { getFeedsFromDb, upsertFeeds } from '@/services/feeds-db'
import { getFoldersFromDb } from '@/services/folders-db'
import { getDb, runWrite } from '@/services/database'

import { FeverClient } from './fever-client'
import type { ReaderAccount, ReaderHydrateResult, ReaderStrategy } from './types'

type FeverGroup = { id: number | string; title: string }
type FeverFeed = {
  id: number | string
  title: string
  url: string
  site_url?: string
  last_updated_on_time?: number
}
type FeverFeedsGroup = { feed_id: number | string; group_id: number | string }
type FeverItem = {
  id: number | string
  feed_id: number | string
  title: string
  url: string
  html?: string
  created_on_time?: number
  is_read?: 0 | 1
  is_saved?: 0 | 1
}

type FeverGroupsResponse = { auth?: 0 | 1; groups?: FeverGroup[] }
type FeverFeedsResponse = { auth?: 0 | 1; feeds?: FeverFeed[] }
type FeverFeedsGroupsResponse = { auth?: 0 | 1; feeds_groups?: FeverFeedsGroup[] }
type FeverItemsResponse = { auth?: 0 | 1; items?: FeverItem[] }
type FeverIdsResponse = { auth?: 0 | 1; unread_item_ids?: string; saved_item_ids?: string }

const parseIds = (raw?: string): Set<string> => {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  )
}

const toIso = (unixSeconds?: number): string | undefined => {
  if (!unixSeconds) return undefined
  const ms = unixSeconds * 1000
  const d = new Date(ms)
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined
}

const chunk = <T>(items: T[], size: number): T[][] => {
  if (items.length <= size) return [items]
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const authOrThrow = (response: { auth?: 0 | 1 }) => {
  if (response.auth === 0) {
    throw new Error('FreshRSS authentication failed (Fever API)')
  }
}

const syncFolders = async (folders: FeedFolder[], dbKey: string) => {
  if (!folders.length) return
  const now = Math.floor(Date.now() / 1000)
  await runWrite(
    async (db) => {
      await db.withTransactionAsync(async () => {
        for (const folder of folders) {
          await db.runAsync(
            `
            INSERT INTO feed_folders (id, title, createdAt)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title=excluded.title;
          `,
            [folder.id, folder.title, now],
          )
        }
      })
    },
    dbKey,
  )
}

const getMaxCachedItemId = async (dbKey: string): Promise<number> => {
  const db = await getDb(dbKey)
  const row = await db.getFirstAsync<{ maxId: number | null }>(
    `SELECT MAX(CAST(id AS INTEGER)) AS maxId FROM articles`,
  )
  return Number(row?.maxId ?? 0) || 0
}

const syncStatusesFromSets = async (unreadIds: Set<string>, savedIds: Set<string>, dbKey: string) => {
  const now = Math.floor(Date.now() / 1000)
  await runWrite(
    async (db) => {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `
          INSERT INTO article_statuses (articleId, read, starred, updatedAt)
          SELECT id, 1, 0, ?
          FROM articles
          ON CONFLICT(articleId) DO UPDATE SET
            read=excluded.read,
            starred=excluded.starred,
            updatedAt=excluded.updatedAt;
        `,
          [now],
        )

        const unreadList = Array.from(unreadIds)
        for (const batch of chunk(unreadList, 500)) {
          const placeholders = batch.map(() => '?').join(',')
          await db.runAsync(
            `
            UPDATE article_statuses
            SET read = 0, lastReadAt = NULL, updatedAt = ?
            WHERE articleId IN (${placeholders})
          `,
            [now, ...batch],
          )
        }

        const savedList = Array.from(savedIds)
        for (const batch of chunk(savedList, 500)) {
          const placeholders = batch.map(() => '?').join(',')
          await db.runAsync(
            `
            UPDATE article_statuses
            SET starred = 1, updatedAt = ?
            WHERE articleId IN (${placeholders})
          `,
            [now, ...batch],
          )
        }
      })
    },
    dbKey,
  )
}

export const createFreshRssStrategy = (account: Extract<ReaderAccount, { kind: 'freshrss' }>): ReaderStrategy => {
  const client = new FeverClient({ baseUrl: account.baseUrl, apiKey: account.apiKey })
  const dbKey = account.dbKey

  return {
    kind: account.kind,
    accountId: account.id,
    hydrate: async (feedId) => {
      const [feeds, folders] = await Promise.all([getFeedsFromDb(dbKey), getFoldersFromDb(dbKey)])
      const result: ReaderHydrateResult = { feeds, folders, articles: [] }
      return result
    },
    refresh: async () => {
      const sinceId = await getMaxCachedItemId(dbKey)

      const [groupsRes, feedsRes, feedsGroupsRes, itemsRes, idsRes] = await Promise.all([
        client.request<FeverGroupsResponse>({ groups: true }),
        client.request<FeverFeedsResponse>({ feeds: true }),
        client.request<FeverFeedsGroupsResponse>({ feeds_groups: true }),
        client.request<FeverItemsResponse>({ items: true, since_id: sinceId }),
        client.request<FeverIdsResponse>({ unread_item_ids: true, saved_item_ids: true }),
      ])

      authOrThrow(groupsRes)
      authOrThrow(feedsRes)
      authOrThrow(feedsGroupsRes)
      authOrThrow(itemsRes)
      authOrThrow(idsRes)

      const folders: FeedFolder[] = (groupsRes.groups ?? []).map((g) => ({
        id: String(g.id),
        title: g.title,
        createdAt: Math.floor(Date.now() / 1000),
      }))

      const feedToFolder = new Map<string, string>()
      ;(feedsGroupsRes.feeds_groups ?? []).forEach((mapping) => {
        // FreshRSS typically assigns feeds to a single category; if multiple exist, we keep the first.
        const feedId = String(mapping.feed_id)
        if (!feedToFolder.has(feedId)) {
          feedToFolder.set(feedId, String(mapping.group_id))
        }
      })

      const feeds: Feed[] = (feedsRes.feeds ?? []).map((f) => ({
        id: String(f.id),
        title: f.title,
        xmlUrl: f.url,
        htmlUrl: f.site_url,
        folderId: feedToFolder.get(String(f.id)) ?? null,
        lastUpdated: toIso(f.last_updated_on_time),
      }))

      const feedById = new Map<string, Feed>()
      feeds.forEach((f) => feedById.set(f.id, f))

      const articles: Article[] = (itemsRes.items ?? []).map((item) => {
        const feed = feedById.get(String(item.feed_id))
        const read = item.is_read === undefined ? false : item.is_read === 1
        const saved = item.is_saved === undefined ? false : item.is_saved === 1
        return {
          id: String(item.id),
          feedId: String(item.feed_id),
          title: item.title,
          link: item.url,
          source: feed?.title ?? 'FreshRSS',
          publishedAt: toIso(item.created_on_time),
          updatedAt: undefined,
          description: undefined,
          content: item.html,
          thumbnail: undefined,
          read,
          saved,
        }
      })

      await syncFolders(folders, dbKey)
      await upsertFeeds(feeds, dbKey)
      await upsertArticles(articles, dbKey)

      const unreadIds = parseIds(idsRes.unread_item_ids)
      const savedIds = parseIds(idsRes.saved_item_ids)
      await syncStatusesFromSets(unreadIds, savedIds, dbKey)

      return {
        feedsUsed: feeds,
        newArticlesCount: articles.length,
      }
    },
    articles: {
      listPage: async (params) => getArticlesPageFromDb({ ...params, dbKey }),
      get: async (id) => getArticleByIdFromDb(id, dbKey),
      upsert: async (articles) => upsertArticles(articles, dbKey),
      getUnreadCountsByFeed: async () => getUnreadCountsByFeedFromDb(dbKey),
      getUnreadCount: async (feedId) => getUnreadCountFromDb(feedId, dbKey),
      setRead: async (id, read) => {
        await client.request({ mark: 'item', as: read ? 'read' : 'unread', id })
        await setArticleRead(id, read, dbKey)
      },
      setSaved: async (id, saved) => {
        await client.request({ mark: 'item', as: saved ? 'saved' : 'unsaved', id })
        await setArticleSaved(id, saved, dbKey)
      },
      setManyRead: async (ids, read) => {
        // Fever API does not standardize bulk operations; do best-effort per-item.
        await Promise.all(
          ids.map((id) => client.request({ mark: 'item', as: read ? 'read' : 'unread', id })),
        )
        await setManyArticlesRead(ids, read, dbKey)
      },
      setAllRead: async (feedId) => {
        const ids = await getUnreadArticleIdsFromDb(feedId, dbKey)
        for (const batch of chunk(ids, 50)) {
          await Promise.all(batch.map((id) => client.request({ mark: 'item', as: 'read', id })))
        }
        await setAllArticlesReadFromDb(feedId, dbKey)
      },
      deleteOlderThan: async (olderThanMs) => deleteArticlesOlderThan(olderThanMs, dbKey),
    },
    feeds: {
      list: async () => getFeedsFromDb(dbKey),
      upsert: async () => {
        throw new Error('Feed management is not supported via the Fever API')
      },
      remove: async () => {
        throw new Error('Feed management is not supported via the Fever API')
      },
    },
    folders: {
      list: async () => getFoldersFromDb(dbKey),
      create: async () => {
        throw new Error('Category management is not supported via the Fever API')
      },
      rename: async () => {
        throw new Error('Category management is not supported via the Fever API')
      },
      delete: async () => {
        throw new Error('Category management is not supported via the Fever API')
      },
      setFeedFolder: async () => {
        throw new Error('Category management is not supported via the Fever API')
      },
    },
  }
}
