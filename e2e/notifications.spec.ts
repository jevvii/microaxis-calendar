import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
})
test('marks a notification read', async ({ page }) => {
  await page.goto('/app/notifications')
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByText('3 unread')).toBeVisible()

  await page.getByRole('button', { name: /Mark OceanJet release review/ }).click()
  await expect(page.getByText('2 unread')).toBeVisible()
})
