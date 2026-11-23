import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import type { SiteContent } from '@hvac/shared'
import { App } from './App'
import { Root } from './Root'
import { beginSeoCapture, takeSeoCapture, type SeoPayload } from './lib/seo'

export interface RenderResult {
  html: string
  seo: SeoPayload | null
}

/** Render a public route to HTML with the live content document. */
export function render(url: string, content?: SiteContent): RenderResult {
  beginSeoCapture()
  const html = renderToString(
    <Root initialContent={content}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </Root>,
  )
  return { html, seo: takeSeoCapture() }
}
