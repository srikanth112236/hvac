import { expect, test } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@coolvane.example'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Coolvane!2026'

function localDueTomorrow(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`
}

test('reminders queue segments, filters, prioritises and completes', async ({ page }) => {
  const title = `E2E urgent reminder ${Date.now()}`
  page.on('dialog', (dialog) => void dialog.accept())

  await page.goto('/admin')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /Open control room/i }).click()
  await expect(page).toHaveURL(/\/admin$/)

  await page.goto('/admin/reminders')
  await expect(page.getByRole('heading', { name: 'Nothing falls between calls.' })).toBeVisible()
  await expect(page.getByText('Open', { exact: true })).toBeVisible()

  const composer = page.locator('aside')
  await composer.getByLabel('Title').fill(title)
  await composer.getByLabel('Due').fill(localDueTomorrow())
  await composer.getByLabel('Priority').selectOption('urgent')
  await composer.getByLabel('Category').selectOption('payment')
  await composer.getByRole('button', { name: /Add reminder/i }).click()

  const card = page.getByRole('listitem').filter({ hasText: title })
  await expect(card).toBeVisible()
  await expect(card.getByText('Urgent priority')).toBeVisible()

  await page.getByLabel('Search').fill(title)
  await expect(card).toBeVisible()
  await expect(page.getByText(/matching/)).toBeVisible()

  await card.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('heading', { name: 'Edit reminder' })).toBeVisible()
  await page.getByRole('dialog').getByLabel('Priority').selectOption('high')
  await page.getByRole('button', { name: /Save changes/i }).click()
  await expect(card.getByText('High priority')).toBeVisible()

  await card.getByRole('button', { name: /Done/ }).click()
  await expect(card.getByText('Completed', { exact: true })).toBeVisible()

  await card.getByRole('button', { name: `Delete reminder ${title}` }).click()
  await expect(page.getByText(title)).toHaveCount(0)

  await page.getByRole('button', { name: 'Reset filters' }).click()
})
