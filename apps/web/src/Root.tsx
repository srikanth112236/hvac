import { useEffect, type ReactNode } from 'react'
import type { SiteContent } from '@hvac/shared'
import { useSiteContent, SiteContentProvider } from '@/content/SiteContentProvider'
import { BrandProvider, type BrandOverrides } from '@/brand/BrandProvider'
import { ToastProvider } from '@/components/ui'
import { ThemeProvider, type Theme } from '@/theme/ThemeProvider'
import { applySiteTheme } from '@/theme/applySiteTheme'

function BrandFromContent({ children }: { children: ReactNode }) {
  const { content } = useSiteContent()
  const overrides: BrandOverrides = {
    name: content.brand.name,
    shortName: content.brand.shortName,
    legalName: content.brand.legalName,
    tagline: content.brand.tagline,
    description: content.brand.description,
    monogram: content.brand.monogram,
    logo: content.brand.logo ?? { mark: null, wordmark: null },
    favicon: content.brand.favicon,
    socialImage: content.brand.socialImage,
    contact: content.brand.contact,
    address: content.brand.address,
    hours: content.brand.hours,
    serviceAreas: content.brand.serviceAreas,
    stats: content.brand.stats,
    credentials: content.brand.credentials,
    foundedYear: content.brand.foundedYear,
    gstin: content.brand.gstin,
  }

  useEffect(() => {
    applySiteTheme(content.theme)
  }, [content.theme])

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (content.brand.favicon) {
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = content.brand.favicon
      link.dataset.contentFavicon = 'true'
    } else if (link?.dataset.contentFavicon) {
      link.remove()
    }
  }, [content.brand.favicon])

  return <BrandProvider overrides={overrides}>{children}</BrandProvider>
}

/** Provider stack shared by the client entry and the SSR entry. */
export function Root({
  children,
  initialContent,
  initialTheme,
}: {
  children: ReactNode
  initialContent?: SiteContent
  initialTheme?: Theme
}) {
  return (
    <ThemeProvider initialTheme={initialTheme ?? initialContent?.theme?.defaultVariant}>
      <SiteContentProvider initialContent={initialContent}>
        <BrandFromContent>
          <ToastProvider>{children}</ToastProvider>
        </BrandFromContent>
      </SiteContentProvider>
    </ThemeProvider>
  )
}
