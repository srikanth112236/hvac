import { expect, test } from '@playwright/test'
import { DEMO_NAME, loginPortal, pickDate, selectOption, unique } from './full-helpers'

test.describe('customer portal — complete interaction sweep', () => {
  test.describe.configure({ timeout: 90_000 })
  test('overview, invoices, quotations, equipment, AMC and reports', async ({ page }) => {
    await loginPortal(page)
    await expect(page.getByText('Outstanding', { exact: true })).toBeVisible()
    await expect(page.getByText('Next visit', { exact: true })).toBeVisible()

    await page.locator('#portal-tab-invoices').click()
    const invoice = page.getByRole('row').filter({ hasText: 'INV-2026-9001' }).first()
    await invoice.getByRole('button', { name: 'View', exact: true }).click()
    const invoiceDialog = page.getByRole('dialog', { name: /Invoice INV-2026-9001/i })
    await expect(invoiceDialog).toBeVisible()
    await expect(invoiceDialog.getByText(/Balance due/i)).toBeVisible()
    const invoicePdf = invoiceDialog.getByRole('link', { name: /Download PDF/i })
    await expect(invoicePdf).toHaveAttribute('href', /\/portal\/invoices\/.+\/pdf/)
    await invoiceDialog.getByRole('button', { name: 'Close', exact: true }).click()

    await page.locator('#portal-tab-quotes').click()
    const changesQuote = page.locator('article').filter({ hasText: 'QT-2026-9001' }).first()
    await changesQuote.getByRole('button', { name: 'Open', exact: true }).click()
    const changesDialog = page.getByRole('dialog', { name: /Quotation QT-2026-9001/i })
    await expect(changesDialog).toBeVisible()
    await changesDialog.getByRole('button', { name: 'Request changes', exact: true }).click()
    await changesDialog.getByLabel('What should change?').fill('Add a Saturday access option.')
    await changesDialog.getByRole('button', { name: 'Send request', exact: true }).click()
    await expect(page.getByText('Change requested')).toBeVisible({ timeout: 20_000 })
    const requestedQuote = page.locator('article').filter({ hasText: 'QT-2026-9001' }).first()
    await requestedQuote.getByRole('button', { name: 'Open', exact: true }).click()
    const requestedDialog = page.getByRole('dialog', { name: /Quotation QT-2026-9001/i })
    await expect(
      requestedDialog.getByRole('button', { name: 'Update request', exact: true }),
    ).toBeVisible()
    await requestedDialog.getByRole('button', { name: 'Update request', exact: true }).click()
    await expect(requestedDialog.getByLabel('What should change?')).toHaveValue(
      'Add a Saturday access option.',
    )
    await requestedDialog.getByRole('button', { name: 'Cancel', exact: true }).last().click()
    await requestedDialog.getByRole('button', { name: 'Close', exact: true }).click()

    const acceptQuote = page.locator('article').filter({ hasText: 'QT-2026-9004' }).first()
    await acceptQuote.getByRole('button', { name: 'Open', exact: true }).click()
    const acceptDialog = page.getByRole('dialog', { name: /Quotation QT-2026-9004/i })
    await expect(acceptDialog.getByRole('link', { name: /Download PDF/i })).toHaveAttribute(
      'href',
      /\/portal\/quotations\/.+\/pdf/,
    )
    await acceptDialog.getByRole('button', { name: 'Accept quotation', exact: true }).click()
    await expect(page.getByText('Quotation accepted')).toBeVisible({ timeout: 20_000 })

    await page.locator('#portal-tab-equipment').click()
    await page.getByRole('button', { name: /View equipment VRF outdoor plant/i }).click()
    await expect(page.getByRole('dialog', { name: /VRF outdoor plant/i })).toBeVisible()
    await page
      .getByRole('button', { name: /^Close( panel)?$/ })
      .last()
      .click()

    await page.locator('#portal-tab-cover').click()
    await page.getByRole('button', { name: /View AMC AMC-2026-9001/i }).click()
    await expect(page.getByRole('dialog', { name: /AMC-2026-9001/i })).toBeVisible()
    await page
      .getByRole('button', { name: /^Close( panel)?$/ })
      .last()
      .click()

    await page.locator('#portal-tab-reports').click()
    await page.getByRole('button', { name: /View report RPT-2026-9001/i }).click()
    await expect(page.getByRole('dialog', { name: /Cassette deep clean/i })).toBeVisible()
    await expect(
      page
        .getByRole('dialog', { name: /Cassette deep clean/i })
        .getByText('Findings', { exact: true })
        .first(),
    ).toBeVisible()
    await page
      .getByRole('button', { name: /^Close( panel)?$/ })
      .last()
      .click()
  })

  test('booking, reschedule, cancel and rebook hand-off', async ({ page }) => {
    await loginPortal(page)
    const marker = unique('Portal booking')
    await page
      .getByRole('button', { name: /Book a visit/i })
      .first()
      .click()
    const booking = page.getByRole('dialog', { name: /Book a service visit/i })
    await expect(booking).toBeVisible()
    await selectOption(page, 'Service', 'Split AC installation')
    await pickDate(page, 'Preferred date', 3)
    await booking.getByLabel('What should the engineer know?').fill(marker)
    await booking.getByRole('button', { name: 'Request visit', exact: true }).click()
    await expect(page.getByText('Visit requested')).toBeVisible({ timeout: 20_000 })

    await expect(page.locator('#portal-panel-visits')).toContainText(marker)
    const visit = page.locator('article').filter({ hasText: marker }).first()
    await visit.getByRole('button', { name: 'Reschedule', exact: true }).click()
    const reschedule = page.getByRole('dialog', { name: /Reschedule APT-/i })
    await pickDate(page, 'New date', 4)
    await reschedule.getByRole('button', { name: 'Save new date', exact: true }).click()
    await expect(page.getByText('Visit rescheduled')).toBeVisible({ timeout: 20_000 })

    const updatedVisit = page.locator('article').filter({ hasText: marker }).first()
    page.once('dialog', (dialog) => void dialog.accept())
    await updatedVisit.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByText('Visit cancelled')).toBeVisible({ timeout: 20_000 })

    const completed = page.locator('article').filter({ hasText: 'APT-2026-9002' }).first()
    await completed.getByRole('button', { name: 'Rebook service', exact: true }).click()
    await expect(page.getByRole('dialog', { name: /Rebook a service visit/i })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).last().click()
  })

  test('support ticket, reply, site CRUD, profile and preferences', async ({ page }) => {
    await loginPortal(page)
    await page.locator('#portal-tab-support').click()
    await page.getByRole('button', { name: /New request/i }).click()
    const ticket = page.getByRole('dialog', { name: /Raise a request/i })
    const subject = unique('Portal ticket')
    await ticket.getByLabel('Subject').fill(subject)
    await selectOption(page, 'Category', 'Billing')
    await ticket
      .getByLabel('What happened?')
      .fill('Please confirm the part-payment allocation for invoice INV-2026-9002.')
    await ticket.getByRole('button', { name: /Send to the works desk/i }).click()
    const ticketDialog = page.getByRole('dialog', { name: new RegExp(subject) })
    await expect(ticketDialog).toBeVisible({ timeout: 20_000 })
    await ticketDialog.getByLabel('Reply').fill('Adding the finance reference: ACH-22119.')
    await ticketDialog.getByRole('button', { name: /Send reply/i }).click()
    await expect(page.getByText('Reply sent')).toBeVisible({ timeout: 20_000 })
    await page
      .getByRole('button', { name: /^Close( panel)?$/ })
      .last()
      .click()

    await page.locator('#portal-tab-account').click()
    const siteName = unique('QA Site')
    await page.getByRole('button', { name: /Add site/i }).click()
    const siteDialog = page.getByRole('dialog', { name: /Add a site/i })
    await siteDialog.getByLabel('Site name').fill(siteName)
    await siteDialog.getByLabel('Service address').fill('3000 QA Avenue, Dallas')
    await siteDialog.getByLabel('City').fill('Dallas')
    await siteDialog.getByLabel('Region / state').fill('TX')
    await siteDialog.getByLabel('Postal code').fill('75201')
    await siteDialog.getByRole('button', { name: /Save site/i }).click()
    await expect(
      page.getByRole('button', { name: new RegExp(`View site ${siteName}`) }),
    ).toBeVisible()

    const siteCard = page.locator('article').filter({ hasText: siteName }).first()
    await siteCard.getByRole('button', { name: 'Edit', exact: true }).click()
    const editSite = page.getByRole('dialog', { name: new RegExp(`Edit ${siteName}`) })
    await editSite.getByLabel('City').fill('Plano')
    await editSite.getByRole('button', { name: /Save site/i }).click()
    await expect(page.locator('#portal-panel-account')).toContainText('Plano')
    page.once('dialog', (dialog) => void dialog.accept())
    await page
      .locator('article')
      .filter({ hasText: siteName })
      .first()
      .getByRole('button', { name: 'Remove', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: new RegExp(`View site ${siteName}`) }),
    ).toHaveCount(0)

    const profile = page.locator('section').filter({ hasText: 'Contact details' }).first()
    await profile.getByLabel('Full name').fill(`${DEMO_NAME} QA`)
    await profile.getByRole('button', { name: /Save profile/i }).click()
    await expect(page.getByText(`${DEMO_NAME} QA`).first()).toBeVisible({ timeout: 20_000 })
    await profile.getByLabel('Full name').fill(DEMO_NAME)
    await profile.getByRole('button', { name: /Save profile/i }).click()

    await page.getByText('Seasonal notes', { exact: true }).click()
    await expect(page.getByText('Preferences saved')).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: /Sign out/i }).click()
    await expect(
      page.getByRole('heading', { name: /Your system, your file, your next visit/i }),
    ).toBeVisible()
  })

  test('reset, verify and blocked account states', async ({ page }) => {
    await page.goto('/portal?reset=demo-reset-token-2026')
    await expect(page.getByRole('heading', { name: /Choose a new password/i })).toBeVisible()
    await page.getByLabel('New password').fill('Coolvane!Reset2026')
    await page.getByLabel('Confirm password').fill('Coolvane!Reset2026')
    await page.getByRole('button', { name: /Update password/i }).click()
    await expect(page.getByText(/Password updated|Sign in/i).first()).toBeVisible({
      timeout: 20_000,
    })

    await page.goto('/portal?verify=demo-verify-token-2026')
    await expect(page.getByText(/Email verified/i)).toBeVisible({ timeout: 20_000 })

    await page.goto('/portal')
    await page.getByLabel('Email').fill('pending.demo@example.com')
    await page.getByLabel('Password').fill('Coolvane!Demo2026')
    await page.getByRole('button', { name: /Sign in to portal/i }).click()
    await expect(page.getByText(/waiting for approval/i)).toBeVisible({ timeout: 20_000 })

    await page.getByLabel('Email').fill('suspended.demo@example.com')
    await page.getByLabel('Password').fill('Coolvane!Demo2026')
    await page.getByRole('button', { name: /Sign in to portal/i }).click()
    await expect(page.getByText(/suspended/i)).toBeVisible({ timeout: 20_000 })
  })
})
