export const formatRelativeTime = (date?: string, nowMs: number = Date.now()): string => {
  if (!date) return 'Just now'
  const timestamp = new Date(date).getTime()
  if (Number.isNaN(timestamp)) return 'Just now'
  const diffMs = nowMs - timestamp
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`
  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}y ago`
}
