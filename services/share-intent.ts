// Parse shared URLs from Android share intents.
const EXTRA_TEXT_KEY = 'S.android.intent.extra.TEXT='

const extractUrlFromText = (text: string): string | null => {
  const httpMatch = text.match(/https?:\/\/[^\s]+/i)
  if (httpMatch) return httpMatch[0]
  const schemeMatch = text.match(/[a-z][a-z0-9+.-]*:[^\s]+/i)
  return schemeMatch ? schemeMatch[0] : null
}

export const parseSharedUrl = (rawUrl?: string | null): string | null => {
  if (!rawUrl) return null

  if (rawUrl.startsWith('intent://')) {
    const textIndex = rawUrl.indexOf(EXTRA_TEXT_KEY)
    if (textIndex !== -1) {
      const start = textIndex + EXTRA_TEXT_KEY.length
      const end = rawUrl.indexOf(';', start)
      const encodedText = rawUrl.substring(start, end === -1 ? rawUrl.length : end)
      const decodedText = decodeURIComponent(encodedText)
      return extractUrlFromText(decodedText) ?? null
    }
  }

  try {
    const url = new URL(rawUrl)
    const fromQuery = url.searchParams.get('url')
    if (fromQuery && extractUrlFromText(fromQuery)) {
      return extractUrlFromText(fromQuery)
    }
    if (extractUrlFromText(rawUrl)) {
      return extractUrlFromText(rawUrl)
    }
  } catch {
    const fallback = extractUrlFromText(rawUrl)
    if (fallback) {
      return fallback
    }
  }

  return null
}
