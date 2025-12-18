import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { Article } from '@/types'

type ArticlesState = {
  articles: Article[]
  setArticles: (articles: Article[]) => void
  upsertArticle: (article: Article) => void
  updateSavedLocal: (id: string, saved: boolean) => void
  clear: () => void
}

export const useArticlesStore = create<ArticlesState>()(
  devtools((set) => ({
    articles: [],
    setArticles: (articles) => {
      console.trace('set articles')
      set({ articles })
    },
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
    clear: () => set({ articles: [] }),
  })),
)
