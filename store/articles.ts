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
    localSavedArticles: new Map(),
    localReadArticles: new Map(),
    initialized: false,
    setArticles: (articles) => {
      const localReadArticles = new Map(articles.map((a) => [a.id, a.read]))
      const localSavedArticles = new Map(articles.map((a) => [a.id, a.saved]))
      set({ articles, localReadArticles, localSavedArticles })
    },
    setInitialized: () => set({ initialized: true }),
    upsertArticle: (article) =>
      set((state) => {
        const existing = state.articles.find((a) => a.id === article.id)
        const merged = existing ? { ...existing, ...article } : article
        const articles = existing
          ? state.articles.map((a) => (a.id === article.id ? merged : a))
          : [merged, ...state.articles]
        const localReadArticles = new Map(state.localReadArticles).set(merged.id, merged.read)
        const localSavedArticles = new Map(state.localSavedArticles).set(merged.id, merged.saved)
        return { articles, localReadArticles, localSavedArticles }
      }),
    updateSavedLocal: (id, saved) =>
      set((state) => ({
        localSavedArticles: new Map(state.localSavedArticles).set(id, saved),
        articles: state.articles.map((article) => (article.id === id ? { ...article, saved } : article)),
      })),
    updateReadLocal: (id, read) =>
      set((state) => ({
        localReadArticles: new Map(state.localReadArticles).set(id, read),
        articles: state.articles.map((article) => (article.id === id ? { ...article, read } : article)),
      })),
    clear: () => set({ articles: [], localSavedArticles: new Map(), localReadArticles: new Map() }),
  })),
)
