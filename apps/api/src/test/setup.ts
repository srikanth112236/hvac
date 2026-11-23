import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll } from 'vitest'

const dir = mkdtempSync(path.join(tmpdir(), 'hvac-test-'))
process.env.HVAC_DATA_DIR = dir
process.env.NODE_ENV = 'test'
process.env.ADMIN_EMAIL = 'admin@test.local'
process.env.ADMIN_PASSWORD = 'TestPass123!'
process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:5175'
process.env.PUBLIC_SITE_URL = 'http://127.0.0.1:5175'
delete process.env.DATA_ENCRYPTION_KEY
delete process.env.RESEND_API_KEY
delete process.env.MAIL_WEBHOOK_URL

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})
