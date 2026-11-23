import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

test('dispatch customer and technician search fills the visit', async ({ page }) => {
  await loginAdmin(page)

  await page.goto('/admin/dispatch')
  await expect(page.getByRole('heading', { name: 'Today at the works.' })).toBeVisible()
  await page.getByRole('button', { name: /Schedule visit/i }).click()

  const customerSearch = page.getByRole('combobox', { name: 'Find customer' })
  await expect(customerSearch).toBeVisible()
  await customerSearch.fill('jourjj')
  await page.getByRole('option', { name: /jourjj/i }).click()

  await expect(page.getByText('Linked portal customer')).toBeVisible()
  await expect(page.getByLabel('Customer name')).toHaveValue('jourjj')
  await expect(page.getByLabel('Email')).toHaveValue('jiikb@gmail.com')
  await expect(page.getByLabel('Mobile number')).toHaveValue('8789798797')
  await expect(page.getByLabel('Service address')).toHaveValue('wedwdwdwed')

  const technician = page.getByRole('combobox', { name: 'Technician' })
  await technician.fill('iuhiu')
  await page.getByRole('option', { name: /iuhiu/i }).click()
  await expect(technician).toHaveValue('iuhiu')

  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
})
