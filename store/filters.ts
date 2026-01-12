// Zustand store for selected feed filter state.
import { create } from 'zustand'

type FiltersState = {
  selectedFeedId?: string
  selectedFeedTitle?: string
  selectedFolderId?: string
  selectedFolderTitle?: string
  showUnreadOnly: boolean
  setFeedFilter: (feedId?: string, title?: string) => void
  setFolderFilter: (folderId?: string, title?: string) => void
  clear: () => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  selectedFeedId: undefined,
  selectedFeedTitle: undefined,
  selectedFolderId: undefined,
  selectedFolderTitle: undefined,
  showUnreadOnly: false,
  setFeedFilter: (selectedFeedId, selectedFeedTitle) =>
    set({
      selectedFeedId,
      selectedFeedTitle,
      selectedFolderId: undefined,
      selectedFolderTitle: undefined,
    }),
  setFolderFilter: (selectedFolderId, selectedFolderTitle) =>
    set({
      selectedFeedId: undefined,
      selectedFeedTitle: undefined,
      selectedFolderId,
      selectedFolderTitle,
    }),
  clear: () =>
    set({
      selectedFeedId: undefined,
      selectedFeedTitle: undefined,
      selectedFolderId: undefined,
      selectedFolderTitle: undefined,
    }),
}))
