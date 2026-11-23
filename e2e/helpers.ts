import { expect, type Page } from '@playwright/test'

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@coolvane.example'
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Coolvane!2026'

/**
 * The login form hydrates and fills the owner email from /auth/hint after the
 * first paint. Wait for that to settle before filling, otherwise a fast test
 * can race hydration and end up with a duplicated email value.
 */
export async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/admin')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(400)
  const email = page.getByLabel('Email')
  if ((await email.inputValue()) !== ADMIN_EMAIL) {
    await email.fill('')
    await email.fill(ADMIN_EMAIL)
  }
  const password = page.getByLabel('Password')
  await password.fill('')
  await password.fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /Open control room/i }).click()
  await expect(page.getByText('Signed in as')).toBeVisible()
}
