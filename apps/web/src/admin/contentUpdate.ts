import type { SiteContent } from '@hvac/shared'

export type ContentUpdate = (recipe: (current: SiteContent) => SiteContent) => void