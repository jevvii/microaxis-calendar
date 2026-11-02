import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const base = 'http://127.0.0.1:4173'
const browser = await chromium.launch()
const errors = []

async function pageFor(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return { context, page }
}

async function axe(page, label) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
  console.log(`AXE ${label}: ${serious.length} serious/critical violations`)
  for (const violation of serious) {
    console.log(`- ${violation.id}: ${violation.help} (${violation.nodes.length})`)
    for (const node of violation.nodes.slice(0, 6)) {
      console.log(`  target: ${JSON.stringify(node.target)}`)
      console.log(`  html: ${node.html.slice(0, 220)}`)
    }
  }
}

const desktop = await pageFor()
await desktop.page.goto(`${base}/app/calendar`)
await desktop.page.waitForTimeout(1500)
await desktop.page.screenshot({ path: '/tmp/microaxis-week.png' })
await axe(desktop.page, 'week')

await desktop.page.getByRole('button', { name: 'Month' }).click()
await desktop.page.waitForTimeout(500)
await desktop.page.screenshot({ path: '/tmp/microaxis-month.png' })
await axe(desktop.page, 'month')

await desktop.page.getByRole('button', { name: 'Agenda' }).click()
await desktop.page.waitForTimeout(500)
await desktop.page.screenshot({ path: '/tmp/microaxis-agenda.png' })
await axe(desktop.page, 'agenda')

await desktop.page.getByRole('button', { name: /OceanJet release review/ }).first().click()
await desktop.page.waitForTimeout(800)
await desktop.page.screenshot({ path: '/tmp/microaxis-drawer.png' })
await axe(desktop.page, 'event drawer')
await desktop.page.keyboard.press('Escape')

await desktop.page.goto(`${base}/app/settings`)
await desktop.page.waitForTimeout(900)
await desktop.page.screenshot({ path: '/tmp/microaxis-settings.png' })
await axe(desktop.page, 'settings')
await desktop.context.close()

const mobile = await pageFor({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await mobile.page.goto(`${base}/app/calendar`)
await mobile.page.waitForTimeout(1500)
await mobile.page.screenshot({ path: '/tmp/microaxis-mobile.png' })
await axe(mobile.page, 'mobile agenda')
await mobile.context.close()

const dark = await pageFor({ colorScheme: 'dark' })
await dark.page.goto(`${base}/app/calendar`)
await dark.page.waitForTimeout(1500)
await dark.page.screenshot({ path: '/tmp/microaxis-dark.png' })
await axe(dark.page, 'dark week')
await dark.context.close()

console.log('CONSOLE ERRORS:', errors.length)
for (const error of errors.slice(0, 10)) console.log('-', error)
await browser.close()
