import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { adminRouter } from './admin.js'
import { adminUsersRouter } from './adminUsersRouter.js'
import { auditAdmin } from './audit.js'
import { authRouter } from './auth.js'
import { allowedOrigins, IS_PROD, mailerConfigured } from './config.js'
import { businessRouter } from './business.js'
import { contentRouter, readSiteContent } from './content.js'
import { leadsRouter } from './leads.js'
import { jobsRouter } from './jobStore.js'
import { marketingRouter } from './marketing.js'
import { mediaRouter, UPLOAD_ROOT } from './media.js'
import { newsletterSignupsRouter } from './newsletterSignups.js'
import { notificationBridge } from './notificationBridge.js'
import { notificationsRouter } from './notifications.js'
import { customersRouter, portalRouter } from './portal.js'
import { portalAdminRouter, portalFileRouter } from './portalModules.js'
import { portalAuthRouter } from './portalAuth.js'
import { rateLimit } from './rateLimit.js'
import { seoRouter } from './seo.js'
import { DATA_DIR } from './store.js'

/** The Express app without the listener, so tests can mount it directly. */
export const app = express()

app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }
      callback(null, allowedOrigins.has(origin.replace(/\/+$/, '')))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use('/api/v1', notificationBridge)

app.use((req, res, next) => {
  const requestId = req.get('x-request-id') ?? randomUUID()
  res.setHeader('x-request-id', requestId)
  if (process.env.NODE_ENV === 'test') {
    next()
    return
  }
  const started = Date.now()
  res.on('finish', () => {
    if (req.path === '/api/v1/health' || req.path === '/api/v1/ready') return
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    console.log(
      JSON.stringify({
        level,
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - started,
        ip: req.ip,
      }),
    )
  })
  next()
})

app.use(
  '/api/v1',
  rateLimit({
    scope: 'global',
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 300 : 1200,
    message: 'Too many requests from this address. Slow down and try again.',
    skip: (requestPath) => requestPath === '/health' || requestPath === '/ready',
  }),
)

app.use('/api/v1', leadsRouter)
app.use('/api/v1', newsletterSignupsRouter)
app.use('/api/v1', mediaRouter)
app.use('/api/v1', contentRouter)
app.use('/api/v1', authRouter)
app.use('/api/v1', portalAuthRouter)
app.use('/api/v1', portalRouter)
app.use('/api/v1', portalFileRouter)
app.use('/api/v1', jobsRouter)
app.use('/api/v1/admin', notificationsRouter)
app.use('/api/v1/admin', auditAdmin)
app.use('/api/v1/admin', adminUsersRouter)
app.use('/api/v1/admin', adminRouter)
app.use('/api/v1/admin', businessRouter)
app.use('/api/v1/admin', customersRouter)
app.use('/api/v1/admin', portalAdminRouter)
app.use('/api/v1/admin', marketingRouter)
app.use(seoRouter)
app.use(
  '/uploads',
  express.static(UPLOAD_ROOT, {
    fallthrough: true,
    maxAge: '7d',
    immutable: true,
    index: false,
    dotfiles: 'deny',
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    },
  }),
)

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'hvac-api',
    version: '0.1.0',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: IS_PROD ? 'production' : 'development',
    mail: mailerConfigured() ? 'configured' : 'disabled',
  })
})

app.get('/api/v1/ready', async (_req, res) => {
  try {
    const content = await readSiteContent()
    const probe = path.join(DATA_DIR, '.ready-probe')
    await mkdir(path.dirname(probe), { recursive: true })
    await writeFile(probe, 'ok', 'utf8')
    await unlink(probe)
    res.json({
      status: 'ready',
      contentVersion: content.version,
      dataDir: 'writable',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      message: error instanceof Error ? error.message : 'The data directory is not available.',
    })
  }
})

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found.' } })
})

app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const candidate = error as { code?: string; message?: string }
    const tooLarge = candidate?.code === 'LIMIT_FILE_SIZE'
    const tooMany = candidate?.code === 'LIMIT_FILE_COUNT'
    const status = tooLarge || tooMany ? 400 : 500
    const message = tooLarge
      ? 'Each image must be 5 MB or smaller.'
      : tooMany
        ? 'Upload up to 40 images at a time.'
        : IS_PROD
          ? 'The request could not be completed.'
          : candidate?.message || 'The request could not be completed.'
    if (status === 500) console.error('[hvac-api] unhandled error', error)
    res.status(status).json({ error: { code: candidate?.code ?? 'server_error', message } })
  },
)
