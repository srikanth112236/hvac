import { Outlet } from 'react-router-dom'
import { ConsentBanner } from '@/components/site/ConsentBanner'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { StickyActions } from '@/components/site/StickyActions'

/**
 * Public marketing shell: announcement bar, sticky header, footer and the
 * permanent action bar. PageTransition is deliberately not used here — it
 * leaves a transform on the wrapper, which becomes the containing block for
 * pinned ScrollTrigger scenes and position: fixed chrome.
 */
export function SiteLayout() {
  return (
    <div className="flex min-h-[100svh] flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <StickyActions />
      <ConsentBanner />
    </div>
  )
}
