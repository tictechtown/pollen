// Zustand store for article list and local read/saved state.
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { Article } from '@/types'

type ArticlesState = {
  articles: Article[]
  localSavedArticles: Map<string, boolean>
  localSeenArticles: Map<string, boolean>
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
    localSavedArticles: {},
    localSeenArticles: {},
    initialized: false,
    setArticles: (articles) => {
      const localSeenArticles = new Map(articles.map((a) => [a.id, a.seen]))
      const localSavedArticles = new Map(articles.map((a) => [a.id, a.saved]))
      set({ articles, localSeenArticles, localSavedArticles })
    },
    setInitialized: () => set({ initialized: true }),
    upsertArticle: (article) =>
      set((state) => {
        const exists = state.articles.find((a) => a.id === article.id)
        // TODO - update localSeen and localSaved
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
    updateSeenLocal: (id, seen) =>
      set((state) => ({
        localSeenArticles: new Map(state.localSeenArticles).set(id, seen),
      })),
    clear: () => set({ articles: [], localSavedArticles: new Map(), localSeenArticles: new Map() }),
  })),
)
