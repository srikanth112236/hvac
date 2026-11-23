import type { ReactNode } from 'react'
import type { SiteContent } from '@hvac/shared'
import { useSiteContent, SiteContentProvider } from '@/content/SiteContentProvider'
import { BrandProvider, type BrandOverrides } from '@/brand/BrandProvider'
import { ToastProvider } from '@/components/ui'
import { ThemeProvider } from '@/theme/ThemeProvider'

function BrandFromContent({ children }: { children: ReactNode }) {
  const { content } = useSiteContent()
  const overrides: BrandOverrides = {
    name: content.brand.name,
    shortName: content.brand.shortName,
    legalName: content.brand.legalName,
    tagline: content.brand.tagline,
    description: content.brand.description,
    monogram: content.brand.monogram,
    contact: content.brand.contact,
    address: content.brand.address,
    hours: content.brand.hours,
    serviceAreas: content.brand.serviceAreas,
    stats: content.brand.stats,
    credentials: content.brand.credentials,
    foundedYear: content.brand.foundedYear,
    gstin: content.brand.gstin,
  }
  return <BrandProvider overrides={overrides}>{children}</BrandProvider>
}

/** Provider stack shared by the client entry and the SSR entry. */
export function Root({
  children,
  initialContent,
}: {
  children: ReactNode
  initialContent?: SiteContent
}) {
  return (
    <ThemeProvider>
      <SiteContentProvider initialContent={initialContent}>
        <BrandFromContent>
          <ToastProvider>{children}</ToastProvider>
        </BrandFromContent>
      </SiteContentProvider>
    </ThemeProvider>
  )
}
