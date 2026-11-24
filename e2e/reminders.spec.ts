import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

function dateDisplay(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

test('reminders queue segments, filters, prioritises and completes', async ({ page }) => {
  const title = `E2E urgent reminder ${Date.now()}`
  page.on('dialog', (dialog) => void dialog.accept())

  await loginAdmin(page)

  await page.goto('/admin/reminders')
  await expect(page.getByRole('heading', { name: 'Nothing falls between calls.' })).toBeVisible()
  await expect(page.getByText('Open', { exact: true })).toBeVisible()

  const composer = page.locator('aside')
  await composer.getByLabel('Title').fill(title)
  await composer.getByLabel('Due').click()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (tomorrow.getMonth() !== new Date().getMonth()) {
    await page.getByRole('button', { name: 'Next month', exact: true }).click()
  }
  await page.getByRole('button', { name: dateDisplay(tomorrow), exact: true }).click()
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await composer.getByLabel('Priority').click()
  await page.getByRole('option', { name: 'Urgent', exact: true }).click()
  await composer.getByLabel('Category').click()
  await page.getByRole('option', { name: 'Payment', exact: true }).click()
  await composer.getByRole('button', { name: /Add reminder/i }).click()

  const card = page.getByRole('listitem').filter({ hasText: title })
  await expect(card).toBeVisible()
  await expect(card.getByText('Urgent priority')).toBeVisible()

  await page.getByLabel('Search').fill(title)
  await expect(card).toBeVisible()
  await expect(page.getByText(/matching/)).toBeVisible()

  await card.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('heading', { name: 'Edit reminder' })).toBeVisible()
  await page.getByRole('dialog').getByLabel('Priority').click()
  await page.getByRole('option', { name: 'High', exact: true }).click()
  await page.getByRole('button', { name: /Save changes/i }).click()
  await expect(card.getByText('High priority')).toBeVisible()

  await card.getByRole('button', { name: /Done/ }).click()
  await expect(card.getByText('Completed', { exact: true })).toBeVisible()

  await card.getByRole('button', { name: `Delete reminder ${title}` }).click()
  await expect(page.getByText(title)).toHaveCount(0)

  await page.getByRole('button', { name: 'Reset filters' }).click()
})
