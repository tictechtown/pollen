import type { Article, Feed, FeedFolder } from '@/types'

export type ReaderAccount =
  | { id: 'local'; kind: 'local' }
  | {
      id: string
      kind: 'freshrss'
      baseUrl: string
      apiKey: string
      /**
       * Namespace key for isolating the SQLite cache per account.
       * This is used as a suffix in the DB filename.
       */
      dbKey: string
    }

export type ReaderRefreshReason = 'manual' | 'foreground' | 'background'

export type ReaderRefreshContext = {
  reason: ReaderRefreshReason
  selectedFeedId?: string
}

export type ReaderRefreshResult = {
  feedsUsed: Feed[]
  newArticlesCount: number
}

export type ReaderHydrateResult = {
  feeds: Feed[]
  folders: FeedFolder[]
  articles: Article[]
}

export type ReaderArticlesListPageParams = {
  feedId?: string
  unreadOnly?: boolean
  savedOnly?: boolean
  page: number
  pageSize: number
}

export type ReaderArticlesListPageResult = {
  articles: Article[]
  total: number
}

export type ReaderArticlesApi = {
  listPage: (params: ReaderArticlesListPageParams) => Promise<ReaderArticlesListPageResult>
  get: (id: string) => Promise<Article | null>
  upsert: (articles: Article[]) => Promise<void>
  getUnreadCountsByFeed: () => Promise<Map<string, number>>
  getUnreadCount: (feedId?: string) => Promise<number>
  setRead: (id: string, read: boolean) => Promise<void>
  setSaved: (id: string, saved: boolean) => Promise<void>
  setManyRead: (ids: string[], read: boolean) => Promise<void>
  setAllRead: (feedId?: string) => Promise<void>
  deleteOlderThan: (olderThanMs: number) => Promise<void>
}

export type ReaderFeedsApi = {
  list: () => Promise<Feed[]>
  upsert: (feeds: Feed[]) => Promise<void>
  remove: (id: string) => Promise<void>
}

export type ReaderFoldersApi = {
  list: () => Promise<FeedFolder[]>
  create: (title: string) => Promise<FeedFolder>
  rename: (id: string, title: string) => Promise<void>
  delete: (id: string) => Promise<void>
  setFeedFolder: (feedId: string, folderId: string | null) => Promise<void>
}

export type ReaderStrategy = {
  kind: ReaderAccount['kind']
  accountId: string
  hydrate: (feedId?: string) => Promise<ReaderHydrateResult>
  refresh: (context: ReaderRefreshContext) => Promise<ReaderRefreshResult | null>
  importOpml?: (uri: string) => Promise<Feed[]>
  articles: ReaderArticlesApi
  feeds: ReaderFeedsApi
  folders: ReaderFoldersApi
}
