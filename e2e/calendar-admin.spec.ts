import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
})

test('keeps the sidebar calendar list in sync through create, rename, and delete', async ({
  page,
}) => {
  const sidebar = page.locator('aside').first()
  const main = page.locator('main')

  await page.goto('/app/workspace')
  await page.getByRole('button', { name: 'Calendars' }).click()

  await page.getByRole('button', { name: 'New calendar' }).click()
  await page.getByLabel('Name').fill('QA room')
  await page.getByRole('button', { name: 'Create calendar' }).click()
  await expect(sidebar.getByRole('button', { name: 'QA room' })).toBeVisible()

  await main.getByRole('button', { name: 'Settings' }).last().click()
  await page.getByLabel('Name').fill('QA room renamed')
  await page.getByRole('button', { name: 'Save calendar' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(sidebar.getByRole('button', { name: 'QA room renamed' })).toBeVisible()

  await main.getByRole('button', { name: 'Settings' }).last().click()
  await page.getByRole('button', { name: 'Delete calendar' }).click()
  await page.getByRole('button', { name: 'Confirm delete' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(sidebar.getByRole('button', { name: 'QA room renamed' })).toHaveCount(0)
})

test('keeps the sidebar team list in sync through create, rename, and delete', async ({ page }) => {
  const sidebar = page.locator('aside').first()
  const main = page.locator('main')

  await page.goto('/app/workspace')
  await page.getByRole('button', { name: 'Teams' }).click()

  await page.getByRole('button', { name: 'New team' }).click()
  await page.getByLabel('Team name').fill('QA team')
  await page.getByRole('button', { name: 'Create team' }).click()
  await expect(sidebar.getByText('QA team', { exact: true })).toBeVisible()

  await main.getByRole('button', { name: /QA team/ }).click()
  await page.getByLabel('Team name').fill('QA team renamed')
  await page.getByRole('button', { name: 'Save team' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(sidebar.getByText('QA team renamed', { exact: true })).toBeVisible()

  await main.getByRole('button', { name: /QA team renamed/ }).click()
  await page.getByRole('button', { name: 'Delete team' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(sidebar.getByText('QA team renamed', { exact: true })).toHaveCount(0)
})
