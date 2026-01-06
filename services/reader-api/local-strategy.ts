import {
  deleteArticlesOlderThan,
  getArticleByIdFromDb,
  getArticlesPageFromDb,
  getUnreadCountFromDb,
  getUnreadCountsByFeedFromDb,
  setAllArticlesReadFromDb,
  setArticleRead,
  setArticleSaved,
  setManyArticlesRead,
  upsertArticles,
} from '@/services/articles-db'
import { getFeedsFromDb, removeFeedFromDb, upsertFeeds } from '@/services/feeds-db'
import { createFolderInDb, deleteFolderInDb, getFoldersFromDb, renameFolderInDb, setFeedFolderIdInDb } from '@/services/folders-db'
import { hydrateArticlesAndFeeds, importFeedsFromOpmlUri, refreshFeedsAndArticles } from '@/services/refresh'
import type { ReaderAccount, ReaderHydrateResult, ReaderStrategy } from '@/services/reader-api/types'

export const createLocalStrategy = (): ReaderStrategy => {
  const account: ReaderAccount = { id: 'local', kind: 'local' }

  return {
    kind: account.kind,
    accountId: account.id,
    hydrate: async (feedId) => {
      const [{ feeds, articles }, folders] = await Promise.all([
        hydrateArticlesAndFeeds(feedId),
        getFoldersFromDb(),
      ])
      const result: ReaderHydrateResult = { feeds, folders, articles }
      return result
    },
    refresh: async (context) => {
      const result = await refreshFeedsAndArticles({
        selectedFeedId: context.selectedFeedId,
        reason: context.reason,
      })
      return result
    },
    importOpml: async (uri) => importFeedsFromOpmlUri(uri),
    articles: {
      listPage: async (params) => getArticlesPageFromDb({ ...params, dbKey: undefined }),
      get: async (id) => getArticleByIdFromDb(id),
      upsert: async (articles) => upsertArticles(articles),
      getUnreadCountsByFeed: async () => getUnreadCountsByFeedFromDb(),
      getUnreadCount: async (feedId) => getUnreadCountFromDb(feedId),
      setRead: async (id, read) => setArticleRead(id, read),
      setSaved: async (id, saved) => setArticleSaved(id, saved),
      setManyRead: async (ids, read) => setManyArticlesRead(ids, read),
      setAllRead: async (feedId) => setAllArticlesReadFromDb(feedId),
      deleteOlderThan: async (olderThanMs) => deleteArticlesOlderThan(olderThanMs),
    },
    feeds: {
      list: async () => getFeedsFromDb(),
      upsert: async (feeds) => upsertFeeds(feeds),
      remove: async (id) => removeFeedFromDb(id),
    },
    folders: {
      list: async () => getFoldersFromDb(),
      create: async (title) => createFolderInDb(title),
      rename: async (id, title) => renameFolderInDb(id, title),
      delete: async (id) => deleteFolderInDb(id),
      setFeedFolder: async (feedId, folderId) => setFeedFolderIdInDb(feedId, folderId),
    },
  }
}
