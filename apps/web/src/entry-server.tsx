import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import type { SiteContent } from '@hvac/shared'
import { App } from './App'
import { Root } from './Root'
import { beginSeoCapture, takeSeoCapture, type SeoPayload } from './lib/seo'
import type { Theme } from './theme/ThemeProvider'

export interface RenderResult {
  html: string
  seo: SeoPayload | null
}

/** Build-time default theme; the server uses it when no ?theme is present. */
export const defaultTheme: Theme = import.meta.env.VITE_THEME === 'atelier' ? 'atelier' : 'foundry'

/** Render a public route to HTML with the live content document and theme. */
export function render(url: string, content?: SiteContent, theme: Theme = 'foundry'): RenderResult {
  beginSeoCapture()
  const html = renderToString(
    <Root initialContent={content} initialTheme={theme}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </Root>,
  )
  return { html, seo: takeSeoCapture() }
}
