// Global refresh store for coordinating feed updates across the app.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { readerApi } from '@/services/reader-api'
import type { ReaderRefreshResult as RefreshResult } from '@/services/reader-api/types'
import { useArticlesStore } from '@/store/articles'
import { useFeedsStore } from '@/store/feeds'

const FOREGROUND_STALE_MS = 5 * 60 * 1000

export type RefreshReason = 'manual' | 'foreground' | 'background'

export type RefreshContext = {
  reason: RefreshReason
  selectedFeedId?: string
}

type RefreshStatus = 'idle' | 'loading' | 'error'
type HydrationStatus = 'idle' | 'loading' | 'done'

type RefreshState = {
  status: RefreshStatus
  hydrationStatus: HydrationStatus
  hydratedFeedId: string | null
  lastRefreshAt: number | null
  lastError: string | null
  blockedUntilManual: boolean
  refresh: (context: RefreshContext) => Promise<RefreshResult | null>
  hydrate: (feedId?: string) => Promise<void>
}

let refreshPromise: Promise<RefreshResult | null> | null = null

/**
 * Load stored data from DB and populate the current store
 * @param feedId
 */
const hydrateStores = async (feedId?: string) => {
  const { feeds } = await readerApi.hydrate(feedId)
  const { setFeeds } = useFeedsStore.getState()
  const { invalidate } = useArticlesStore.getState()
  if (feeds.length) {
    setFeeds(feeds)
  }
  invalidate()
}

export const useRefreshStore = create<RefreshState>()(
  devtools((set, get) => ({
    status: 'idle',
    hydrationStatus: 'idle',
    hydratedFeedId: null,
    lastRefreshAt: null,
    lastError: null,
    blockedUntilManual: false,
    hydrate: async (feedId) => {
      set({
        hydrationStatus: 'loading',
        lastError: null,
      })
      try {
        await hydrateStores(feedId)
        set({
          hydrationStatus: 'done',
          hydratedFeedId: feedId ?? null,
        })
      } catch (error) {
        set({
          hydrationStatus: 'idle',
          lastError: error instanceof Error ? error.message : 'Failed to hydrate',
        })
        throw error
      }
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

      refreshPromise = readerApi.refresh({
        selectedFeedId: context.selectedFeedId,
        reason: context.reason,
      })
        .then(async (result) => {
          if (!result) return null
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
