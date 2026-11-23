import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import type { SiteContent } from '@hvac/shared'

import './styles/tailwind.css'
import './styles/fonts.css'
import './styles/primitives.css'
import './styles/semantic.css'
import './styles/foundry.css'
import './styles/atelier.css'
import './styles/base.css'
import './styles/article.css'

import { App } from './App'
import { ErrorBoundary } from './components/system/ErrorBoundary'
import { Root } from './Root'
import type { Theme } from './theme/ThemeProvider'

const container = document.getElementById('root')
if (!container) throw new Error('Root container missing')

interface Bootstrap {
  content?: SiteContent | null
  theme?: Theme
}

let initialContent: SiteContent | undefined
let initialTheme: Theme | undefined
let hasBootstrap = false
const bootstrapElement = document.getElementById('hvac-bootstrap')
if (bootstrapElement?.textContent) {
  try {
    const bootstrap = JSON.parse(bootstrapElement.textContent) as Bootstrap
    initialContent = bootstrap.content ?? undefined
    initialTheme =
      bootstrap.theme === 'atelier' || bootstrap.theme === 'foundry' ? bootstrap.theme : undefined
    hasBootstrap = true
  } catch {
    hasBootstrap = false
  }
}

// Backwards compatibility with prerendered HTML written before the unified bootstrap.
if (!hasBootstrap) {
  const legacyElement = document.getElementById('hvac-initial-content')
  if (legacyElement?.textContent) {
    try {
      initialContent = JSON.parse(legacyElement.textContent) as SiteContent
      hasBootstrap = true
    } catch {
      initialContent = undefined
    }
  }
}

const tree = (
  <StrictMode>
    <ErrorBoundary>
      <Root initialContent={initialContent} initialTheme={initialTheme}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Root>
    </ErrorBoundary>
  </StrictMode>
)

// SSR/SSG markup hydrates; a plain dev/static shell mounts normally.
if (hasBootstrap && container.hasChildNodes()) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}
