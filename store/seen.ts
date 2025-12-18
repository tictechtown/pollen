import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type SeenState = {
  seenIds: Set<string>
  hydrate: () => void
  markSeen: (id: string, seen?: boolean) => void
  markManySeen: (ids: string[]) => void
  isSeen: (id: string) => boolean
  clear: () => void
}

const STORAGE_KEY = 'rss-reader-seen-v1'

export const useSeenStore = create<SeenState>()(
  persist(
    (set, get) => ({
      seenIds: new Set<string>(),
      hydrate: () => {
        const current = get().seenIds
        if (current.size) return
        // hydration handled by persist middleware
      },
      markSeen: (id, seen = true) =>
        set((state) => {
          const next = new Set(state.seenIds)
          if (seen) {
            next.add(id)
          } else {
            next.delete(id)
          }
          return { seenIds: next }
        }),
      markManySeen: (ids) =>
        set((state) => {
          const next = new Set(state.seenIds)
          ids.forEach((id) => next.add(id))
          return { seenIds: next }
        }),
      isSeen: (id) => get().seenIds.has(id),
      clear: () => set({ seenIds: new Set() }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ seenIds: Array.from(state.seenIds) }),
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState
        const persisted = persistedState as { state?: { seenIds?: string[] } }
        const merged = new Set([...(persisted.state?.seenIds ?? []), ...currentState.seenIds])
        return { ...currentState, seenIds: merged }
      },
    },
  ),
)
