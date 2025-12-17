import { create } from 'zustand'

type FiltersState = {
  selectedFeedId?: string
  selectedFeedTitle?: string
  showUnseenOnly: boolean
  setFeedFilter: (feedId?: string, title?: string) => void
  setShowUnseenOnly: (value: boolean) => void
  clear: () => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  selectedFeedId: undefined,
  selectedFeedTitle: undefined,
  showUnseenOnly: false,
  setFeedFilter: (selectedFeedId, selectedFeedTitle) => set({ selectedFeedId, selectedFeedTitle }),
  setShowUnseenOnly: (showUnseenOnly) => set({ showUnseenOnly }),
  clear: () =>
    set({
      selectedFeedId: undefined,
      selectedFeedTitle: undefined,
      showUnseenOnly: false,
    }),
}))
