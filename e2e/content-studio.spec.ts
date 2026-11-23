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

  await page.getByRole('button', { name: 'Brand & contact', exact: true }).click()
  await expect(page.getByText('Logo & favicon')).toBeVisible()
  await expect(page.getByText('Global theme')).toBeVisible()

  await page.getByRole('link', { name: /Classic editor/i }).click()
  await expect(page.getByRole('heading', { name: /Everything the site says/i })).toBeVisible()

  expect(pageErrors).toEqual([])
})
