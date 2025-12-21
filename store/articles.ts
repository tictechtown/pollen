// Zustand store for article list and local read/saved state.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { Article } from '@/types'

type ArticlesState = {
  articles: Article[]
  initialized: boolean
  setInitialized: () => void
  setArticles: (articles: Article[]) => void
  upsertArticle: (article: Article) => void
  updateSavedLocal: (id: string, saved: boolean) => void
  updateSeenLocal: (id: string, seen: boolean) => void
  clear: () => void
}

export const useArticlesStore = create<ArticlesState>()(
  devtools((set) => ({
    articles: [],
    initialized: false,
    setArticles: (articles) => {
      console.trace('set articles', articles.length)
      set({ articles })
    },
    setInitialized: () => set({ initialized: true }),
    upsertArticle: (article) =>
      set((state) => {
        const exists = state.articles.find((a) => a.id === article.id)
        return {
          articles: exists
            ? state.articles.map((a) => (a.id === article.id ? { ...exists, ...article } : a))
            : [article, ...state.articles],
        }
      }),
    updateSavedLocal: (id, saved) =>
      set((state) => ({
        articles: state.articles.map((a) => (a.id === id ? { ...a, saved } : a)),
      })),
    updateSeenLocal: (id, seen) =>
      set((state) => ({
        articles: state.articles.map((a) => (a.id === id ? { ...a, seen } : a)),
      })),
    clear: () => set({ articles: [] }),
  })),
)
