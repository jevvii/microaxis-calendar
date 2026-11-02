import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('opens the shared calendar and an event drawer', async ({ page }) => {
  await page.goto('/app/calendar')
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible()
  await expect(page.getByText('OceanJet release review').first()).toBeVisible()

  await page.getByRole('button', { name: /OceanJet release review/ }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Event details' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Your response' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('creates an event and shows it on the calendar', async ({ page }) => {
  await page.goto('/app/calendar')
  await page.locator('main').getByRole('button', { name: 'New event' }).first().click()
  await page.getByLabel('Title').fill('Studio offsite')
  await page.getByRole('button', { name: 'Create event' }).click()

  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('Studio offsite').first()).toBeVisible()
})

test('switches theme and persists it', async ({ page }) => {
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Use dark theme' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('uses the agenda by default on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/calendar')
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
})

test('has no serious or critical WCAG violations on the calendar', async ({ page }) => {
  await page.goto('/app/calendar')
  await page.waitForTimeout(800)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()
  const serious = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  )
  expect(serious).toEqual([])
})
