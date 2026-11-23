import type { Server } from 'node:http'
import { app } from './app.js'
import { assertProductionConfig, mailerConfigured } from './config.js'
import { startJobs } from './jobs.js'
import { tickNewsletters } from './marketing.js'
import { runMigrations } from './migrations.js'

// Refuse to boot a production deployment with development credentials, no
// allowed origin or no encryption key. Failing at start is safer.
assertProductionConfig()

const envPort = Number.parseInt(process.env.PORT ?? '', 10)
const PORT = Number.isFinite(envPort) && envPort > 0 ? envPort : 4000

let server: Server | null = null

function shutdown(signal: string): void {
  console.log(`[hvac-api] ${signal} received, closing listener`)
  server?.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}

async function start(): Promise<void> {
  await runMigrations()
  server = app.listen(PORT, () => {
    console.log(`[hvac-api] listening on http://127.0.0.1:${PORT}/api/v1/health`)
    if (!mailerConfigured()) {
      console.warn(
        '[hvac-api] No email provider configured (RESEND_API_KEY or MAIL_WEBHOOK_URL). ' +
          'Acknowledgement, reminder and newsletter sends are disabled until it is set.',
      )
    }
    void tickNewsletters()
    const newsletterTimer = setInterval(() => {
      void tickNewsletters()
    }, 30_000)
    newsletterTimer.unref()
    startJobs()
  })
}

process.on('unhandledRejection', (reason) => {
  console.error('[hvac-api] unhandled promise rejection', reason)
})

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

void start().catch((error) => {
  console.error('[hvac-api] failed to start', error)
  process.exit(1)
})
