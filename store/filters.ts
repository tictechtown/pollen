// Zustand store for selected feed filter state.
import { create } from 'zustand'

type FiltersState = {
  selectedFeedId?: string
  selectedFeedTitle?: string
  showUnreadOnly: boolean
  setFeedFilter: (feedId?: string, title?: string) => void
  clear: () => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  selectedFeedId: undefined,
  selectedFeedTitle: undefined,
  showUnreadOnly: false,
  setFeedFilter: (selectedFeedId, selectedFeedTitle) => set({ selectedFeedId, selectedFeedTitle }),
  clear: () =>
    set({
      selectedFeedId: undefined,
      selectedFeedTitle: undefined,
    }),
}))
