import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'

import { Article } from '@/types'

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
        name: '6-rss-reader-articles',
        storage: createJSONStorage(() => AsyncStorage),
        version: 1,
      },
    ),
  ),
)
