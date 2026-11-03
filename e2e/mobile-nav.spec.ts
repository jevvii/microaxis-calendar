import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => window.localStorage.clear())
})

test('keeps Today and Calendar tabs in step with the selected day', async ({ page }) => {
  await page.goto('/app/calendar')
  const nav = page.getByRole('navigation', { name: 'Mobile navigation' })

  await expect(nav.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('button', { name: 'Next week' }).click()
  await expect(page).toHaveURL(/date=/)
  await expect(nav.getByRole('button', { name: 'Calendar' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await nav.getByRole('button', { name: 'Today' }).click()
  await expect(page).toHaveURL(/\/app\/calendar$/)
  await expect(nav.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page')
})

test('opens Studio from the topbar and selects a calendar and a team', async ({ page }) => {
  await page.goto('/app/calendar')

  await page.getByRole('button', { name: 'Open workspace and calendar selection' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Studio' })).toBeVisible()

  await dialog.getByRole('button', { name: 'Product calendar' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page).toHaveURL(/calendar=30000000-0000-4000-8000-000000000002/)

  await page.getByRole('button', { name: 'Open workspace and calendar selection' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Product team' }).click()

  await expect(page).toHaveURL(/\/app\/team\/20000000-0000-4000-8000-000000000001$/)
})
