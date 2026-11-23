import express from 'express'
import compression from 'compression'
import http from 'node:http'
import https from 'node:https'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(dirname, 'dist')
const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const apiOrigin = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000'
const apiUrl = new URL(apiOrigin)

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: https://www.google-analytics.com https://region1.google-analytics.com",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const app = express()
app.disable('x-powered-by')
app.use(compression())
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  next()
})

// Same-origin API and crawlable files.
app.use((req, res, next) => {
  const pathname = req.originalUrl.split('?')[0] ?? ''
  const proxied =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/uploads/') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/llms.txt' ||
    pathname === '/feed.xml'
  if (!proxied) {
    next()
    return
  }
  const transport = apiUrl.protocol === 'https:' ? https : http
  const proxyRequest = transport.request(
    {
      protocol: apiUrl.protocol,
      hostname: apiUrl.hostname,
      port: apiUrl.port || (apiUrl.protocol === 'https:' ? 443 : 80),
      path: req.originalUrl,
      method: req.method,
      headers: { ...req.headers, host: apiUrl.host },
    },
    (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers)
      proxyResponse.pipe(res)
    },
  )
  proxyRequest.on('error', () => {
    res
      .status(502)
      .json({ error: { code: 'bad_gateway', message: 'The works API is unreachable.' } })
  })
  req.pipe(proxyRequest)
})

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'hvac-web' })
})

// Never expose the SSR bundle or the clean HTML template as static files.
app.use((req, res, next) => {
  const lower = req.path.toLowerCase()
  if (lower === '/server' || lower.startsWith('/server/') || lower === '/index.template.html') {
    res.status(404).end()
    return
  }
  next()
})

// Canonical URL hygiene: strip .html duplicates before static serving.
app.get('/index.html', (_req, res) => {
  res.redirect(301, '/')
})
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.endsWith('.html')) {
    res.redirect(301, req.path.slice(0, -5) || '/')
    return
  }
  next()
})

// Static assets only (no extensionless HTML here; SSR owns public routes).
app.use(
  express.static(dist, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }),
)

const templatePath = path.join(dist, 'index.template.html')
let template
try {
  template = await readFile(templatePath, 'utf8')
} catch {
  template = await readFile(path.join(dist, 'index.html'), 'utf8')
}

let ssr = null
try {
  ssr = await import(pathToFileURL(path.join(dist, 'server', 'entry-server.js')).href)
} catch (error) {
  console.warn('[hvac-web] SSR bundle missing; using static/prerendered fallback', error.message)
}

let contentCache = { at: 0, value: null }
async function getContent() {
  if (Date.now() - contentCache.at < 10_000) return contentCache.value
  try {
    const response = await fetch(`${apiOrigin}/api/v1/content`, {
      signal: AbortSignal.timeout(3_000),
    })
    if (!response.ok) throw new Error(`content ${response.status}`)
    const payload = await response.json()
    contentCache = { at: Date.now(), value: payload.data }
  } catch (error) {
    console.warn('[hvac-web] content fetch failed', error.message)
    contentCache = { at: Date.now(), value: contentCache.value }
  }
  return contentCache.value
}

const STATIC_PATHS = new Set([
  '/',
  '/services',
  '/products',
  '/about',
  '/process',
  '/work',
  '/amc',
  '/blog',
  '/contact',
  '/book',
  '/quote',
  '/tools',
])

const LEGACY_REDIRECTS = new Map([
  ['/privacy', '/legal/privacy'],
  ['/terms', '/legal/terms'],
  ['/cookies', '/legal/cookies'],
  ['/refund-policy', '/legal/refunds'],
  ['/accessibility', '/legal/accessibility'],
  ['/journal', '/blog'],
  ['/insights', '/blog'],
  ['/systems', '/products'],
  ['/shop', '/products'],
  ['/portfolio', '/work'],
])

