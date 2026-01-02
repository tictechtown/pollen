/**
 * Normalize input into an absolute URL string or return null when invalid/empty.
 */
export const normalizeUrl = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    const url = new URL(hasScheme ? trimmed : `https://${trimmed}`)
    return url.toString()
  } catch {
    return null
  }
}
