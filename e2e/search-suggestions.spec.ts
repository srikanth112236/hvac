import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

test('search shows two-character suggestions and selects a record', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/admin/invoices')

  const search = page.getByLabel('Search invoices')
  await search.fill('I')
  await expect(page.getByRole('listbox', { name: 'Search invoices suggestions' })).toHaveCount(0)

  await search.fill('IN')
  const suggestions = page.getByRole('listbox', { name: 'Search invoices suggestions' })
  await expect(suggestions).toBeVisible()

  const first = suggestions.getByRole('option').first()
  await expect(first).toBeVisible()
  await first.click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(search).toHaveValue(/INV-/)
  await page.getByRole('button', { name: 'Close panel' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})
