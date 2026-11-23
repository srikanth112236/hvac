import { expect, test } from '@playwright/test'

test('public homepage renders content and consent', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/CV-CONSENT/)).toBeVisible()
  await page.getByRole('button', { name: /Essential only/i }).click()
  await expect(page.getByText(/CV-CONSENT/)).toHaveCount(0)
})

test('services and journal pages render', async ({ page }) => {
  await page.goto('/services')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/blog')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('admin login screen is reachable', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible()
  await expect(page.getByText(/Owner and staff access/i)).toBeVisible()
})

test('customer portal login screen is reachable', async ({ page }) => {
  await page.goto('/portal')
  await expect(page.getByText(/Your system, your file/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Sign in to portal/i })).toBeVisible()
})

test('tools page exposes standalone calculators', async ({ page }) => {
  await page.goto('/tools')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('link', { name: /Room tonnage/i }).click()
  await expect(page).toHaveURL(/\/tools\/room-tonnage$/)
  await expect(page.getByRole('heading', { name: /Split \/ cassette sizing/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Send these figures/i })).toBeVisible()
})
