import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { Feed } from '@/types'

type FeedsState = {
  feeds: Feed[]
  setFeeds: (feeds: Feed[]) => void
  addFeed: (feed: Feed) => void
  removeFeed: (id: string) => void
  clear: () => void
}

export const useFeedsStore = create<FeedsState>()(
  devtools((set) => ({
    feeds: [],
    setFeeds: (feeds) => set({ feeds }),
    addFeed: (feed) =>
      set((state) => ({
        feeds: state.feeds.find((f) => f.url === feed.url) ? state.feeds : [...state.feeds, feed],
      })),
    removeFeed: (id) =>
      set((state) => ({
        feeds: state.feeds.filter((feed) => feed.id !== id),
      })),
    clear: () => set({ feeds: [] }),
  })),
)
