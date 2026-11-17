import { expect, test } from '@playwright/test'

test('warns about a cross-calendar conflict and creates a request', async ({ page }) => {
  await page.goto('/app/calendar?date=2026-11-06')
  await page.locator('main').getByRole('button', { name: 'New event' }).first().click()

  await page.getByLabel('Title').fill('Overlap review')

  await page.getByLabel('Starts').fill('2026-11-06')
  await page.getByLabel('Starts').press('Tab')
  await page.getByLabel('Start time').fill('10:30')
  await page.getByLabel('Start time').press('Tab')
  await page.getByLabel('Ends').fill('2026-11-06')
  await page.getByLabel('Ends').press('Tab')
  await page.getByLabel('End time').fill('11:30')
  await page.getByLabel('End time').press('Tab')

  await expect(page.getByText(/This time overlaps 1 event/)).toBeVisible()
  await expect(page.getByText('Others are busy')).toBeVisible()

  await page.getByRole('button', { name: 'Create and request' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Send schedule requests?')

  await dialog.getByRole('button', { name: 'Create and request' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('Overlap review').first()).toBeVisible()

  await page.getByRole('button', { name: /Overlap review/ }).first().click()
  await expect(page.getByText('Schedule requests')).toBeVisible()
  await expect(page.getByText('Outgoing')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Withdraw request' })).toBeVisible()
})
