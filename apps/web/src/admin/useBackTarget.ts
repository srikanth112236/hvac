import { useSearchParams } from 'react-router-dom'

/**
 * Detail pages use this to return to the actual source when they were opened
 * from the global notification inbox, and to their normal list otherwise.
 */
export function useBackTarget(fallbackPath: string, fallbackLabel: string) {
  const [searchParams] = useSearchParams()
  if (searchParams.get('from') === 'notifications') {
    return { to: '/admin/notifications', label: 'Back to notifications' }
  }
  return { to: fallbackPath, label: fallbackLabel }
}
