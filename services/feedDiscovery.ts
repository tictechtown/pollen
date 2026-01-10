// Feed discovery helper for user-provided URLs.

import { isOpmlXml } from './opml'

type FeedCandidate = {
  url: string
  title?: string
  kind: 'rss' | 'atom' | 'unknown'
}

const FEED_MIME_TYPES = new Set(['application/rss+xml', 'application/atom+xml'])
const GENERIC_XML_MIME_TYPES = new Set(['application/xml', 'text/xml'])

const normalizeMimeType = (value?: string | null) =>
  (value ?? '').split(';')[0].trim().toLowerCase()

const isFeedContentType = (value?: string | null) => {
  const normalized = normalizeMimeType(value)
  return FEED_MIME_TYPES.has(normalized) || GENERIC_XML_MIME_TYPES.has(normalized)
}

const isStrictFeedContentType = (value?: string | null) =>
  FEED_MIME_TYPES.has(normalizeMimeType(value))

const detectFeedKindFromMime = (value?: string | null): FeedCandidate['kind'] => {
  const normalized = normalizeMimeType(value)
  if (normalized === 'application/rss+xml') return 'rss'
  if (normalized === 'application/atom+xml') return 'atom'
  return 'unknown'
}

const detectFeedKindFromBody = (body: string): FeedCandidate['kind'] => {
  if (/<feed(\s|>)/i.test(body)) return 'atom'
  if (/<(rss|rdf:rdf)(\s|>)/i.test(body)) return 'rss'
  return 'unknown'
}

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
    const rel = attrs.rel?.toLowerCase()
    if (rel && !rel.split(/\s+/).includes('alternate')) continue
    const type = normalizeMimeType(attrs.type)
    if (type !== 'application/rss+xml' && type !== 'application/atom+xml') continue
    const href = toAbsoluteUrl(baseUrl, attrs.href)
    if (!href) continue
    if (seen.has(href)) continue
    seen.add(href)
    const title = attrs.title?.trim()
    candidates.push({
      url: href,
      title: title || undefined,
      kind: type === 'application/atom+xml' ? 'atom' : 'rss',
    })
  }

  return candidates
}

export const discoverFeedUrls = async (
  inputUrl: string,
): Promise<{
  directUrl?: string
  directKind?: FeedCandidate['kind']
  opmlUrl?: string
  candidates: FeedCandidate[]
}> => {
  try {
    const headResp = await fetch(inputUrl, { method: 'HEAD' })
    if (headResp.ok && isStrictFeedContentType(headResp.headers.get('content-type'))) {
      return {
        directUrl: inputUrl,
        directKind: detectFeedKindFromMime(headResp.headers.get('content-type')),
        candidates: [],
      }
    }
  } catch {
    // Ignore HEAD errors and try a full GET.
  }

  const resp = await fetch(inputUrl)
  if (!resp.ok) {
    throw new Error('Failed to load URL')
  }

  const contentType = resp.headers.get('content-type')
  const body = await resp.text()
  if (isOpmlXml(body)) {
    return {
      opmlUrl: resp.url || inputUrl,
      candidates: [],
    }
  }

  if (isFeedContentType(contentType)) {
    return {
      directUrl: resp.url || inputUrl,
      directKind: detectFeedKindFromMime(contentType),
      candidates: [],
    }
  }

  if (looksLikeFeed(body)) {
    return {
      directUrl: resp.url || inputUrl,
      directKind: detectFeedKindFromBody(body),
      candidates: [],
    }
  }

  const headHtml = extractHeadHtml(body)
  const candidates = extractFeedLinks(headHtml, resp.url || inputUrl)
  return { candidates }
}

export const discoverFeedCandidates = async (inputUrl: string): Promise<FeedCandidate[]> => {
  const { directUrl, directKind, candidates, opmlUrl } = await discoverFeedUrls(inputUrl)
  const deduped: FeedCandidate[] = []
  const seen = new Set<string>()

  if (opmlUrl) {
    return []
  }

  const push = (candidate: FeedCandidate) => {
    if (seen.has(candidate.url)) return
    seen.add(candidate.url)
    deduped.push(candidate)
  }

  if (directUrl) {
    push({ url: directUrl, title: undefined, kind: directKind ?? 'unknown' })
  }

  candidates.forEach(push)
  return deduped
}

export type { FeedCandidate }
