import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const ORIGIN = 'http://127.0.0.1:5175'
const ADMIN_EMAIL = 'admin@test.local'
const ADMIN_PASSWORD = 'TestPass123!'

let app: Express
let admin: ReturnType<typeof request.agent>

beforeAll(async () => {
  const module = await import('./app.js')
  app = module.app
  admin = request.agent(app)
  await admin
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    .expect(200)
})

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
    expect(content.services.every((service: { published: boolean }) => service.published)).toBe(true)
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

    const invoice = await adminHeaders(
      admin.post('/api/v1/admin/invoices'),
    )
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
        lines: [
          { description: 'Cassette service', quantity: 1, unitPrice: 1000, taxPercent: 0 },
        ],
        discount: 0,
        taxMode: 'intra',
        notes: '',
        terms: '',
      })
      .expect(201)
    const invoiceId = invoice.body.data.id
    expect(invoice.body.data.ref).toMatch(/^INV-\d{4}-\d{4}$/)

    const paid = await adminHeaders(
      admin
        .post(`/api/v1/admin/invoices/${invoiceId}/payments`)
        ,
    )
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

    await adminHeaders(
      admin
        .patch(`/api/v1/admin/customers/${customer.id}`)
        ,
    )
      .send({ status: 'active' })
      .expect(200)

    const portal = request.agent(app)
    await portal
      .post('/api/v1/portal/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'portal-test@example.com', password: 'PortalPass123!' })
      .expect(200)

    const file = await portal.get('/api/v1/portal/file').expect(200)
    expect(file.body.data.invoices.some((entry: { id: string }) => entry.id === invoiceId)).toBe(true)
    expect(file.body.data.customer.email).toBe('portal-test@example.com')
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
    await adminHeaders(
      admin
        .post('/api/v1/admin/media')
        ,
    )
      .attach('files', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400)
  })
})

