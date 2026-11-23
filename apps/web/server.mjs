import express from 'express'
import compression from 'compression'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(dirname, 'dist')
const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const apiOrigin = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000'
const apiUrl = new URL(apiOrigin)

const app = express()
app.disable('x-powered-by')
app.use(compression())

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

app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  next()
})

// Keep the crawlable files and API on the site origin.
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
    res.status(502).json({ error: { code: 'bad_gateway', message: 'The works API is unreachable.' } })
  })
  req.pipe(proxyRequest)
})

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'hvac-web' })
})

app.use(
  express.static(dist, {
    extensions: ['html'],
    index: 'index.html',
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }),
)

app.get('*', (req, res) => {
  const spa =
    req.path === '/admin' ||
    req.path.startsWith('/admin/') ||
    req.path === '/portal' ||
    req.path.startsWith('/portal/') ||
    req.path === '/__styleguide'
  if (spa) {
    res.sendFile(path.join(dist, 'index.html'))
    return
  }
  res.status(404).sendFile(path.join(dist, 'index.html'))
})

app.listen(port, () => {
  console.log(`[hvac-web] serving ${dist} on http://127.0.0.1:${port}`)
  console.log(`[hvac-web] proxying /api and SEO files to ${apiOrigin}`)
})
