import { chromium } from '@playwright/test'

const base = process.env.STAGING_URL?.replace(/\/$/, '')
if (!base) {
  console.error('Set STAGING_URL to the deployed staging URL.')
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const consoleErrors = []
const pageErrors = []
const failedRequests = []
const supabaseOrigins = new Set()

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => pageErrors.push(String(error)))
page.on('requestfailed', (request) => {
  failedRequests.push(`${request.url()} :: ${request.failure()?.errorText ?? 'failed'}`)
})
page.on('request', (request) => {
  if (request.url().includes('.supabase.co')) {
    supabaseOrigins.add(new URL(request.url()).origin)
  }
})

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 })
await page.waitForTimeout(4_000)

const rootUrl = page.url()
const title = await page.title()
const rootText = (await page.locator('body').innerText()).slice(0, 400)

await page.goto(`${base}/app/calendar`, {
  waitUntil: 'domcontentloaded',
  timeout: 60_000,
})
await page.waitForTimeout(4_000)

const calendarUrl = page.url()
const calendarText = (await page.locator('body').innerText()).slice(0, 800)

console.log(
  JSON.stringify(
    {
      base,
      rootUrl,
      title,
      rootText,
      calendarUrl,
      calendarText,
      redirectedToAuth: calendarUrl.includes('/auth'),
      consoleErrors,
      pageErrors,
      failedRequests,
      supabaseOrigins: [...supabaseOrigins],
    },
    null,
    2,
  ),
)

await browser.close()
