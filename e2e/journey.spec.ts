import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

test('lead → admin invoice → customer portal journey', async ({ page, browser }) => {
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
  await loginAdmin(page)

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
  await expect(page.getByText('Journey cassette service').first()).toBeVisible()

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

  // 4. Approve the pending account in the admin UI, then sign in to the portal.
  await page.goto('/admin/customers')
  await page.getByLabel('Search customers').fill(email)
  await expect(page.getByText(email, { exact: true })).toBeVisible()
  const approval = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/admin/customers/') &&
      response.request().method() === 'PATCH',
  )
  await page.getByRole('button', { name: /^Approve$/ }).click()
  await approval

  await portal.getByLabel('Email').fill(email)
  await portal.getByLabel('Password').fill(password)
  await portal.getByRole('button', { name: /Sign in to portal/i }).click()
  await expect(portal.getByRole('tab', { name: /Invoices/i })).toBeVisible()
  await portal.getByRole('tab', { name: /Invoices/i }).click()
  const portalInvoice = portal.getByRole('row').filter({ hasText: 'Journey cassette service' })
  await expect(portalInvoice).toBeVisible()
  await expect(portalInvoice).toContainText(/INV-\d{4}-\d{4}/)
  await expect(portalInvoice).toContainText('$1,475')

  await portalInvoice.getByRole('button', { name: 'View' }).click()
  const invoiceDialog = portal.getByRole('dialog', { name: /Invoice INV-/ })
  await expect(invoiceDialog).toBeVisible()
  await expect(invoiceDialog).toContainText('Journey cassette service')
  await invoiceDialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(invoiceDialog).toBeHidden()

  await portalContext.close()
})
