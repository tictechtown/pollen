import { Redirect, usePathname } from 'expo-router'

export default function LinkingWrapper({ initialized }: { initialized: boolean }) {
  const pathname = usePathname()

  console.log('pathname', pathname)
  if (pathname === '/') {
    return <Redirect href="/(tabs)" />
  }

  return null
}
