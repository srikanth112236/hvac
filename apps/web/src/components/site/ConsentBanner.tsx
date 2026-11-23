import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readConsent, writeConsent, loadAnalytics, type ConsentChoice } from '@/lib/analytics'

/**
 * First-party consent notice. The site sets no non-essential cookies or
 * analytics tags until the visitor allows them; the API session cookies are
 * strictly functional.
 */
export function ConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice | null>(() => readConsent())

  useEffect(() => {
    if (choice === 'all') loadAnalytics()
  }, [choice])

  if (choice) return null

  const decide = (next: ConsentChoice) => {
    writeConsent(next)
    setChoice(next)
    if (next === 'all') loadAnalytics()
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-[var(--z-sticky)] md:inset-x-auto md:bottom-6 md:left-6 md:max-w-md">
      <div className="border border-line bg-panel/95 p-4 shadow-pop backdrop-blur-md">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cold">
          Privacy · CV-CONSENT
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">
          This site uses a functional session cookie for the portal and admin. Analytics is off
          unless you allow it. Read the{' '}
          <Link to="/legal/cookies" className="text-cold underline">
            cookie notice
          </Link>{' '}
          and{' '}
          <Link to="/legal/privacy" className="text-cold underline">
            privacy notice
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => decide('all')}
            className="h-9 border border-cold bg-cold px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-base"
          >
            Allow analytics
          </button>
          <button
            type="button"
            onClick={() => decide('essential')}
            className="h-9 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-fg"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  )
}
