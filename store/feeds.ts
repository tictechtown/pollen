// Zustand store for feed list state.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { Feed } from '@/types'

type FeedsState = {
  feeds: Feed[]
  setFeeds: (feeds: Feed[]) => void
  addFeed: (feed: Feed) => void
  addFeeds: (feeds: Feed[]) => void
  removeFeed: (id: string) => void
  clear: () => void
}

export const useFeedsStore = create<FeedsState>()(
  devtools((set) => ({
    feeds: [],
    setFeeds: (feeds) => set({ feeds }),
    addFeed: (feed) =>
      set((state) => ({
        // TODO - sort those feeds per title name
        feeds: state.feeds.find((f) => f.id === feed.id) ? state.feeds : [...state.feeds, feed],
      })),
    addFeeds: (feeds) =>
      set((state) => ({
        // TODO - sort those feeds per title name
        feeds: [...state.feeds, ...feeds],
      })),
    removeFeed: (id) =>
      set((state) => ({
        feeds: state.feeds.filter((feed) => feed.id !== id),
      })),
    clear: () => set({ feeds: [] }),
  })),
)
