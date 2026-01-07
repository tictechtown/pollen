import { parseSharedUrl } from '@/services/share-intent'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'

export default function LinkingWrapper() {
  const router = useRouter()
  const url = Linking.useLinkingURL()

  useEffect(() => {
    const handleShareIntent = (url?: string | null) => {
      const shared = parseSharedUrl(url ?? '')
      if (shared) {
        router.push({ pathname: '/share', params: { url: encodeURIComponent(shared) } })
      }
    }
    if (url) {
      handleShareIntent(url)
    }
  }, [router, url])

  return null
}
