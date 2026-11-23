import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

const ORIGIN = 'http://127.0.0.1:5175'
const ADMIN_EMAIL = 'admin@test.local'
const ADMIN_PASSWORD = 'TestPass123!'

let app: Express
let admin: ReturnType<typeof request.agent>
let mailServer: Server
const outbound: { kind: string; to: string; html: string }[] = []

beforeAll(async () => {
  mailServer = createServer((req, res) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body) as { kind?: string; to?: string; html?: string }
        outbound.push({
          kind: payload.kind ?? '',
          to: payload.to ?? '',
          html: payload.html ?? '',
        })
      } catch {
        // Ignore malformed test payloads.
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    })
  })
  await new Promise<void>((resolve) => mailServer.listen(0, '127.0.0.1', resolve))
  const address = mailServer.address() as AddressInfo
  process.env.MAIL_WEBHOOK_URL = `http://127.0.0.1:${address.port}/mail`
  process.env.MAIL_WEBHOOK_TOKEN = 'test-token'

  const module = await import('./app.js')
  app = module.app
  admin = request.agent(app)
  await admin
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    .expect(200)
})

afterAll(async () => {
  delete process.env.MAIL_WEBHOOK_URL
  delete process.env.MAIL_WEBHOOK_TOKEN
  await new Promise<void>((resolve) => mailServer.close(() => resolve()))
})

function latestCode(kind: string): string {
  const message = [...outbound].reverse().find((entry) => entry.kind === kind)
  if (!message) throw new Error(`No ${kind} email was captured.`)
  const match = /(\d{6})/.exec(message.html)
  if (!match) throw new Error(`No code found in ${kind} email.`)
  return match[1] as string
}

function adminHeaders(builder: request.Test): request.Test {
  return builder.set('Origin', ORIGIN).set('X-Admin-Request', '1')
}

describe('health and readiness', () => {
  it('serves health and readiness', async () => {
    const health = await request(app).get('/api/v1/health').expect(200)
    expect(health.body.status).toBe('ok')
    await request(app).get('/api/v1/ready').expect(200)
  })
})

describe('public content DTO', () => {
  it('strips bank fields and unpublished records', async () => {
    const response = await request(app).get('/api/v1/content').expect(200)
    const content = response.body.data
    expect(content.brand.billing.accountNumber).toBe('')
    expect(content.brand.billing.bankName).toBe('')
    expect(content.brand.billing.ifsc).toBe('')
    expect(content.brand.billing.upiId).toBe('')
    expect(content.posts.every((post: { published: boolean }) => post.published)).toBe(true)
    expect(content.services.every((service: { published: boolean }) => service.published)).toBe(
      true,
    )
  })
})

describe('auth and mutation guard', () => {
  it('rejects a bad password and accepts the owner', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: ADMIN_EMAIL, password: 'wrong-password' })
      .expect(401)
    const me = await admin.get('/api/v1/auth/me').expect(200)
    expect(me.body.data.email).toBe(ADMIN_EMAIL)
  })

  it('rejects an admin mutation without the request header', async () => {
    await admin
      .post('/api/v1/admin/reminders')
      .set('Origin', ORIGIN)
      .send({ title: 'x', body: 'y', dueAt: '2026-12-01T09:00:00.000Z' })
      .expect(403)
  })
})

