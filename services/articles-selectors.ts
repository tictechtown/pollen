import type { Article } from '@/types'

export const selectFeedArticles = (articles: Article[], selectedFeedId?: string): Article[] => {
  if (selectedFeedId) {
    return articles.filter((article) => article.feedId === selectedFeedId)
  }

  return articles.filter((article) => Boolean(article.feedId))
}

export const selectUnreadArticles = (articles: Article[], unreadOnly: boolean): Article[] =>
  unreadOnly ? articles.filter((article) => !article.read) : articles

export const getTotalPages = (totalItems: number, pageSize: number): number =>
  Math.max(1, Math.ceil(totalItems / pageSize))

export const selectPaged = <T>(items: T[], page: number, pageSize: number): T[] =>
  items.slice(0, Math.max(1, page) * pageSize)

export const selectSavedArticles = (
  articles: Article[],
  savedStatus: Map<string, boolean>,
): Article[] => articles.filter((article) => savedStatus.get(article.id))
