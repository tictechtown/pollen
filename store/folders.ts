// Zustand store for feed folder list state.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { FeedFolder } from '@/types'

type FoldersState = {
  folders: FeedFolder[]
  setFolders: (folders: FeedFolder[]) => void
  addFolder: (folder: FeedFolder) => void
  updateFolder: (folder: FeedFolder) => void
  removeFolder: (id: string) => void
  clear: () => void
}

export const useFoldersStore = create<FoldersState>()(
  devtools((set) => ({
    folders: [],
    setFolders: (folders) => set({ folders }),
    addFolder: (folder) =>
      set((state) => ({
        folders: state.folders.find((f) => f.id === folder.id)
          ? state.folders
          : [...state.folders, folder],
      })),
    updateFolder: (folder) =>
      set((state) => ({
        folders: state.folders.map((f) => (f.id === folder.id ? folder : f)),
      })),
    removeFolder: (id) =>
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== id),
      })),
    clear: () => set({ folders: [] }),
  })),
)
