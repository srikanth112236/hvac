import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ScrollTrigger, scrollPageTo } from '@/motion'

/**
 * Router scroll behaviour. React Router keeps the previous scroll position on
 * navigation; public pages need to start at the top, and cross-page anchors
 * (e.g. /#process from the header on /contact) need to land after the target
 * route has painted and ScrollTrigger has measured its pin spacers.
 *
 * Scrolling goes through Lenis (see scrollPageTo) — a raw window.scrollTo is
 * overwritten by its ticker on the next frame.
 */
export function useRouteScroll(): void {
  const { pathname, hash, key } = useLocation()

  useEffect(() => {
    if (!hash) {
      scrollPageTo(0)
      return
    }

    const id = decodeURIComponent(hash.slice(1))

    // Synchronous on purpose: reading a rect forces layout after ScrollTrigger
    // has rebuilt its pin spacers, and the scroll must not wait on rAF (which
    // is suspended in a background tab and on a slow first frame).
    ScrollTrigger.refresh()
    const target = document.getElementById(id)
    if (!target) {
      scrollPageTo(0)
      return
    }

    const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop)
    const offset = Number.isFinite(margin) ? margin : 0
    const top = window.scrollY + target.getBoundingClientRect().top - offset
    scrollPageTo(Math.max(0, top))
  }, [pathname, hash, key])
}
