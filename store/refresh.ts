// Global refresh store for coordinating feed updates across the app.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import {
  hydrateArticlesAndFeeds,
  refreshFeedsAndArticles,
  type RefreshResult,
} from '@/services/refresh'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'

const FOREGROUND_STALE_MS = 5 * 60 * 1000

export type RefreshReason = 'manual' | 'foreground' | 'background'

export type RefreshContext = {
  reason: RefreshReason
  selectedFeedId?: string
}

type RefreshStatus = 'idle' | 'loading' | 'error'

type RefreshState = {
  status: RefreshStatus
  lastRefreshAt: number | null
  lastError: string | null
  blockedUntilManual: boolean
  refresh: (context: RefreshContext) => Promise<RefreshResult | null>
  hydrate: (feedId?: string) => Promise<void>
}

let refreshPromise: Promise<RefreshResult> | null = null

/**
 * Load stored data from DB and populate the current store
 * @param feedId
 */
const hydrateStores = async (feedId?: string) => {
  const { feeds, articles } = await hydrateArticlesAndFeeds(feedId)
  const { setFeeds } = useFeedsStore.getState()
  const { setArticles } = useArticlesStore.getState()
  if (feeds.length) {
    setFeeds(feeds)
  }
  setArticles(articles)
}

export const useRefreshStore = create<RefreshState>()(
  devtools((set, get) => ({
    status: 'idle',
    lastRefreshAt: null,
    lastError: null,
    blockedUntilManual: false,
    hydrate: async (feedId) => {
      await hydrateStores(feedId)
    },
    refresh: async (context) => {
      const state = get()
      if (refreshPromise) {
        return refreshPromise
      }

      if (state.blockedUntilManual && context.reason !== 'manual') {
        return null
      }

      if (
        context.reason === 'foreground' &&
        state.lastRefreshAt &&
        Date.now() - state.lastRefreshAt < FOREGROUND_STALE_MS
      ) {
        return null
      }

      set({
        status: 'loading',
        lastError: null,
        blockedUntilManual: false,
      })

      console.log('[useRefreshStore] refresh', !!refreshPromise)

      refreshPromise = refreshFeedsAndArticles({
        selectedFeedId: context.selectedFeedId,
        reason: context.reason,
      })
        .then(async (result) => {
          const hasFeeds = result.feedsUsed.length > 0
          set({
            status: hasFeeds ? 'idle' : 'error',
            lastRefreshAt: Date.now(),
            blockedUntilManual: false,
          })
          if (context.reason !== 'background') {
            await hydrateStores(context.selectedFeedId)
          }
          return result
        })
        .catch((error) => {
          set({
            status: 'error',
            lastError: error instanceof Error ? error.message : 'Failed to refresh',
            blockedUntilManual: true,
          })
          throw error
        })
        .finally(() => {
          refreshPromise = null
        })

      return refreshPromise
    },
  })),
)
