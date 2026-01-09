export const buildOpmlExportFilename = (now: Date = new Date()): string => {
  const y = String(now.getFullYear())
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `pollen-subscriptions-${y}${m}${d}.opml`
}
