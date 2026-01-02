export type Article = {
  /**
   * Base64 version of Feed.id or RSS.guid
   */
  id: string
  title: string
  /**
   * link to the website article
   */
  link: string
  /**
   * Feed.title
   */
  source: string
  /**
   * When this article was published
   */
  publishedAt?: string
  /**
   * The last time this content was updated
   */
  updatedAt?: string
  /**
   * Short summary of the article
   */
  description?: string
  /**
   * Long summary of the article
   */
  content?: string
  /**
   * Article thumbnail if available
   */
  thumbnail?: string
  /**
   * Feed.id
   */
  feedId?: string
  /**
   * User has read the article
   */
  read: boolean
  /**
   * User has saved the article
   */
  saved: boolean
}

export type Feed = {
  /**
   * UUID v4.
   * TODO: should we use Atom.id and RSS.link instead?
   */
  id: string
  /**
   * Feed Title
   */
  title: string
  /**
   * Feed url
   */
  xmlUrl: string
  /**
   * Canonical Website url
   */
  htmlUrl?: string
  /**
   * Feed description
   */
  description?: string
  /**
   * Feed thumbnail image
   */
  image?: string
  /**
   * The last time the content of the channel changed
   */
  lastUpdated?: string
  /**
   * Timestamp of the most recently published/updated article we've seen for this feed.
   */
  lastPublishedTs?: number
  /**
   * expiration Timestamp from most recent fetch. Derived from max-age Cache-Control Header and Expires Header
   */
  expiresTS?: number
  /**
   * Expires Header from most recent fetch
   */
  expires?: string
  /**
   * ETag Header from most recent fetch
   */
  ETag?: string
  /**
   * lastModified Header from most recent fetch
   */
  lastModified?: string
}
