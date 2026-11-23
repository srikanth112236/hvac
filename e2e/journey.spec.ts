import { expect, test } from '@playwright/test'

const ORIGIN = 'http://127.0.0.1:5175'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@coolvane.example'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Coolvane!2026'

test('lead → admin invoice → customer portal journey', async ({ page, browser, request }) => {
  const stamp = Date.now()
  const email = `journey-${stamp}@example.com`
  const password = 'JourneyPass123!'

  // 1. Public lead form.
  await page.goto('/contact')
  const leadForm = page.locator('#enquire form')
  await leadForm.getByLabel('Name').fill('Journey Customer')
  await leadForm.getByLabel('Phone').fill('2145550199')
  await leadForm.getByLabel('Email').fill(email)
  await leadForm.getByLabel('The brief').fill('Journey lead: office cassette not holding setpoint.')
  await leadForm.getByRole('button', { name: /Send enquiry/i }).click()
  await expect(page.getByText(/Lead captured/i)).toBeVisible()

  // 2. Admin signs in through the UI and raises the invoice.
  await page.goto('/admin')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /Open control room/i }).click()
  await expect(page).toHaveURL(/\/admin$/)

  await page.goto('/admin/invoices')
  await page.getByRole('button', { name: /New invoice/i }).click()
  await page.getByLabel('Customer / building').fill('Journey Customer')
  await page.getByLabel('Phone').fill('2145550199')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Service / job').fill('Journey cassette service')
  await page.getByLabel('Billing address').fill('99 Journey Way, Dallas')
  await page
    .getByPlaceholder('Description (e.g. Daikin FTKM50 cassette)')
    .fill('Journey cassette service')
  await page.getByLabel('Line 1 unit price').fill('1250')
  await page.getByRole('button', { name: /^Create invoice$/i }).click()
  await expect(page).toHaveURL(/\/admin\/invoices\/[^/]+$/)

  // 3. Customer registers through the portal UI.
  const portalContext = await browser.newContext()
  const portal = await portalContext.newPage()
  await portal.goto('/portal')
  await portal.getByRole('tab', { name: /Create account/i }).click()
  await portal.getByLabel('Full name').fill('Journey Customer')
  await portal.getByLabel('Phone').fill('2145550199')
  await portal.getByLabel('Service address').fill('99 Journey Way, Dallas')
  await portal.getByLabel('Email').fill(email)
  await portal.getByLabel('Password').fill(password)
  await portal.getByRole('button', { name: /Create my account/i }).click()
  await expect(portal.getByText(/Account created|Check your email/i)).toBeVisible()

  // 4. Admin approval (API helper) then portal sign-in and invoice visibility.
  await request.post('/api/v1/auth/login', {
    headers: { Origin: ORIGIN },
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  const customersResponse = await request.get('/api/v1/admin/customers')
  const customer = (await customersResponse.json()).data.find(
    (entry: { email: string }) => entry.email === email,
  )
  expect(customer).toBeTruthy()
  await request.patch(`/api/v1/admin/customers/${customer.id}`, {
    headers: { Origin: ORIGIN, 'X-Admin-Request': '1' },
    data: { status: 'active' },
  })

  await portal.getByLabel('Email').fill(email)
  await portal.getByLabel('Password').fill(password)
  await portal.getByRole('button', { name: /Sign in to portal/i }).click()
  await expect(portal.getByRole('tab', { name: /Invoices/i })).toBeVisible()

  const invoicesResponse = await request.get('/api/v1/admin/invoices')
  const invoice = (await invoicesResponse.json()).data.find(
    (entry: { customerEmail: string }) => entry.customerEmail === email,
  )
  expect(invoice).toBeTruthy()
  await portal.getByRole('tab', { name: /Invoices/i }).click()
  await expect(portal.getByText(invoice.ref)).toBeVisible()

  await portalContext.close()
})
