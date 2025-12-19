import { create } from 'zustand'

type FiltersState = {
  selectedFeedId?: string
  selectedFeedTitle?: string
  setFeedFilter: (feedId?: string, title?: string) => void
  clear: () => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  selectedFeedId: undefined,
  selectedFeedTitle: undefined,
  showUnseenOnly: false,
  setFeedFilter: (selectedFeedId, selectedFeedTitle) => set({ selectedFeedId, selectedFeedTitle }),
  clear: () =>
    set({
      selectedFeedId: undefined,
      selectedFeedTitle: undefined,
    }),
}))
