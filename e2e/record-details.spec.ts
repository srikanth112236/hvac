import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

test('record tables expose a full detail drawer from the view icon', async ({ page }) => {
  await loginAdmin(page)

  await page.goto('/admin/team')
  const team = page.getByRole('table', { name: 'Team register' })
  const firstView = team.getByRole('button', { name: /^View / }).first()
  await expect(firstView).toBeVisible()
  await firstView.click()

  const drawer = page.getByRole('dialog')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('FULL RECORD')).toBeVisible()
  await expect(drawer.getByText('PAY CYCLE')).toBeVisible()

  await drawer.getByRole('button', { name: 'Close panel' }).click()
  await expect(drawer).toBeHidden()
})
