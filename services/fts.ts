import he from 'he'
import { parseHTML } from 'linkedom'

const MAX_QUERY_LENGTH = 256
const MAX_TOKEN_LENGTH = 48

export const toPlainTextFromHtml = (value?: string | null): string => {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return ''

  const decoded = he.decode(trimmed)
  if (!decoded.includes('<')) {
    return decoded.replace(/\s+/g, ' ').trim()
  }

  try {
    const { document } = parseHTML(`<html><body>${decoded}</body></html>`)
    const text = document.body?.textContent ?? ''
    return he.decode(text).replace(/\s+/g, ' ').trim()
  } catch {
    return decoded
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

export const buildFtsPrefixQuery = (raw: string): string => {
  const normalized = raw.slice(0, MAX_QUERY_LENGTH).trim().replace(/\s+/g, ' ')
  if (!normalized) return ''

  const tokens = normalized
    .split(' ')
    .map((token) => token.replace(/[^\p{L}\p{N}]+/gu, '').slice(0, MAX_TOKEN_LENGTH))
    .filter(Boolean)

  if (!tokens.length) return ''

  return tokens.map((token) => (token.length === 1 ? token : `${token}*`)).join(' ')
}

