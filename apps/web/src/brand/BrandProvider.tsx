import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { brandConfig, type BrandConfig, type BrandOverrides } from './brand.config'

const BrandContext = createContext<BrandConfig>(brandConfig)

interface BrandProviderProps {
  children: ReactNode
  overrides?: BrandOverrides
}

/**
 * Merges admin-managed overrides over the compiled-in brand config.
 * Phase 6 fetches `overrides` from /api/v1/settings/brand; Phase 1 ships the
 * compiled values so every component already reads through this hook.
 */
export function BrandProvider({ children, overrides }: BrandProviderProps) {
  const value = useMemo<BrandConfig>(() => {
    if (!overrides) return brandConfig
    return {
      ...brandConfig,
      ...overrides,
      contact: { ...brandConfig.contact, ...overrides.contact },
      hours: { ...brandConfig.hours, ...overrides.hours },
      address: { ...brandConfig.address, ...overrides.address },
      stats: { ...brandConfig.stats, ...overrides.stats },
    }
  }, [overrides])

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useBrand(): BrandConfig {
  return useContext(BrandContext)
}

export { brandConfig }
export type { BrandConfig, BrandOverrides }
