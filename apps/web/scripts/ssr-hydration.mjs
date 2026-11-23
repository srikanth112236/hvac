/* global document, localStorage */
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

/**
 * Production-build hydration audit.
 *
 * Starts a temporary API and the real SSR web server, takes every public URL
 * from sitemap.xml, then renders each one in both themes. It checks the first
 * HTTP response (SSR markup + bootstrap), then checks that the hydrated DOM has
 * the right theme and that React emitted no hydration/server-mismatch error.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(dirname, '..')
const repoRoot = path.resolve(webRoot, '..', '..')
const apiRoot = path.join(repoRoot, 'apps', 'api')
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const themes = ['foundry', 'atelier']

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

function startProcess(label, command, args, cwd, env) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  const log = []
  const collect = (chunk) => {
    const text = String(chunk)
    log.push(text)
    if (log.length > 40) log.shift()
  }
  child.stdout.on('data', collect)
  child.stderr.on('data', collect)
  child.on('error', (error) => collect(`${label} spawn error: ${error.message}\n`))
  return { child, log, label }
}

async function waitFor(url, label, attempts = 120) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`${label} did not become ready at ${url}`)
}

async function stopProcess(processRef) {
  if (!processRef) return
  const child = processRef.child
  if (child.exitCode !== null || child.signalCode !== null) return
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve()
    }, 5_000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    child.kill('SIGTERM')
  })
}

function processStopped(processRef) {
  const child = processRef.child
  return child.exitCode !== null || child.signalCode !== null
}

function publicPathsFromSitemap(xml) {
  const paths = new Set()
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try {
      const url = new URL(match[1].trim())
      paths.add(url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, ''))
    } catch {
      // Ignore malformed sitemap entries.
    }
  }
  if (!paths.size) {
    for (const route of [
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
    ]) {
      paths.add(route)
    }
  }
  return [...paths].sort((a, b) => a.localeCompare(b))
}

function rawChecks(raw, theme, route) {
  const problems = []
  if (!raw.includes('id="hvac-bootstrap"')) problems.push('missing bootstrap script')
  if (/<div id="root">\s*<\/div>/.test(raw)) problems.push('empty root in first response')
  if (!new RegExp(`data-theme="${theme}"`).test(raw)) {
    problems.push(`server html is not data-theme="${theme}"`)
  }
  const bootstrapMatch =
    /<script id="hvac-bootstrap" type="application\/json">([\s\S]*?)<\/script>/.exec(raw)
  if (!bootstrapMatch) {
    problems.push('bootstrap JSON is not parseable from first response')
  } else {
    try {
      const bootstrap = JSON.parse(bootstrapMatch[1])
      if (bootstrap.theme !== theme) problems.push('bootstrap theme mismatch')
      if (!bootstrap.content || typeof bootstrap.content.version !== 'number') {
        problems.push('bootstrap content missing')
      }
    } catch {
      problems.push('bootstrap JSON parse failed')
    }
  }
  if (!/<title>[^<]+<\/title>/.test(raw)) problems.push('missing server title')
  if (!/rel="canonical"/.test(raw)) problems.push('missing canonical')
  if (route === '/') {
    if (!/application\/ld\+json/.test(raw)) problems.push('missing JSON-LD')
  }
  return problems
}

async function main() {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'hvac-ssr-'))
  const apiPort = await freePort()
  let webPort = await freePort()
  while (webPort === apiPort) webPort = await freePort()
  const apiOrigin = `http://127.0.0.1:${apiPort}`
  const base = `http://127.0.0.1:${webPort}`

  let api = null
  let web = null
  let browser = null

  try {
    api = startProcess('api', process.execPath, [tsxCli, 'src/server.ts'], apiRoot, {
      NODE_ENV: 'development',
      PORT: String(apiPort),
      HVAC_DATA_DIR: dataDir,
      ADMIN_EMAIL: 'admin@ssr.test',
      ADMIN_PASSWORD: 'SsrTestPass123!',
      ALLOWED_ORIGINS: base,
      PUBLIC_SITE_URL: base,
      DATA_ENCRYPTION_KEY: '',
      MAIL_WEBHOOK_URL: '',
      RESEND_API_KEY: '',
    })
    await waitFor(`${apiOrigin}/api/v1/health`, 'API')

    web = startProcess('web', process.execPath, ['server.mjs'], webRoot, {
      PORT: String(webPort),
      API_ORIGIN: apiOrigin,
    })
    await waitFor(`${base}/healthz`, 'SSR web server')

    const sitemap = await fetch(`${base}/sitemap.xml`).then((response) => {
      if (!response.ok) throw new Error(`sitemap returned ${response.status}`)
      return response.text()
    })
    const routes = publicPathsFromSitemap(sitemap)
    if (routes.length < 20) {
      throw new Error(`Only ${routes.length} public routes found in sitemap.xml`)
    }

    browser = await chromium.launch()
    const failures = []
    let checks = 0

    for (const theme of themes) {
      const context = await browser.newContext()
      const page = await context.newPage()
      let consoleErrors = []
      let pageErrors = []
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })
      page.on('pageerror', (error) => pageErrors.push(error.message))

      for (const route of routes) {
        consoleErrors = []
        pageErrors = []
        const url = `${base}${route}?theme=${theme}`
        try {
          const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          })
          if (!response) throw new Error('no navigation response')
          const raw = await response.text()
          const problems = rawChecks(raw, theme, route)
          if (response.status() !== 200) problems.push(`HTTP ${response.status()}`)
          if (response.headers()['x-render-mode'] !== 'ssr') {
            problems.push(`x-render-mode=${response.headers()['x-render-mode'] ?? 'missing'}`)
          }

          await page.waitForFunction(
            () => (document.querySelector('#root')?.childElementCount ?? 0) > 0,
            undefined,
            { timeout: 15_000 },
          )
          await page.waitForTimeout(100)

          const dom = await page.evaluate(() => ({
            theme: document.documentElement.getAttribute('data-theme'),
            hasThemeClass: document.documentElement.classList.contains(
              `theme-${document.documentElement.getAttribute('data-theme')}`,
            ),
            rootChildren: document.querySelector('#root')?.childElementCount ?? 0,
            hasBootstrap: Boolean(document.querySelector('#hvac-bootstrap')),
            title: document.title,
          }))
          if (dom.theme !== theme) problems.push(`hydrated theme=${dom.theme}`)
          if (!dom.hasThemeClass) problems.push('theme class missing after hydration')
          if (dom.rootChildren < 1) problems.push('empty hydrated root')
          if (!dom.hasBootstrap) problems.push('bootstrap missing after hydration')
          if (!dom.title.trim()) problems.push('empty hydrated title')

          const hydrationErrors = [...consoleErrors, ...pageErrors].filter((text) => {
            if (/favicon\.ico/i.test(text)) return false
            return /hydrat|did not match|server (html|rendered)|text content|Minified React error #(418|423|425)/i.test(
              text,
            )
          })
          if (hydrationErrors.length) {
            problems.push(`hydration errors: ${hydrationErrors.join(' | ')}`)
          }

          checks += 1
          if (problems.length) {
            failures.push({ theme, route, problems })
            console.error(`FAIL ${theme} ${route}`)
            for (const problem of problems) console.error(`  - ${problem}`)
          } else if (checks % 10 === 0) {
            console.log(`hydrated ${checks}/${routes.length * themes.length}`)
          }
        } catch (error) {
          failures.push({
            theme,
            route,
            problems: [error instanceof Error ? error.message : String(error)],
          })
          console.error(`FAIL ${theme} ${route}`)
          console.error(`  - ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      await context.close()
    }

    // A saved theme is not available to the server. The server renders the
    // default theme, then the client must adopt the stored preference without a
    // hydration mismatch.
    const storedContext = await browser.newContext()
    await storedContext.addInitScript(() => {
      localStorage.setItem('hvac-theme', 'atelier')
    })
    const storedPage = await storedContext.newPage()
    const storedErrors = []
    storedPage.on('console', (message) => {
      if (message.type() === 'error') storedErrors.push(message.text())
    })
    storedPage.on('pageerror', (error) => storedErrors.push(error.message))
    await storedPage.goto(base, { waitUntil: 'domcontentloaded' })
    await storedPage.waitForFunction(
      () => (document.querySelector('#root')?.childElementCount ?? 0) > 0,
    )
    await storedPage.waitForTimeout(200)
    const storedTheme = await storedPage.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    )
    const storedHydrationErrors = storedErrors.filter((text) =>
      /hydrat|did not match|server (html|rendered)|text content|Minified React error #(418|423|425)/i.test(
        text,
      ),
    )
    if (storedTheme !== 'atelier' || storedHydrationErrors.length) {
      failures.push({
        theme: 'stored-atelier',
        route: '/',
        problems: [
          ...(storedTheme !== 'atelier' ? [`saved theme=${storedTheme}`] : []),
          ...storedHydrationErrors,
        ],
      })
    }
    await storedContext.close()

    const routeFailures = failures.filter((entry) => entry.theme !== 'stored-atelier')
    console.log(
      `\nSSR hydration: ${checks - routeFailures.length}/${checks} route checks passed across ${routes.length} routes × ${themes.length} themes; saved-theme hydration ${failures.some((entry) => entry.theme === 'stored-atelier') ? 'FAILED' : 'passed'}.`,
    )
    if (failures.length) {
      console.error(`${failures.length} checks failed.`)
      process.exitCode = 1
    }
  } finally {
    if (browser) await browser.close().catch(() => {})
    await stopProcess(web)
    await stopProcess(api)
    for (const processRef of [web, api]) {
      if (processRef && !processStopped(processRef)) {
        console.error(`${processRef.label} still running:\n${processRef.log.join('')}`)
      }
    }
    await rm(dataDir, { recursive: true, force: true }).catch(() => {})
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error)
  process.exitCode = 1
})
