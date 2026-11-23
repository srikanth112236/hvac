import { useEffect, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)
gsap.defaults({ ease: 'power3.out', duration: 0.7 })

export { gsap, ScrollTrigger }

/**
 * The live Lenis instance, when smooth scrolling is active. Programmatic
 * navigation (route change, cross-page hash) must go through Lenis — a raw
 * window.scrollTo is overwritten by its ticker on the next frame.
 */
let activeLenis: Lenis | null = null

export function scrollPageTo(top: number): void {
  if (typeof window === 'undefined') return

  const lenis = activeLenis
  if (lenis) {
    // Route changes replace the whole page, so Lenis' measured limit is stale
    // for one frame. Re-measure, then commit. If the clamp still wins (pinned
    // sections growing during refresh), write the exact position natively.
    lenis.resize()
    lenis.scrollTo(top, { immediate: true, force: true })
    window.requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - top) <= 2) return
      lenis.stop()
      window.scrollTo({ top, left: 0, behavior: 'auto' })
      window.requestAnimationFrame(() => lenis.start())
    })
    return
  }

  window.scrollTo({ top, left: 0, behavior: 'auto' })
}

export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isLowPowerDevice(): boolean {
  if (typeof window === 'undefined') return true
  const cores = navigator.hardwareConcurrency ?? 8
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  return cores <= 4 || memory <= 4
}

/** Foundry moves mechanically (expo), Atelier moves calmly (power3). */
export function themeEase(): string {
  if (typeof document === 'undefined') return 'power3.out'
  return document.documentElement.getAttribute('data-theme') === 'atelier'
    ? 'power3.out'
    : 'expo.out'
}

/**
 * Lenis wired into the GSAP ticker so ScrollTrigger and smooth scrolling share
 * one clock. Skipped for reduced motion and coarse pointers (touch feels worse).
 */
export function useSmoothScroll(enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    if (prefersReducedMotion()) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })

    lenis.on('scroll', ScrollTrigger.update)

    activeLenis = lenis

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (activeLenis === lenis) activeLenis = null
    }
  }, [enabled])
}
