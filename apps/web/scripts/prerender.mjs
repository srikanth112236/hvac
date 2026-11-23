/* global document */
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

/**
 * Optional build-time prerender: render each public route with the real API
 * content, then write the resulting HTML (including title, meta, canonical and
 * JSON-LD) into dist/<route>.html. The SSR server takes precedence; these files
 * are fallbacks for hosts that cannot run Node. The client hydrates the markup.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(dirname, '..')
const dist = path.join(webRoot, 'dist')
const apiOrigin = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000'
const port = Number.parseInt(process.env.PRERENDER_PORT ?? '4174', 10)
const base = `http://127.0.0.1:${port}`

const staticRoutes = [
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
]

async function waitForServer(url, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Server did not become ready at ${url}`)
}

async function loadRoutes() {
  const routes = new Set(staticRoutes)
  try {
    const response = await fetch(`${apiOrigin}/api/v1/content`)
    if (!response.ok) throw new Error(`content ${response.status}`)
    const payload = await response.json()
    const content = payload.data
    for (const service of content.services ?? []) {
      if (service.published) routes.add(`/services/${service.id}`)
    }
    for (const post of content.posts ?? []) {
      if (post.published) routes.add(`/blog/${post.slug}`)
    }
    for (const document of content.legal ?? []) {
      if (document.published) routes.add(`/legal/${document.slug}`)
    }
    console.log(`[prerender] content loaded: ${routes.size} routes`)
  } catch (error) {
    console.warn(`[prerender] API content unavailable (${error.message}); static routes only`)
  }
  return [...routes]
}

function outputPath(route) {
  if (route === '/') return path.join(dist, 'index.html')
  return path.join(dist, `${route.replace(/^\//, '')}.html`)
}

await copyFile(path.join(dist, 'index.html'), path.join(dist, 'index.template.html'))

const server = spawn(process.execPath, ['server.mjs'], {
  cwd: webRoot,
  env: { ...process.env, PORT: String(port), API_ORIGIN: apiOrigin },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', (chunk) => process.stdout.write(chunk))
server.stderr.on('data', (chunk) => process.stderr.write(chunk))

let browser
try {
  await waitForServer(`${base}/healthz`)
  const routes = await loadRoutes()
  browser = await chromium.launch()
  const page = await browser.newPage()
  let written = 0

  for (const route of routes) {
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await page.waitForSelector('h1', { timeout: 10_000 }).catch(() => {})
    await page.waitForFunction(() => document.title.length > 0, { timeout: 5_000 })
    await page.waitForTimeout(350)
    const html = await page.content()
    const target = outputPath(route)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, html, 'utf8')
    written += 1
    console.log(`[prerender] ${route} → ${path.relative(dist, target)}`)
  }
  console.log(`[prerender] wrote ${written} pages`)
} finally {
  await browser?.close()
  server.kill()
}
