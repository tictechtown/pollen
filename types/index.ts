export type Article = {
  id: string
  title: string
  link: string
  source: string
  publishedAt?: string
  updatedAt?: string
  description?: string
  content?: string
  thumbnail?: string
  feedId?: string
  seen: boolean
  saved: boolean
}

export type Feed = {
  id: string
  title: string
  xmlUrl: string
  htmlUrl?: string
  description?: string
  image?: string
  lastUpdated?: string
  lastPublishedAt?: string
  lastPublishedTs?: number
}
