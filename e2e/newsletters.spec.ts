import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

test('newsletter platform shows all campaigns, suppression and advanced schedule', async ({
  page,
}) => {
  await loginAdmin(page)

  await page.goto('/admin/newsletters')
  await expect(page.getByRole('heading', { name: 'Newsletters' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByLabel('Search campaigns')).toBeVisible()
  await expect(page.getByLabel('Status')).toBeVisible()

  await page.getByRole('button', { name: /Suppression list/i }).click()
  await expect(page.getByRole('heading', { name: 'Suppression list' })).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await page.getByRole('button', { name: 'Schedule', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Schedule campaign' })).toBeVisible()
  await expect(page.getByText('Send schedule')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.getByRole('button', { name: 'Open', exact: true }).first().click()
  await expect(page.getByLabel('Per minute')).toBeVisible()
  await expect(page.getByLabel('Per hour')).toBeVisible()
  await expect(page.getByLabel('Per day')).toBeVisible()
  await expect(page.getByRole('switch', { name: /Override suppression/i })).toBeVisible()
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()
  await expect(page.getByText('Send schedule')).toBeVisible()

  await page.getByLabel('Repeat').selectOption('weekly')
  await expect(page.getByRole('button', { name: 'Mon' })).toBeVisible()
  await expect(page.getByLabel('End date')).toBeVisible()

  await page.getByLabel('Repeat').selectOption('monthly')
  await page.getByLabel('Monthly pattern').selectOption('nth-weekday')
  await expect(page.getByLabel('Week', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Weekday', { exact: true })).toBeVisible()

  await page.getByLabel('First send').fill('2026-12-01T09:00')
  await expect(page.getByText(/Every month/i)).toBeVisible()
})
