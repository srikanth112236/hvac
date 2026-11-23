import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './styles/tailwind.css'
import './styles/fonts.css'
import './styles/primitives.css'
import './styles/semantic.css'
import './styles/foundry.css'
import './styles/atelier.css'
import './styles/base.css'
import './styles/article.css'

import { App } from './App'
import { BrandProvider, type BrandOverrides } from './brand/BrandProvider'
import { ErrorBoundary } from './components/system/ErrorBoundary'
import { ToastProvider } from './components/ui'
import { SiteContentProvider, useSiteContent } from './content/SiteContentProvider'
import { ThemeProvider } from './theme/ThemeProvider'

const container = document.getElementById('root')
if (!container) throw new Error('Root container missing')

/** Brand overrides are derived from the same API document the admin edits. */
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

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <SiteContentProvider>
          <BrandFromContent>
            <ToastProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <App />
              </BrowserRouter>
            </ToastProvider>
          </BrandFromContent>
        </SiteContentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
