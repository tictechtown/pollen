import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'

import { Article } from '@/types'

const pruneArticle = (article: Article): Article => ({
  ...article,
  // Drop large fields to keep persistence lightweight
  content: undefined,
  description: article.description ? article.description.slice(0, 500) : undefined,
})

type ArticlesState = {
  articles: Article[]
  lastFetched?: number
  setArticles: (articles: Article[]) => void
  toggleSeen: (id: string) => void
  toggleSaved: (id: string) => void
  upsertArticle: (article: Article) => void
  clear: () => void
}

export const useArticlesStore = create<ArticlesState>()(
  devtools(
    persist(
      (set) => ({
        articles: [],
        lastFetched: undefined,
        setArticles: (articles) =>
          set(() => ({
            articles,
            lastFetched: Date.now(),
          })),
        toggleSeen: (id) =>
          set((state) => ({
            articles: state.articles.map((a) => (a.id === id ? { ...a, seen: !a.seen } : a)),
          })),
        toggleSaved: (id) =>
          set((state) => ({
            articles: state.articles.map((a) => (a.id === id ? { ...a, saved: !a.saved } : a)),
          })),
        upsertArticle: (article) =>
          set((state) => {
            const exists = state.articles.find((a) => a.id === article.id)
            return {
              articles: exists
                ? state.articles.map((a) => (a.id === article.id ? { ...exists, ...article } : a))
                : [article, ...state.articles],
            }
          }),
        clear: () => set({ articles: [], lastFetched: undefined }),
      }),
      {
        name: '12-rss-reader-articles',
        storage: createJSONStorage(() => AsyncStorage),
        version: 2,
        partialize: (state) => ({
          articles: state.articles.map(pruneArticle),
          lastFetched: state.lastFetched,
        }),
        migrate: (persistedState, version) => {
          if (!persistedState) return { articles: [], lastFetched: undefined }
          if (version < 2) {
            const casted = persistedState as ArticlesState
            return {
              ...casted,
              articles: casted.articles.map(pruneArticle),
            }
          }
          return persistedState as ArticlesState
        },
      },
    ),
  ),
)
