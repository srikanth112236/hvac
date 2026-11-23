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

const container = document.getElementById('root')
if (!container) throw new Error('Root container missing')

let initialContent: SiteContent | undefined
const initialElement = document.getElementById('hvac-initial-content')
if (initialElement?.textContent) {
  try {
    initialContent = JSON.parse(initialElement.textContent) as SiteContent
  } catch {
    initialContent = undefined
  }
}

const tree = (
  <StrictMode>
    <ErrorBoundary>
      <Root initialContent={initialContent}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Root>
    </ErrorBoundary>
  </StrictMode>
)

// SSR/SSG markup hydrates; a plain dev/static shell mounts normally.
if (initialContent && container.hasChildNodes()) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}
