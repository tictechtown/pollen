import { useReaderAccountsStore } from '@/store/reader-accounts'

import { createFreshRssStrategy } from './freshrss-strategy'
import { createLocalStrategy } from './local-strategy'
import type { ReaderAccount, ReaderStrategy } from './types'

const strategyCache = new Map<string, ReaderStrategy>()

const getAccountById = (id: string): ReaderAccount | null => {
  const { accounts } = useReaderAccountsStore.getState()
  return accounts.find((account) => account.id === id) ?? null
}

export const getActiveReaderAccount = (): ReaderAccount => {
  const { activeAccountId } = useReaderAccountsStore.getState()
  return getAccountById(activeAccountId) ?? { id: 'local', kind: 'local' }
}

const getStrategyForAccount = (account: ReaderAccount): ReaderStrategy => {
  const cached = strategyCache.get(account.id)
  if (cached && cached.kind === account.kind) return cached

  const strategy =
    account.kind === 'local' ? createLocalStrategy() : createFreshRssStrategy(account)

  strategyCache.set(account.id, strategy)
  return strategy
}

export const getActiveReaderStrategy = (): ReaderStrategy =>
  getStrategyForAccount(getActiveReaderAccount())

export const readerApi = {
  hydrate: (feedId?: string) => getActiveReaderStrategy().hydrate(feedId),
  refresh: (context: Parameters<ReaderStrategy['refresh']>[0]) =>
    getActiveReaderStrategy().refresh(context),
  importOpml: (
    uri: string,
    options?: Parameters<NonNullable<ReaderStrategy['importOpml']>>[1],
  ) => {
    const strategy = getActiveReaderStrategy()
    if (!strategy.importOpml) {
      throw new Error('OPML import is not supported for this account')
    }
    return strategy.importOpml(uri, options)
  },
  articles: {
    listPage: (params: Parameters<ReaderStrategy['articles']['listPage']>[0]) =>
      getActiveReaderStrategy().articles.listPage(params),
    searchPage: (params: Parameters<ReaderStrategy['articles']['searchPage']>[0]) =>
      getActiveReaderStrategy().articles.searchPage(params),
    get: (id: string) => getActiveReaderStrategy().articles.get(id),
    upsert: (articles: Parameters<ReaderStrategy['articles']['upsert']>[0]) =>
      getActiveReaderStrategy().articles.upsert(articles),
    getUnreadCountsByFeed: () => getActiveReaderStrategy().articles.getUnreadCountsByFeed(),
    getUnreadCount: (filters?: { feedId?: string; folderId?: string }) =>
      getActiveReaderStrategy().articles.getUnreadCount(filters),
    setRead: (id: string, read: boolean) => getActiveReaderStrategy().articles.setRead(id, read),
    setSaved: (id: string, saved: boolean) =>
      getActiveReaderStrategy().articles.setSaved(id, saved),
    setManyRead: (ids: string[], read: boolean) =>
      getActiveReaderStrategy().articles.setManyRead(ids, read),
    setAllRead: (filters?: { feedId?: string; folderId?: string }) =>
      getActiveReaderStrategy().articles.setAllRead(filters),
    deleteOlderThan: (olderThanMs: number) =>
      getActiveReaderStrategy().articles.deleteOlderThan(olderThanMs),
  },
  feeds: {
    list: () => getActiveReaderStrategy().feeds.list(),
    upsert: (feeds: Parameters<ReaderStrategy['feeds']['upsert']>[0]) =>
      getActiveReaderStrategy().feeds.upsert(feeds),
    remove: (id: string) => getActiveReaderStrategy().feeds.remove(id),
  },
  folders: {
    list: () => getActiveReaderStrategy().folders.list(),
    create: (title: string) => getActiveReaderStrategy().folders.create(title),
    rename: (id: string, title: string) => getActiveReaderStrategy().folders.rename(id, title),
    delete: (id: string) => getActiveReaderStrategy().folders.delete(id),
    setFeedFolder: (feedId: string, folderId: string | null) =>
      getActiveReaderStrategy().folders.setFeedFolder(feedId, folderId),
  },
} as const
