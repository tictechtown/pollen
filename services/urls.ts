export const normalizeUrl = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    return url.toString()
  } catch {
    return null
  }
}
