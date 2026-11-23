import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

const ease = [0.16, 1, 0.3, 1] as const

interface PageTransitionProps {
  children: ReactNode
  className?: string
  /** Route key — changing it retriggers the entrance. */
  routeKey?: string
}

/**
 * Route-level entrance: content rises into place while a hairline wipe crosses
 * the top of the viewport. The wipe is the shared grammar; Phase 9 elaborates.
 */
export function PageTransition({ children, className, routeKey }: PageTransitionProps) {
  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.4, ease }}
      className={cn('relative', className)}
    >
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease }}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 block h-px origin-left bg-cold/60"
      />
      {children}
    </motion.div>
  )
}
