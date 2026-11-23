export type ConsentChoice = 'all' | 'essential'

const KEY = 'hvac-consent'

export function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(KEY)
    return value === 'all' || value === 'essential' ? value : null
  } catch {
    return null
  }
}

export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(KEY, choice)
  } catch {
    // Privacy mode: the choice lasts for the session only.
  }
}

/**
 * Analytics is opt-in. No tag is injected until the visitor chooses "Allow
 * analytics" and a measurement ID is configured at build time.
 */
export function loadAnalytics(): void {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID
  if (!id || document.getElementById('hvac-ga4')) return
  const script = document.createElement('script')
  script.id = 'hvac-ga4'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
  const target = window as Window & { dataLayer?: unknown[] }
  target.dataLayer = target.dataLayer || []
  target.dataLayer.push(['js', new Date()])
  target.dataLayer.push(['config', id, { anonymize_ip: true }])
}
