import { expect, test } from '@playwright/test'
import { loginAdmin } from './helpers'

test('journal uses separate article pages and a full rich-text editor', async ({ page }) => {
  await loginAdmin(page)

  await page.goto('/admin/blog')
  await expect(page.getByRole('heading', { name: 'The journal.' })).toBeVisible()
  await expect(page.getByLabel('Search articles')).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()

  await page
    .getByRole('link', { name: /New article/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/admin\/blog\/new$/)
  await expect(page.getByRole('heading', { name: 'New field note.' })).toBeVisible()
  await expect(page.getByLabel('Headline')).toBeVisible()

  await page.getByLabel('Headline').fill('A new field note')
  await page.getByRole('button', { name: /Generate from title/i }).click()
  await expect(page.getByLabel('Slug')).toHaveValue('a-new-field-note')

  const editor = page.getByRole('textbox', { name: 'Rich text body' })
  await expect(editor).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bold' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Insert image' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Align centre' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Text style' })).toBeVisible()

  await editor.click()
  await editor.fill('The body starts here.')
  await expect(page.getByText(/words/)).toBeVisible()

  await page
    .getByRole('link', { name: /All articles/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/admin\/blog$/)
  await page.getByRole('link', { name: 'Edit', exact: true }).first().click()
  await expect(page).toHaveURL(/\/admin\/blog\/[^/]+$/)
  await expect(page.getByRole('heading', { name: 'Article body' })).toBeVisible()
})
