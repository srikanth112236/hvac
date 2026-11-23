import { expect, test } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@coolvane.example'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Coolvane!2026'

test('revision ledger has version and page-by-page workspaces', async ({ page }) => {
  await page.goto('/admin')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /Open control room/i }).click()
  await expect(page).toHaveURL(/\/admin$/)

  await page.goto('/admin/content/revisions')
  await expect(page.getByRole('heading', { name: 'Every change, reversible.' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Versions/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Page by page/ })).toBeVisible()

  // Versions table and review modal.
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('button', { name: 'Review', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: /^Review v\d+$/ })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  // Page ledger.
  await page.getByRole('button', { name: /^Page by page/ }).click()
  await expect(page.getByText('Search pages')).toBeVisible()
  await page
    .locator('button')
    .filter({ hasText: /Home/ })
    .filter({ hasText: /Open timeline/ })
    .first()
    .click()
  await expect(page.getByText('Page timeline')).toBeVisible()
  await expect(page.getByText('Restore options')).toBeVisible()

  // Individual field selection opens a scoped confirmation without restoring.
  await page
    .getByRole('button', { name: /Review fields/ })
    .first()
    .click()
  const checkbox = page.locator('input[type="checkbox"]:enabled').first()
  if (await checkbox.count()) {
    await checkbox.check()
    await page.getByRole('button', { name: /Restore 1 selected/ }).click()
    await expect(page.getByRole('heading', { name: /Restore 1 selected field/i })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  }
})
