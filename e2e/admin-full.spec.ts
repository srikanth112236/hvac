import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'
import { pickDate, selectOption, unique } from './full-helpers'

test.describe('admin control room — complete interaction sweep', () => {
  test.describe.configure({ timeout: 90_000 })
  test('overview, global search, notifications, leads and customers', async ({ page }) => {
    await loginAdmin(page)
    await expect(page.getByRole('heading', { name: 'Today at the works.' })).toBeVisible()
    await expect(page.getByText('Pipeline by stage')).toBeVisible()

    await page.keyboard.press('Control+k')
    const search = page.getByRole('dialog', { name: 'Search the works' })
    await expect(search).toBeVisible()
    await search.getByLabel('Search').fill('Avery Stone')
    await expect(search.getByText('Avery Stone').first()).toBeVisible({ timeout: 20_000 })
    await page.keyboard.press('Escape')

    await page.goto('/admin/notifications')
    await expect(page.getByRole('heading', { name: 'Notifications.' })).toBeVisible()
    const markAll = page.getByRole('button', { name: 'Mark all read' })
    if (await markAll.isEnabled()) await markAll.click()
    await page.getByRole('combobox', { name: 'Read state' }).click()
    await page.getByRole('option', { name: 'Read', exact: true }).click()
    await expect(page.getByText('Read state')).toBeVisible()

    await page.goto('/admin/leads')
    await expect(
      page.getByRole('heading', { name: /Leads, from first call to invoice/i }),
    ).toBeVisible()
    await page.getByLabel('Search leads').fill('ENQ-2026-9001')
    await page.getByRole('button', { name: /Avery Stone ENQ-2026-9001/i }).click()
    const lead = page.getByRole('dialog')
    await expect(lead).toBeVisible()
    await selectOption(page, 'Stage', 'Contacted')
    await page.getByLabel('Owner').fill('QA desk')
    await page.getByLabel('Value ($)').fill('2100')
    await page.getByLabel('Add a note').fill('QA pass: contacted and quote scheduled.')
    await page.getByRole('button', { name: 'Save lead', exact: true }).click()
    await expect(page.getByText('Lead updated')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Close panel' }).click()

    await page.getByRole('button', { name: 'New lead', exact: true }).click()
    const newLead = page.getByRole('dialog', { name: 'New lead' })
    const leadName = unique('QA Lead')
    await newLead.getByLabel('Name').fill(leadName)
    await newLead.getByLabel('Phone').fill('2145550177')
    await newLead
      .getByLabel('Email')
      .fill(`${leadName.replace(/\s+/g, '.').toLowerCase()}@example.com`)
    await newLead.getByLabel('City').fill('Dallas')
    await newLead.getByLabel('Brief').fill('QA-created phone enquiry for the pipeline.')
    await newLead.getByLabel('Estimated value ($)').fill('900')
    await newLead.getByRole('button', { name: /Create lead/i }).click()
    await expect(page.getByText('Lead created')).toBeVisible({ timeout: 20_000 })

    await page.goto('/admin/customers')
    await expect(
      page.getByRole('heading', { name: /Customers and their complete file/i }),
    ).toBeVisible()
    const pendingEmail = `${unique('qa.pending').replace(/\s+/g, '.').toLowerCase()}@example.com`
    await page.request.post('/api/v1/portal/auth/register', {
      data: {
        name: 'QA Pending Account',
        email: pendingEmail,
        phone: '2145550191',
        address: '10 QA Pending Lane, Dallas',
        password: 'Coolvane!QA2026',
      },
    })
    await page.reload()
    await page.getByLabel('Search customers').fill(pendingEmail)
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(page.getByText('Status updated').first()).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: 'Add customer', exact: true }).click()
    const customer = page.getByRole('dialog', { name: 'Add customer' })
    const customerName = unique('QA Customer')
    const customerEmail = `${customerName.replace(/\s+/g, '.').toLowerCase()}@example.com`
    await customer.getByLabel('Customer name').fill(customerName)
    await customer.getByLabel('Mobile number').fill('2145550188')
    await customer.getByLabel('Email').fill(customerEmail)
    await customer.getByLabel('Service address').fill('500 QA Street, Dallas')
    await customer.getByRole('button', { name: 'Add customer', exact: true }).last().click()
    await expect(page.getByText('Customer added')).toBeVisible({ timeout: 20_000 })

    await page.getByLabel('Search customers').fill(customerEmail)
    await expect(page.getByText(customerEmail, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Suspend', exact: true }).click()
    await expect(page.getByText('Status updated').first()).toBeVisible({ timeout: 20_000 })
  })

  test('dispatch, jobs and customer file modules', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/dispatch')
    await expect(page.getByRole('heading', { name: 'Today at the works.' })).toBeVisible()
    await page.getByRole('button', { name: 'Upcoming', exact: true }).click()
    await page.getByRole('combobox', { name: 'Status for APT-2026-9003' }).click()
    await page.getByRole('option', { name: 'Engineer en route', exact: true }).click()
    await expect(page.getByText('Visit updated')).toBeVisible({ timeout: 20_000 })

    await page
      .getByRole('button', { name: /Schedule visit/i })
      .first()
      .click()
    const visit = page.getByRole('dialog', { name: /Schedule a service visit/i })
    const customerSearch = visit.getByRole('combobox', { name: 'Find customer' })
    await customerSearch.fill('Avery Stone')
    await page.getByRole('option', { name: /Avery Stone/i }).click()
    await pickDate(page, 'Visit date', 6)
    await page.getByRole('combobox', { name: 'Window', exact: true }).click()
    await page.getByRole('option', { name: /Afternoon/i }).click()
    await visit.getByRole('button', { name: 'Schedule visit', exact: true }).click()
    await expect(page.getByText('Visit scheduled')).toBeVisible({ timeout: 20_000 })

    await page.goto('/admin/jobs')
    await page.getByRole('button', { name: /Generate AMC visits/i }).click()
    await expect(page.getByText(/visits? generated|already/i)).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /View job JOB-2026-9001/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Close panel' }).click()

    await page.goto('/admin/customers/11111111-1111-4111-8111-111111111111')
    await expect(page.getByText('Avery Stone').first()).toBeVisible()
    await page.getByRole('button', { name: /^Sites/i }).click()
    await page.getByRole('button', { name: /Add site/i }).click()
    const site = page.getByRole('dialog', { name: /Add site/i })
    const label = unique('QA Admin Site')
    await site.getByLabel('Site name').fill(label)
    await site.getByLabel('Address').fill('600 QA Admin Road, Dallas')
    await site.getByLabel('City').fill('Dallas')
    await site.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText(label)).toBeVisible({ timeout: 20_000 })
    page.once('dialog', (dialog) => void dialog.accept())
    await page
      .locator('article')
      .filter({ hasText: label })
      .first()
      .getByRole('button', { name: 'Remove', exact: true })
      .click()
    await expect(page.getByText(label)).toHaveCount(0)

    await page.getByRole('button', { name: /^Equipment/i }).click()
    await page.getByRole('button', { name: /Add equipment/i }).click()
    const equipment = page.getByRole('dialog', { name: /Add equipment/i })
    const equipmentName = unique('QA Equipment')
    await equipment.getByLabel('Name').fill(equipmentName)
    await equipment.getByLabel('Brand').fill('Mitsubishi')
    await equipment.getByLabel('Model').fill('QA-100')
    await equipment.getByLabel('Serial').fill('QA-SERIAL-01')
    await equipment.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText(equipmentName).first()).toBeVisible({ timeout: 20_000 })
    page.once('dialog', (dialog) => void dialog.accept())
    await page
      .locator('article')
      .filter({ hasText: equipmentName })
      .getByRole('button', { name: 'Remove', exact: true })
      .click()

    await page.getByRole('button', { name: /^Preferences/i }).click()
    await page.getByLabel('Seasonal notes').click()
    await expect(page.getByText('Preferences saved').first()).toBeVisible({ timeout: 20_000 })
  })

  test('invoice detail, quotations and expense ledger', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/invoices/demo-invoice-unpaid')
    await expect(page.getByText('INV-2026-9001').first()).toBeVisible()
    await page.getByRole('button', { name: /Record payment/i }).click()
    const payment = page.getByRole('dialog', { name: /Record payment/i })
    await payment.getByLabel('Amount').fill('100')
    await payment.getByLabel('Reference').fill('QA-PAY-100')
    await payment
      .getByRole('button', { name: /Save payment|Record payment/i })
      .last()
      .click()
    await expect(page.getByText(/Part payment recorded|Invoice settled/)).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole('link', { name: /Download PDF/i }).click({ trial: true })

    await page.getByRole('button', { name: 'Remind', exact: true }).click()
    await expect(page.getByText(/Payment reminder queued/i)).toBeVisible({ timeout: 20_000 })

    await page.goto('/admin/quotations')
    const quoteTitle = unique('QA Quotation')
    const createdQuote = await page.request.post('/api/v1/admin/quotations', {
      headers: { 'x-admin-request': '1' },
      data: {
        customerId: '11111111-1111-4111-8111-111111111111',
        title: quoteTitle,
        service: 'VRF / VRV design & installation',
        status: 'sent',
        validUntil: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
        lines: [{ description: quoteTitle, quantity: 1, unitPrice: 500, taxPercent: 8.25 }],
      },
    })
    expect(createdQuote.ok()).toBeTruthy()
    await page.reload()
    const sentQuote = page.locator('article').filter({ hasText: quoteTitle }).first()
    await sentQuote.getByRole('button', { name: 'Mark accepted', exact: true }).click()
    await expect(page.getByText('Quotation updated')).toBeVisible({ timeout: 20_000 })

    const changeTitle = unique('QA Reissue')
    const changeQuote = await page.request.post('/api/v1/admin/quotations', {
      headers: { 'x-admin-request': '1' },
      data: {
        customerId: '11111111-1111-4111-8111-111111111111',
        title: changeTitle,
        service: 'VRF / VRV design & installation',
        status: 'changes-requested',
        validUntil: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
        lines: [{ description: changeTitle, quantity: 1, unitPrice: 640, taxPercent: 8.25 }],
      },
    })
    expect(changeQuote.ok()).toBeTruthy()
    await page.reload()
    const reissueRow = page.locator('article').filter({ hasText: changeTitle }).first()
    await reissueRow.getByRole('button', { name: 'Reissue', exact: true }).click()
    await expect(page.getByText('Quotation updated').first()).toBeVisible({ timeout: 20_000 })

    await page.goto('/admin/expenses')
    await page.getByRole('button', { name: 'Record expense', exact: true }).click()
    const expense = page.getByRole('dialog', { name: 'Record expense' })
    const description = unique('QA Expense')
    await expense.getByLabel('Description').fill(description)
    await expense.getByLabel('Vendor').fill('QA Supply')
    await expense.getByLabel('Amount').fill('125')
    await expense.getByRole('button', { name: 'Record expense', exact: true }).last().click()
    await expect(page.getByText('Expense recorded')).toBeVisible({ timeout: 20_000 })

    await page.getByLabel('Search', { exact: true }).fill(description)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: new RegExp(`Edit ${description}`, 'i') }).click()
    const editExpense = page.getByRole('dialog', { name: 'Edit expense' })
    await editExpense.getByLabel('Amount').fill('150')
    await editExpense.getByRole('button', { name: 'Save expense', exact: true }).click()
    await expect(page.getByText('Expense updated')).toBeVisible({ timeout: 20_000 })
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: new RegExp(`Delete ${description}`, 'i') }).click()
    await expect(page.getByText('Expense deleted')).toBeVisible({ timeout: 20_000 })
  })
})
