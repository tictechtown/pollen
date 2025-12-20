// Feed discovery helper for user-provided URLs.

type FeedCandidate = {
  url: string
  title?: string
}

const FEED_MIME_TYPES = new Set([
  'application/rss+xml',
  'application/atom+xml',
  'application/xml',
  'text/xml',
])

const normalizeMimeType = (value?: string | null) =>
  (value ?? '').split(';')[0].trim().toLowerCase()

const isFeedContentType = (value?: string | null) => FEED_MIME_TYPES.has(normalizeMimeType(value))

const looksLikeFeed = (body: string) =>
  /<(rss|feed|rdf:rdf)(\s|>)/i.test(body) || /<\?xml/i.test(body)

const toAbsoluteUrl = (baseUrl: string, maybeUrl?: string): string | undefined => {
  if (!maybeUrl) return undefined
  try {
    return new URL(maybeUrl, baseUrl).toString()
  } catch {
    return maybeUrl
  }
}

const extractHeadHtml = (html: string): string => {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  return headMatch?.[1] ?? html
}

const parseLinkAttributes = (tag: string): Record<string, string> => {
  const attrs: Record<string, string> = {}
  const attrRegex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  let match: RegExpExecArray | null
  while ((match = attrRegex.exec(tag))) {
    const key = match[1].toLowerCase()
    const value = match[2] ?? match[3] ?? match[4] ?? ''
    attrs[key] = value
  }
  return attrs
}

const extractFeedLinks = (headHtml: string, baseUrl: string): FeedCandidate[] => {
  const candidates: FeedCandidate[] = []
  const seen = new Set<string>()
  const linkRegex = /<link\b[^>]*>/gi
  const tags = headHtml.match(linkRegex) ?? []

  for (const tag of tags) {
    const attrs = parseLinkAttributes(tag)
    const type = normalizeMimeType(attrs.type)
    if (!FEED_MIME_TYPES.has(type)) continue
    const href = toAbsoluteUrl(baseUrl, attrs.href)
    if (!href) continue
    if (seen.has(href)) continue
    seen.add(href)
    const title = attrs.title?.trim()
    candidates.push({ url: href, title: title || undefined })
  }

  return candidates
}

export const discoverFeedUrls = async (
  inputUrl: string,
): Promise<{ directUrl?: string; candidates: FeedCandidate[] }> => {
  try {
    const headResp = await fetch(inputUrl, { method: 'HEAD' })
    if (headResp.ok && isFeedContentType(headResp.headers.get('content-type'))) {
      return { directUrl: inputUrl, candidates: [] }
    }
  } catch {
    // Ignore HEAD errors and try a full GET.
  }

  const resp = await fetch(inputUrl)
  if (!resp.ok) {
    throw new Error('Failed to load URL')
  }

  const contentType = resp.headers.get('content-type')
  if (isFeedContentType(contentType)) {
    return { directUrl: resp.url || inputUrl, candidates: [] }
  }

  const body = await resp.text()
  if (looksLikeFeed(body)) {
    return { directUrl: resp.url || inputUrl, candidates: [] }
  }

  const headHtml = extractHeadHtml(body)
  const candidates = extractFeedLinks(headHtml, resp.url || inputUrl)
  return { candidates }
}

export type { FeedCandidate }
