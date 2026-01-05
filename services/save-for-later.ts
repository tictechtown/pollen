import { readerApi } from '@/services/reader-api'
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
  id: string
}

export const getSavedArticleId = (url: string): string => encodeBase64(url) ?? url

const buildSavedArticle = (url: string): Article => {
  const id = getSavedArticleId(url)
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
    read: false,
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
  const id = getSavedArticleId(url)
  const existing = articles.find((article) => article.id === id)

  if (existing) {
    if (existing.saved) {
      return { status: 'already-saved', id }
    }
    await readerApi.articles.setSaved(existing.id, true)
    updateSavedLocal(existing.id, true)
    return { status: 'saved', id }
  }

  const newArticle = buildSavedArticle(url)
  await readerApi.articles.upsert([newArticle])
  upsertArticleLocal(newArticle)
  void fetchPageMetadata(url)
    .then(async (metadata) => {
      if (!hasMetadata(metadata)) return
      const enriched = applyMetadata(newArticle, metadata)
      await readerApi.articles.upsert([enriched])
      upsertArticleLocal(enriched)
    })
    .catch(() => {
      // Metadata fetch is best-effort and should not block saving.
    })
  return { status: 'saved', id }
}
