// Zustand store for article list and local read/saved state.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { Article } from '@/types'

type ArticlesState = {
  articles: Article[]
  localSavedArticles: Map<string, boolean>
  localReadArticles: Map<string, boolean>
  initialized: boolean
  setInitialized: () => void
  setArticles: (articles: Article[]) => void
  upsertArticle: (article: Article) => void
  updateSavedLocal: (id: string, saved: boolean) => void
  updateReadLocal: (id: string, read: boolean) => void
  clear: () => void
}

export const useArticlesStore = create<ArticlesState>()(
  devtools((set) => ({
    articles: [],
    localSavedArticles: {},
    localReadArticles: {},
    initialized: false,
    setArticles: (articles) => {
      const localReadArticles = new Map(articles.map((a) => [a.id, a.read]))
      const localSavedArticles = new Map(articles.map((a) => [a.id, a.saved]))
      set({ articles, localReadArticles, localSavedArticles })
    },
    setInitialized: () => set({ initialized: true }),
    upsertArticle: (article) =>
      set((state) => {
        const exists = state.articles.find((a) => a.id === article.id)
        // TODO - update localRead and localSaved
        return {
          articles: exists
            ? state.articles.map((a) => (a.id === article.id ? { ...exists, ...article } : a))
            : [article, ...state.articles],
        }
      }),
    updateSavedLocal: (id, saved) =>
      set((state) => {
        return {
          localSavedArticles: new Map(state.localSavedArticles).set(id, saved),
        }
      }),
    updateReadLocal: (id, read) =>
      set((state) => ({
        localReadArticles: new Map(state.localReadArticles).set(id, read),
      })),
    clear: () => set({ articles: [], localSavedArticles: new Map(), localReadArticles: new Map() }),
  })),
)
