import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'
import { unique } from './full-helpers'

test.describe.configure({ timeout: 90_000 })

test('team, payroll, reminders, coupons and settings', async ({ page }) => {
  await loginAdmin(page)

  await page.goto('/admin/team')
  await expect(page.getByRole('heading', { name: 'Team, technicians and salaries.' })).toBeVisible()
  await page.getByRole('button', { name: 'Add team member', exact: true }).click()
  const member = page.getByRole('dialog', { name: 'Add team member' })
  const memberName = unique('QA Tech')
  await member.getByLabel('Name').fill(memberName)
  await member.getByLabel('Phone').fill('2145550166')
  await member
    .getByLabel('Email')
    .fill(`${memberName.replace(/\s+/g, '.').toLowerCase()}@example.com`)
  await member.getByLabel('Monthly salary').fill('5400')
  await member.getByRole('button', { name: 'Add member', exact: true }).click()
  await expect(page.getByText('Team member added')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /Prepare \d{4}-\d{2}/ }).click()
  await expect(page.getByText(/Monthly payroll prepared|Payroll already prepared/)).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('button', { name: /Salary ledger/i }).click()
  await expect(page.getByText('Salary ledger').first()).toBeVisible()

  await page.goto('/admin/reminders')
  await expect(page.getByRole('heading', { name: 'Nothing falls between calls.' })).toBeVisible()
  const reminder = page
    .locator('li')
    .filter({ has: page.getByRole('button', { name: 'Complete', exact: true }) })
    .first()
  const reminderTitle = (await reminder.locator('p').first().innerText()).trim()
  await reminder.getByRole('button', { name: 'Complete', exact: true }).click()
  await expect(page.getByText('Reminder completed and locked')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('tab', { name: /Completed/i }).click()
  const completed = page.locator('li').filter({ hasText: reminderTitle }).first()
  await expect(completed.getByText('Locked').first()).toBeVisible()
  await expect(completed.getByRole('button', { name: /Delete reminder/i })).toHaveCount(0)

  await page.goto('/admin/coupons')
  await page.getByRole('button', { name: 'New coupon', exact: true }).click()
  const coupon = page.getByRole('dialog', { name: 'New coupon' })
  const code = `QA${Date.now().toString().slice(-6)}`
  await coupon.getByLabel('Code').fill(code)
  await coupon.getByLabel('Percentage').fill('10')
  await coupon.getByLabel('Description').fill('QA test coupon')
  await coupon.getByRole('button', { name: 'Create coupon', exact: true }).click()
  await expect(page.getByText('Coupon created')).toBeVisible({ timeout: 20_000 })
  await page.getByLabel('Search coupons').fill(code)
  const couponCard = page.locator('article').filter({ hasText: code }).first()
  await couponCard.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(
    page
      .locator('article')
      .filter({ hasText: code })
      .getByRole('button', { name: 'Activate', exact: true }),
  ).toBeVisible({ timeout: 20_000 })

  page.once('dialog', (dialog) => void dialog.accept())
  await couponCard.getByRole('button', { name: new RegExp(`Delete ${code}`) }).click()
  await expect(page.getByText('Coupon deleted')).toBeVisible({ timeout: 20_000 })

  await page.goto('/admin/settings')
  await expect(page.getByText('Data health & backup')).toBeVisible()
  await expect(page.getByText('Audit log', { exact: true })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: /Download JSON backup/i }).click()
  expect((await download).suggestedFilename()).toMatch(/\.json$/i)
  const userName = unique('QA User')
  await page.getByLabel(/^Name\*?$/).fill(userName)
  await page
    .getByLabel(/^Email\*?$/)
    .fill(`${userName.replace(/\s+/g, '.').toLowerCase()}@example.com`)
  await page.getByLabel(/^Password\*?$/).fill('Coolvane!QAUser2026')
  await page.getByRole('button', { name: 'Add user', exact: true }).click()
  await expect(page.getByText('User created')).toBeVisible({ timeout: 20_000 })
})
