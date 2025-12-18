import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

type ReaderStatus = 'idle' | 'pending' | 'ok' | 'failed'

export type ReaderExtractionResult = {
  status: ReaderStatus
  html?: string
  title?: string
  byline?: string
  excerpt?: string
  textContent?: string
  error?: string
}

const FETCH_TIMEOUT_MS = 10_000
const MAX_BYTES = 5 * 1024 * 1024
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'

const sanitizeAndRewrite = (html: string, baseUrl: string): string => {
  const { document } = parseHTML(`<html><body>${html}</body></html>`)

  // Drop risky/unsupported elements
  document.querySelectorAll('script,style,iframe,noscript').forEach((node) => node.remove())

  const absolutize = (value: string): string => {
    try {
      return new URL(value, baseUrl).toString()
    } catch {
      return value
    }
  }

  document.querySelectorAll('[href]').forEach((node) => {
    const href = node.getAttribute('href')
    if (href) node.setAttribute('href', absolutize(href))
  })

  document.querySelectorAll('[src]').forEach((node) => {
    const src = node.getAttribute('src')
    if (src) node.setAttribute('src', absolutize(src))
  })

  document.querySelectorAll('[srcset]').forEach((node) => {
    const srcset = node.getAttribute('srcset')
    if (!srcset) return
    const rewritten = srcset
      .split(',')
      .map((entry) => {
        const [url, descriptor] = entry.trim().split(/\s+/)
        if (!url) return null
        const abs = absolutize(url)
        return descriptor ? `${abs} ${descriptor}` : abs
      })
      .filter(Boolean)
      .join(', ')
    node.setAttribute('srcset', rewritten)
  })

  return document.body.innerHTML
}

export const extractReaderFromHtml = (
  html: string,
  baseUrl: string,
): Omit<ReaderExtractionResult, 'status' | 'error'> | null => {
  const { document, window } = parseHTML(html)
  try {
    window.document.location.href = baseUrl
  } catch {
    // ignore location failures in non-browser environments
  }
  const parsed = new Readability(document).parse()
  const readableContent = parsed?.content?.trim() || ''
  const contentToUse = readableContent || document.body.innerHTML
  if (!contentToUse.trim()) {
    return null
  }

  const cleaned = sanitizeAndRewrite(contentToUse, baseUrl)
  return {
    html: cleaned,
    title: parsed?.title ?? document.title ?? undefined,
    byline: parsed?.byline ?? undefined,
    excerpt: parsed?.excerpt ?? undefined,
    textContent: parsed?.textContent ?? document.body.textContent ?? undefined,
  }
}

export const fetchAndExtractReader = async (url: string): Promise<ReaderExtractionResult> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    })

    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return { status: 'failed', error: 'Page too large for reader mode' }
    }

    if (!response.ok) {
      return { status: 'failed', error: `Failed to load page (${response.status})` }
    }

    const html = await response.text()
    if (html.length > MAX_BYTES) {
      return { status: 'failed', error: 'Page too large for reader mode' }
    }

    const baseUrl = response.url || url
    const parsed = extractReaderFromHtml(html, baseUrl)
    if (!parsed) {
      return { status: 'failed', error: 'No reader content found' }
    }

    return { status: 'ok', ...parsed }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { status: 'failed', error: 'Reader request timed out' }
    }
    return { status: 'failed', error: 'Unable to load reader mode' }
  } finally {
    clearTimeout(timeout)
  }
}
