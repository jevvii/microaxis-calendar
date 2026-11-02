import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))
await page.goto('http://127.0.0.1:4173/app/workspace')
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/microaxis-workspace-members.png' })
for (const [label, name] of [['Teams','teams'],['Calendars','calendars'],['Audit log','audit']]) {
  await page.getByRole('button', { name: label }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `/tmp/microaxis-workspace-${name}.png` })
}
const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
const serious = results.violations.filter(v => ['serious','critical'].includes(v.impact ?? ''))
console.log('AXE workspace:', serious.length, 'serious/critical')
for (const v of serious) console.log('-', v.id, v.nodes.length)
await page.goto('http://127.0.0.1:4173/app/settings')
await page.waitForTimeout(600)
await page.screenshot({ path: '/tmp/microaxis-settings-2.png' })
const settingsAxe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()
console.log('AXE settings:', settingsAxe.violations.filter(v => ['serious','critical'].includes(v.impact ?? '')).length, 'serious/critical')
console.log('CONSOLE ERRORS', errors.length)
for (const e of errors.slice(0,5)) console.log('-', e)
await browser.close()
