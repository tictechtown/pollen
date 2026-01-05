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
  importOpml: (uri: string) => {
    const strategy = getActiveReaderStrategy()
    if (!strategy.importOpml) {
      throw new Error('OPML import is not supported for this account')
    }
    return strategy.importOpml(uri)
  },
  articles: {
    list: (feedId?: string) => getActiveReaderStrategy().articles.list(feedId),
    upsert: (articles: Parameters<ReaderStrategy['articles']['upsert']>[0]) =>
      getActiveReaderStrategy().articles.upsert(articles),
    getUnreadCountsByFeed: () => getActiveReaderStrategy().articles.getUnreadCountsByFeed(),
    setRead: (id: string, read: boolean) => getActiveReaderStrategy().articles.setRead(id, read),
    setSaved: (id: string, saved: boolean) =>
      getActiveReaderStrategy().articles.setSaved(id, saved),
    setManyRead: (ids: string[], read: boolean) =>
      getActiveReaderStrategy().articles.setManyRead(ids, read),
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

