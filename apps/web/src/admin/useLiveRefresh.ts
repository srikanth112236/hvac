import { useEffect, useRef } from 'react'

/**
 * Re-read an admin module on an interval, when the tab regains focus, when the
 * page becomes visible, and whenever any admin mutation succeeds in this tab
 * or another tab (via BroadcastChannel). Keeps dashboards and queues honest
 * without making every page implement its own polling.
 */
export function useLiveRefresh(load: () => void | Promise<void>, intervalMs = 30_000): void {
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    let active = true
    const run = () => {
      if (active) void loadRef.current()
    }
    run()
    const timer = window.setInterval(run, intervalMs)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }
    window.addEventListener('focus', run)
    window.addEventListener('hvac-admin-data-changed', run)
    document.addEventListener('visibilitychange', onVisibility)
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('hvac-admin')
      channel.onmessage = run
    } catch {
      channel = null
    }
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', run)
      window.removeEventListener('hvac-admin-data-changed', run)
      document.removeEventListener('visibilitychange', onVisibility)
      channel?.close()
    }
  }, [intervalMs])
}
