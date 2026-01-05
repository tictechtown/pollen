type ShouldOpenExternallyParams = {
  url: string
  initialUrl: string
  lastOpenedUrl?: string | null
}

export const shouldOpenExternally = ({
  url,
  initialUrl,
  lastOpenedUrl,
}: ShouldOpenExternallyParams): boolean => {
  if (!url.startsWith('http')) return false
  if (url === initialUrl) return false
  if (lastOpenedUrl && url === lastOpenedUrl) return false
  return true
}

