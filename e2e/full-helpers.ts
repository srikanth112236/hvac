import { expect, type Page } from '@playwright/test'

export const DEMO_EMAIL = 'demo.coolvane@example.com'
export const DEMO_PASSWORD = 'Coolvane!Demo2026'
export const DEMO_NAME = 'Avery Stone'
export const RESET_TOKEN = 'demo-reset-token-2026'
export const VERIFY_TOKEN = 'demo-verify-token-2026'

export function unique(prefix: string): string {
  return `${prefix} ${Date.now()}`
}

export async function preparePublic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('hvac-consent', 'essential')
  })
}

export async function loginPortal(page: Page): Promise<void> {
  await page.goto('/portal')
  await expect(
    page.getByRole('heading', { name: /Your system, your file, your next visit/i }),
  ).toBeVisible()
  await page.getByLabel('Email').fill(DEMO_EMAIL)
  await page.getByLabel('Password').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /Sign in to portal/i }).click()
  await expect(page.getByRole('button', { name: /Sign out/i })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(DEMO_NAME).first()).toBeVisible()
}

function labelPattern(label: string): RegExp {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*?$`)
}

export async function selectOption(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: labelPattern(label) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

export async function pickDate(page: Page, label: string, offsetDays = 2): Promise<string> {
  const target = new Date()
  target.setDate(target.getDate() + offsetDays)
  const display = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(target)
  await page.getByRole('combobox', { name: labelPattern(label) }).click()
  const day = page.getByRole('button', { name: display, exact: true })
  for (let attempt = 0; attempt < 3 && !(await day.isVisible().catch(() => false)); attempt += 1) {
    const next = page.getByRole('button', { name: 'Next month' })
    if (!(await next.count())) break
    await next.click()
  }
  await day.click()
  return target.toISOString().slice(0, 10)
}

export async function dismissConsent(page: Page): Promise<void> {
  const essential = page.getByRole('button', { name: /Essential only/i })
  if (await essential.isVisible().catch(() => false)) await essential.click()
}