function isPublicPath(pathname, content) {
  if (STATIC_PATHS.has(pathname)) return true
  const service = /^\/services\/([^/]+)\/?$/.exec(pathname)
  if (service) {
    return (
      !content ||
      Boolean(content.services?.some((entry) => entry.published && entry.id === service[1]))
    )
  }
  const post = /^\/blog\/([^/]+)\/?$/.exec(pathname)
  if (post) {
    return (
      !content || Boolean(content.posts?.some((entry) => entry.published && entry.slug === post[1]))
    )
  }
  const legal = /^\/legal\/([^/]+)\/?$/.exec(pathname)
  if (legal) {
    return (
      !content ||
      Boolean(content.legal?.some((entry) => entry.published && entry.slug === legal[1]))
    )
  }
  return false
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function stripSeoTags(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(
      /<meta\s+(?:name|property)="(?:description|keywords|robots|author|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi,
      '',
    )
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>\s*/gi, '')
}

function seoTags(seo) {
  if (!seo) return ''
  const json = JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c')
  return [
    `<title>${escapeAttr(seo.documentTitle)}</title>`,
    `<meta name="description" content="${escapeAttr(seo.description)}" />`,
    `<meta name="keywords" content="${escapeAttr(seo.keywords)}" />`,
    `<meta name="robots" content="${escapeAttr(seo.robots)}" />`,
    `<meta name="author" content="${escapeAttr(seo.author)}" />`,
    `<link rel="canonical" href="${escapeAttr(seo.canonical)}" />`,
    `<meta property="og:type" content="${escapeAttr(seo.type)}" />`,
    `<meta property="og:site_name" content="${escapeAttr(seo.siteName)}" />`,
    `<meta property="og:title" content="${escapeAttr(seo.documentTitle)}" />`,
    `<meta property="og:description" content="${escapeAttr(seo.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(seo.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(seo.image)}" />`,
    `<meta property="og:locale" content="${escapeAttr(seo.locale)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(seo.documentTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(seo.image)}" />`,
    `<script id="hvac-jsonld" type="application/ld+json">${json}</script>`,
  ].join('\n    ')
}

function inject(html, body, seo, content) {
  const safeContent = content ? JSON.stringify(content).replace(/</g, '\\u003c') : null
  let output = stripSeoTags(html)
  output = output.replace(
    '<div id="root"></div>',
    `<div id="root">${body}</div>${
      safeContent
        ? `<script id="hvac-initial-content" type="application/json">${safeContent}</script>`
        : ''
    }`,
  )
  output = output.replace('</head>', `    ${seoTags(seo)}\n  </head>`)
  return output
}

app.get('*', async (req, res) => {
  const pathname = req.path !== '/' ? req.path.replace(/\/+$/, '') || '/' : '/'
  const redirect = LEGACY_REDIRECTS.get(pathname)
  if (redirect) {
    res.redirect(301, redirect)
    return
  }
  const spa =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/portal' ||
    pathname.startsWith('/portal/') ||
    pathname === '/__styleguide'

  res.setHeader('Cache-Control', 'no-cache')
  res.type('html')

  if (spa) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    res.setHeader('x-render-mode', 'spa')
    const html = template.replace(
      /<meta\s+name="robots"[^>]*>/i,
      '<meta name="robots" content="noindex, nofollow" />',
    )
    res.send(html)
    return
  }

  const content = await getContent()
  const known = isPublicPath(pathname, content)
  if (!known) res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (!ssr) {
    // Prerendered fallback: /services/foo.html or index.html.
    const candidate =
      pathname === '/'
        ? path.join(dist, 'index.html')
        : path.join(dist, `${pathname.replace(/^\//, '')}.html`)
    try {
      const html = await readFile(candidate, 'utf8')
      res.status(known ? 200 : 404).setHeader('x-render-mode', 'static')
      res.send(html)
    } catch {
      res.status(known ? 200 : 404).send(template)
    }
    return
  }

  try {
    const result = ssr.render(pathname, content ?? undefined)
    res.status(known ? 200 : 404)
    res.setHeader('x-render-mode', 'ssr')
    res.send(inject(template, result.html, result.seo, content))
  } catch (error) {
    console.error('[hvac-web] SSR render failed', error)
    res.setHeader('x-render-mode', 'fallback')
    res.send(template)
  }
})

app.listen(port, () => {
  console.log(`[hvac-web] serving ${dist} on http://127.0.0.1:${port}`)
  console.log(`[hvac-web] proxying /api and SEO files to ${apiOrigin}`)
  console.log(`[hvac-web] SSR ${ssr ? 'enabled' : 'disabled'}`)
})
