import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

function nativePickers(page: import('@playwright/test').Page) {
  return page.locator(
    'select, input[type="date"], input[type="datetime-local"], input[type="time"]',
  )
}

test('custom select and date pickers replace native controls', async ({ page }) => {
  await loginAdmin(page)

  await page.goto('/contact')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await expect(nativePickers(page)).toHaveCount(0)

  await page.goto('/tools')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await expect(nativePickers(page)).toHaveCount(0)

  await page.goto('/admin/newsletters')
  await expect(page.getByRole('table')).toBeVisible()
  await expect(nativePickers(page)).toHaveCount(0)

  await page.getByRole('button', { name: 'Schedule', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Schedule campaign' })).toBeVisible()
  await expect(nativePickers(page)).toHaveCount(0)
  await page.getByLabel('First send').click()
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next month', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.goto('/admin/reminders')
  await expect(page.getByRole('heading', { name: 'Nothing falls between calls.' })).toBeVisible()
  await expect(nativePickers(page)).toHaveCount(0)
  await page.locator('aside').getByLabel('Priority').click()
  await expect(page.getByRole('listbox', { name: 'Priority' })).toBeVisible()
  await page.getByRole('option', { name: 'Urgent', exact: true }).click()

  await page.goto('/admin/blog/new')
  await expect(page.getByRole('heading', { name: 'New field note.' })).toBeVisible()
  await expect(nativePickers(page)).toHaveCount(0)
})
