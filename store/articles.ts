// Zustand store for article list and local read/saved state.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type ArticlesState = {
  localSavedArticles: Map<string, boolean>
  localReadArticles: Map<string, boolean>
  initialized: boolean
  version: number
  setInitialized: () => void
  invalidate: () => void
  updateSavedLocal: (id: string, saved: boolean) => void
  updateReadLocal: (id: string, read: boolean) => void
  clear: () => void
}

export const useArticlesStore = create<ArticlesState>()(
  devtools((set) => ({
    localSavedArticles: new Map(),
    localReadArticles: new Map(),
    initialized: false,
    version: 0,
    setInitialized: () => set({ initialized: true }),
    invalidate: () => set((state) => ({ version: state.version + 1 })),
    updateSavedLocal: (id, saved) =>
      set((state) => ({
        localSavedArticles: new Map(state.localSavedArticles).set(id, saved),
      })),
    updateReadLocal: (id, read) =>
      set((state) => ({
        localReadArticles: new Map(state.localReadArticles).set(id, read),
      })),
    clear: () => set({ localSavedArticles: new Map(), localReadArticles: new Map() }),
  })),
)
