import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

const pageIds = [
  'home',
  'services',
  'process',
  'about',
  'work',
  'amc',
  'blog',
  'products',
  'contact',
  'services-detail',
  'work-cases',
  'products-detail',
  'amc-plans',
  'amc-details',
  'process-details',
  'faqs',
  'legal',
  'voices',
  'about-sections',
]

test('content studio parity — four workspaces, every page and the classic fallback', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await loginAdmin(page)

  await page.goto('/admin/content')
  await expect(page.getByRole('heading', { name: 'Content studio.' })).toBeVisible()

  for (const label of ['Pages & sections', 'Brand & contact', 'Billing identity', 'SEO & social']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
  }

  const rail = page.locator('button[data-page-id]')
  await expect(rail).toHaveCount(pageIds.length)

  for (const id of pageIds) {
    await page.locator(`button[data-page-id="${id}"]`).click()
    await expect(page.locator(`h2[data-page-id="${id}"]`)).toBeVisible()
  }

  // Multi-page collections open as cards, then a focused editable page.
  await page.locator('button[data-page-id="services-detail"]').click()
  await expect(page.getByRole('heading', { name: 'Service detail pages' })).toBeVisible()
  await page
    .getByRole('button', { name: /Split AC installation/i })
    .first()
    .click()
  await expect(page.getByLabel('Name')).toHaveValue('Split AC installation')
  await expect(page.getByLabel('Icon', { exact: true })).toBeVisible()
  await expect(page.getByText('Included in scope')).toBeVisible()
  await expect(page.getByText('Specification rows')).toBeVisible()
  await expect(page.getByText('Service questions')).toBeVisible()
  await page.getByRole('button', { name: /All service pages/i }).click()
  await expect(page.getByRole('heading', { name: 'Service detail pages' })).toBeVisible()

  await page.locator('button[data-page-id="work-cases"]').click()
  await page
    .getByRole('button', { name: /Edit page/i })
    .first()
    .click()
  await expect(page.getByLabel('Challenge')).toBeVisible()

  // Direct service links open the selected page only and expose the Nearby fields.
  await page.goto('/admin/content?service=vrf-systems')
  await expect(page.getByText('VRF / VRV design & installation').first()).toBeVisible()
  await expect(page.getByText('Nearby services', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Related case file')).toBeVisible()
  await expect(page.getByRole('link', { name: /View public page/i })).toHaveAttribute(
    'href',
    '/services/vrf-systems',
  )

  await page.getByRole('button', { name: 'Brand & contact', exact: true }).click()
  await expect(page.getByText('Logo & favicon')).toBeVisible()
  await expect(page.getByText('Global theme')).toBeVisible()

  await page.getByRole('link', { name: /Classic editor/i }).click()
  await expect(page.getByRole('heading', { name: /Everything the site says/i })).toBeVisible()

  expect(pageErrors).toEqual([])
})
