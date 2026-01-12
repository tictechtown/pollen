export type ArticleMode = 'rss' | 'reader'

export const toggleArticleMode = (current: ArticleMode): ArticleMode =>
  current === 'rss' ? 'reader' : 'rss'