describe('lead → invoice → customer portal', () => {
  it('captures a lead, issues an invoice, records a payment and shows it in the portal', async () => {
    const lead = await request(app)
      .post('/api/v1/leads')
      .set('Origin', ORIGIN)
      .send({
        name: 'Portal Test',
        email: 'portal-test@example.com',
        phone: '2145550100',
        message: 'The west-facing office is not holding setpoint in the afternoon.',
        urgency: 'normal',
      })
      .expect(201)
    expect(lead.body.data.ref).toMatch(/^ENQ-\d{4}-\d{4}$/)

    const invoice = await adminHeaders(admin.post('/api/v1/admin/invoices'))
      .send({
        customerName: 'Portal Test',
        customerPhone: '2145550100',
        customerEmail: 'portal-test@example.com',
        customerAddress: '1 Test Way, Dallas',
        customerGstin: '',
        service: 'Cassette service',
        issueDate: '2026-01-01',
        dueDate: '2026-01-31',
        status: 'issued',
        lines: [{ description: 'Cassette service', quantity: 1, unitPrice: 1000, taxPercent: 0 }],
        discount: 0,
        taxMode: 'intra',
        notes: '',
        terms: '',
      })
      .expect(201)
    const invoiceId = invoice.body.data.id
    expect(invoice.body.data.ref).toMatch(/^INV-\d{4}-\d{4}$/)

    const paid = await adminHeaders(admin.post(`/api/v1/admin/invoices/${invoiceId}/payments`))
      .send({
        amount: 400,
        method: 'cash',
        reference: 'receipt-1',
        notes: '',
        receivedAt: '2026-01-15',
      })
      .expect(201)
    expect(paid.body.data.totals.balance).toBe(600)

    const register = await request(app)
      .post('/api/v1/portal/auth/register')
      .set('Origin', ORIGIN)
      .send({
        name: 'Portal Test',
        email: 'portal-test@example.com',
        phone: '2145550100',
        address: '1 Test Way, Dallas',
        password: 'PortalPass123!',
      })
      .expect(201)
    expect(register.body.data.status).toBe('pending')

    const customers = await admin
      .get('/api/v1/admin/customers')

      .expect(200)
    const customer = customers.body.data.find(
      (entry: { email: string }) => entry.email === 'portal-test@example.com',
    )
    expect(customer).toBeTruthy()

    await adminHeaders(admin.patch(`/api/v1/admin/customers/${customer.id}`))
      .send({ status: 'active' })
      .expect(200)

    const portal = request.agent(app)
    await portal
      .post('/api/v1/portal/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'portal-test@example.com', password: 'PortalPass123!' })
      .expect(200)

    const file = await portal.get('/api/v1/portal/file').expect(200)
    expect(file.body.data.invoices.some((entry: { id: string }) => entry.id === invoiceId)).toBe(
      true,
    )
    expect(file.body.data.customer.email).toBe('portal-test@example.com')

    await portal
      .post('/api/v1/portal/tickets')
      .set('Origin', ORIGIN)
      .set('X-Customer-Request', '1')
      .send({
        subject: 'Portal email test',
        category: 'support',
        body: 'Please confirm this support request arrives by email only.',
      })
      .expect(201)
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(
      outbound.some(
        (message) =>
          message.kind === 'support-ticket-created' && message.to === 'portal-test@example.com',
      ),
    ).toBe(true)
  })

  it('supports global admin search and CSV export', async () => {
    const search = await admin.get('/api/v1/admin/search?q=portal-test').expect(200)
    const types = search.body.data.results.map((entry: { type: string }) => entry.type)
    expect(types).toContain('Customer')
    expect(types).toContain('Lead')
    expect(types).toContain('Invoice')

    const csv = await admin.get('/api/v1/admin/csv/invoices').expect(200)
    expect(csv.headers['content-type']).toContain('text/csv')
    expect(csv.text).toContain('INV-')
    expect(csv.text).toContain('Portal Test')
  })
})

describe('RBAC', () => {
  it('creates a viewer, allows reads, blocks writes and revokes on disable', async () => {
    const created = await adminHeaders(admin.post('/api/v1/admin/users'))
      .send({
        name: 'Viewer User',
        email: 'viewer@test.local',
        password: 'ViewerPass123!',
        role: 'viewer',
      })
      .expect(201)
    expect(created.body.data.role).toBe('viewer')

    const viewer = request.agent(app)
    await viewer
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'viewer@test.local', password: 'ViewerPass123!' })
      .expect(200)

    await viewer.get('/api/v1/admin/metrics').expect(200)
    await viewer
      .post('/api/v1/admin/reminders')
      .set('Origin', ORIGIN)
      .set('X-Admin-Request', '1')
      .send({ title: 'x', body: 'y', dueAt: '2026-12-01T09:00:00.000Z' })
      .expect(403)
    await viewer.get('/api/v1/admin/users').expect(403)

    await adminHeaders(admin.patch(`/api/v1/admin/users/${created.body.data.id}`))
      .send({ status: 'disabled' })
      .expect(200)

    await viewer.get('/api/v1/auth/me').expect(401)
  })
})

describe('email two-factor authentication', () => {
  it('enables email OTP, challenges login and accepts the mailed code', async () => {
    await adminHeaders(admin.post('/api/v1/admin/users'))
      .send({
        name: 'Two Factor User',
        email: 'twofactor@test.local',
        password: 'TwoFactorPass123!',
        role: 'viewer',
      })
      .expect(201)

    const desk = request.agent(app)
    await desk
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'twofactor@test.local', password: 'TwoFactorPass123!' })
      .expect(200)

    const initial = await desk.get('/api/v1/auth/2fa').expect(200)
    expect(initial.body.data.enabled).toBe(false)
    expect(initial.body.data.mailConfigured).toBe(true)

    const setup = await adminHeaders(desk.post('/api/v1/auth/2fa/setup'))
      .send({ purpose: 'enable' })
      .expect(200)
    expect(setup.body.data.maskedEmail).toContain('@test.local')

    await adminHeaders(desk.post('/api/v1/auth/2fa/confirm'))
      .send({
        challengeId: setup.body.data.challengeId,
        code: latestCode('admin-2fa-enable'),
        purpose: 'enable',
      })
      .expect(200)

    const enabled = await desk.get('/api/v1/auth/2fa').expect(200)
    expect(enabled.body.data.enabled).toBe(true)

    await desk.post('/api/v1/auth/logout').set('Origin', ORIGIN).expect(200)

    const challenge = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'twofactor@test.local', password: 'TwoFactorPass123!' })
      .expect(200)
    expect(challenge.body.data.requires2fa).toBe(true)
    expect(challenge.headers['set-cookie']).toBeUndefined()

    const code = latestCode('admin-2fa-login')
    const wrong = code === '000000' ? '111111' : '000000'
    await request(app)
      .post('/api/v1/auth/2fa/verify')
      .set('Origin', ORIGIN)
      .send({ challengeId: challenge.body.data.challengeId, code: wrong })
      .expect(401)

    const verified = request.agent(app)
    const signedIn = await verified
      .post('/api/v1/auth/2fa/verify')
      .set('Origin', ORIGIN)
      .send({ challengeId: challenge.body.data.challengeId, code })
      .expect(200)
    expect(signedIn.body.data.email).toBe('twofactor@test.local')

    const me = await verified.get('/api/v1/auth/me').expect(200)
    expect(me.body.data.email).toBe('twofactor@test.local')
  })
})

describe('spam and upload defences', () => {
  it('rejects a filled honeypot', async () => {
    await request(app)
      .post('/api/v1/leads')
      .set('Origin', ORIGIN)
      .send({
        name: 'Bot',
        email: 'bot@example.com',
        phone: '2145550111',
        message: 'This should be rejected as spam by the hidden field.',
        urgency: 'normal',
        honeypot: 'https://spam.example',
      })
      .expect(400)
  })

  it('rejects a file whose bytes are not an image', async () => {
    await adminHeaders(admin.post('/api/v1/admin/media'))
      .attach('files', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400)
  })
})
