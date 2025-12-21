import { setArticleSaved, upsertArticles } from '@/services/articles-db'
import { encodeBase64, fetchPageMetadata, PageMetadata } from '@/services/rssClient'
import { Article } from '@/types'

type SaveForLaterParams = {
  url: string
  articles: Article[]
  updateSavedLocal: (id: string, saved: boolean) => void
  upsertArticleLocal: (article: Article) => void
}

type SaveForLaterResult = {
  status: 'saved' | 'already-saved'
}

const buildSavedArticle = (url: string): Article => {
  const id = encodeBase64(url) ?? url
  const hostname = (() => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  })()
  return {
    id,
    link: url,
    feedId: undefined,
    title: url,
    source: hostname,
    saved: true,
    seen: false,
    publishedAt: new Date().toISOString(),
  }
}

const applyMetadata = (article: Article, metadata: PageMetadata): Article => ({
  ...article,
  title: metadata.title?.trim() || article.title,
  source: metadata.source?.trim() || article.source,
  description: metadata.description ?? article.description,
  thumbnail: metadata.thumbnail ?? article.thumbnail,
  publishedAt: metadata.publishedAt ?? article.publishedAt,
})

const hasMetadata = (metadata: PageMetadata) =>
  Boolean(
    metadata.title ||
      metadata.description ||
      metadata.thumbnail ||
      metadata.publishedAt ||
      metadata.source,
  )

export const saveArticleForLater = async ({
  url,
  articles,
  updateSavedLocal,
  upsertArticleLocal,
}: SaveForLaterParams): Promise<SaveForLaterResult> => {
  const id = encodeBase64(url) ?? url
  const existing = articles.find((article) => article.id === id)

  if (existing) {
    if (existing.saved) {
      return { status: 'already-saved' }
    }
    await setArticleSaved(existing.id, true)
    updateSavedLocal(existing.id, true)
    return { status: 'saved' }
  }

  const newArticle = buildSavedArticle(url)
  await upsertArticles([newArticle])
  upsertArticleLocal(newArticle)
  const metadata = await fetchPageMetadata(url)
  if (hasMetadata(metadata)) {
    const enriched = applyMetadata(newArticle, metadata)
    await upsertArticles([enriched])
    upsertArticleLocal(enriched)
  }
  return { status: 'saved' }
}
