import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

test('notification socket pushes a new lead and opens the exact record', async ({
  page,
  browser,
}) => {
  const stamp = Date.now()
  const name = `Socket Lead ${stamp}`
  const email = `socket-${stamp}@example.com`

  await loginAdmin(page)
  await page.goto('/admin/notifications')
  await expect(page.getByText('Socket connected')).toBeVisible()

  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()
  await visitor.goto('/contact')
  const form = visitor.locator('#enquire form')
  await form.getByLabel('Name').fill(name)
  await form.getByLabel('Phone').fill('2145550199')
  await form.getByLabel('Email').fill(email)
  await form
    .getByLabel('The brief')
    .fill('Realtime notification test: cassette not holding setpoint.')
  await form.getByRole('button', { name: /Send enquiry/i }).click()
  await expect(visitor.getByText(/Lead captured/i)).toBeVisible()

  const notification = page.getByRole('button', {
    name: new RegExp(`New enquiry · ${name}`),
  })
  await expect(notification).toBeVisible({ timeout: 15_000 })
  await notification.click()

  await expect(page).toHaveURL(/\/admin\/leads\?lead=ENQ-/)
  const drawer = page.getByRole('dialog')
  await expect(drawer).toContainText(name)
  await expect(drawer).toContainText(email)

  await drawer.getByRole('button', { name: 'Back', exact: true }).first().click()
  await expect(page).toHaveURL(/\/admin\/notifications$/)

  await notification.click()
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/leads$/)
  await expect(drawer).toBeHidden()

  await visitorContext.close()
})
