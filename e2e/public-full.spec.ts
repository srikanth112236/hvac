import { expect, test } from '@playwright/test'
import { preparePublic, unique } from './full-helpers'

async function submitEnquiry(page: import('@playwright/test').Page, marker: string): Promise<void> {
  const form = page.locator('#enquire form')
  await form.getByLabel('Name').fill('Playwright Public')
  await form.getByLabel('Phone').fill('2145550199')
  await form.getByLabel('Email').fill(`${marker.replace(/\s+/g, '.').toLowerCase()}@example.com`)
  const service = form.getByRole('combobox', { name: 'Service', exact: true })
  if (await service.count()) {
    await service.click()
    await page.getByRole('option', { name: /Split AC installation/i }).click()
  }
  const city = form.getByRole('combobox', { name: 'Site city', exact: true })
  if (await city.count()) {
    await city.click()
    await page.getByRole('option').first().click()
  }
  await form
    .getByLabel('The brief')
    .fill(`${marker} — 3,200 sq ft office, west glazing, two failing splits.`)
  await form.getByRole('button', { name: /Send enquiry/i }).click()
  await expect(page.getByText('Lead captured')).toBeVisible({ timeout: 20_000 })
}

test.describe('public website — complete interaction sweep', () => {
  test.describe.configure({ timeout: 90_000 })
  test('consent, shell navigation, services mega menu and footer newsletter', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/CV-CONSENT/)).toBeVisible()
    await page.getByRole('button', { name: /Essential only/i }).click()
    await expect(page.getByText(/CV-CONSENT/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Services', exact: true }).click()
    await expect(page.locator('#services-mega')).toBeVisible()
    await expect(page.getByRole('link', { name: /All \d+ services/i }).first()).toBeVisible()
    await page.keyboard.press('Escape')

    const email = `${unique('newsletter').replace(/\s+/g, '.').toLowerCase()}@example.com`
    const footer = page.locator('footer')
    await footer.getByLabel('Monthly notes').fill(email)
    await footer.getByRole('button', { name: /Subscribe/i }).click()
    await expect(page.getByText(/you are on the list/i)).toBeVisible({ timeout: 20_000 })
  })

  test('home callback form, FAQ accordion and mobile menu', async ({ page }) => {
    await preparePublic(page)
    await page.goto('/')
    const callback = page.locator('#callback')
    await callback.getByLabel('Name').fill('Playwright Callback')
    await callback.getByLabel('Phone').fill('2145550198')
    await callback.getByRole('combobox', { name: 'Scope', exact: true }).click()
    await page.getByRole('option', { name: 'Commercial', exact: true }).click()
    await callback.locator('[role="radio"]').nth(1).click()
    await callback.getByRole('button', { name: /Request callback/i }).click()
    await expect(callback.getByText('Request logged')).toBeVisible({ timeout: 20_000 })
    await expect(callback.getByText(/^ENQ-/)).toBeVisible()

    const faqs = page.locator('#faq button')
    await expect(faqs.first()).toBeVisible()
    if ((await faqs.count()) > 1) await faqs.nth(1).click()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('dialog', { name: 'Site index' })).toBeVisible()
    await page.getByRole('button', { name: 'Close menu' }).click()
    await expect(page.getByRole('dialog', { name: 'Site index' })).toHaveCount(0)
  })

  test('services filter, service detail sections, calculator link and enquiry', async ({
    page,
  }) => {
    await preparePublic(page)
    await page.goto('/services')
    await page.getByRole('tab', { name: /Commercial/i }).click()
    await expect(page.getByText(/\d+ of \d+ services/i)).toBeVisible()

    await page.goto('/services/vrf-systems')
    await expect(page.getByRole('heading', { name: /Selection is a sequence/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /What this includes/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /The numbers we hold/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /What moves the price/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Asked before the quote/i })).toBeVisible()
    const calculator = page.getByRole('link', { name: /Open the .* calculator/i })
    await expect(calculator).toBeVisible()
    const href = await calculator.getAttribute('href')
    expect(href).toMatch(/^\/tools\//)
    await submitEnquiry(page, unique('Public service enquiry'))
  })

  test('work filters, before/after slider and AMC plan selection', async ({ page }) => {
    await preparePublic(page)
    await page.goto('/work')
    const workTabs = page.getByRole('tablist', { name: 'Filter case files by system' })
    await expect(workTabs).toBeVisible()
    const workTab = workTabs.getByRole('tab').nth(1)
    await workTab.click()
    await expect(page.getByText(/\d+ of \d+ files/i)).toBeVisible()
    const indexLink = page.locator('a[href^="#case-"]').first()
    await expect(indexLink).toBeVisible()
    expect(await indexLink.getAttribute('href')).toMatch(/^#case-/)
    const compare = page.getByRole('slider', { name: 'Compare' })
    await compare.fill('72')
    await expect(compare).toHaveValue('72')
    await expect(page.getByText('72%', { exact: true })).toBeVisible()

    await page.goto('/amc')
    await page.getByRole('link', { name: /Select Comprehensive/i }).click()
    await expect(page.getByRole('link', { name: /Comprehensive selected/i })).toBeVisible()
    await expect(page.getByLabel('The brief')).toHaveValue(
      /AMC enquiry for the Comprehensive plan/i,
    )
  })

  test('products filter, system quote CTA and journal filters/article', async ({ page }) => {
    await preparePublic(page)
    await page.goto('/products')
    await page.getByRole('tab', { name: /Industrial/i }).click()
    await expect(page.getByText(/\d+ of \d+ systems/i)).toBeVisible()
    const quote = page.getByRole('link', { name: 'Request quote' }).first()
    await expect(quote).toHaveAttribute('href', /^\/contact\?service=/)

    await page.goto('/blog')
    await page.getByRole('tab', { name: /Commissioning/i }).click()
    await expect(page.getByText(/\d+ of \d+ files/i)).toBeVisible()
    await expect(
      page
        .locator('section')
        .filter({ hasText: 'Featured file' })
        .getByText('Commissioning')
        .first(),
    ).toBeVisible()
    const open = page.getByRole('link', { name: 'Open note' }).first()
    await open.click()
    await expect(page.getByText('Direct answer')).toBeVisible()
    await expect(page.getByText('Key takeaways')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible()
  })

  test('contact, book and quote forms plus calculator prefill', async ({ page }) => {
    await preparePublic(page)
    await page.goto('/contact')
    await expect(page.getByRole('link', { name: /Open in Maps/i })).toHaveAttribute(
      'href',
      /openstreetmap\.org\/search\?query=.*Dallas/i,
    )
    await page.locator('#enquiry-attachments').setInputFiles({
      name: 'qa-brief.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\nQA attachment'),
    })
    await submitEnquiry(page, unique('Public contact'))

    await page.goto('/book')
    await expect(page.locator('#enquire form').getByLabel('The brief')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open the portal' })).toBeVisible()

    await page.goto('/quote')
    await expect(page.locator('#enquire form').getByLabel('The brief')).toBeVisible()
    await expect(page.getByRole('link', { name: /Open customer portal/i })).toBeVisible()

    await page.goto('/tools/room-tonnage')
    await page.getByLabel('Room length (ft)').fill('24')
    await page.getByLabel('Room width (ft)').fill('18')
    await page.getByLabel('Occupants').fill('6')
    await page.getByRole('link', { name: /Send these figures/i }).click()
    await expect(page.getByLabel('The brief')).toHaveValue(/Sizing helper/i)
  })

  test('legal pages, aliases and 404', async ({ page }) => {
    await preparePublic(page)
    await page.goto('/legal/privacy')
    await expect(page.getByRole('heading', { name: /Privacy policy/i })).toBeVisible()
    await expect(page.getByText('On this page', { exact: true })).toBeVisible()
    await page.goto('/terms')
    await expect(page).toHaveURL(/\/legal\/terms$/)
    await page.goto('/does-not-exist')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Return to the plate' })).toBeVisible()
  })
})
