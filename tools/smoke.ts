/**
 * Headless visual smoke test: loads the built game at a phone viewport,
 * plays a stroke, and captures screenshots + console errors.
 *   npx tsx tools/smoke.ts [outDir]
 */
import { chromium } from 'playwright-core'
import { join } from 'node:path'

const outDir = process.argv[2] ?? 'dist'
const url = `file://${join(process.cwd(), 'dist', 'index.html')}`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
})

const errors: string[] = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(url)
await page.waitForTimeout(1200)
await page.screenshot({ path: join(outDir, 'shot-1-tee.png') })

// Select two cards and look at the preview.
const cards = page.locator('.card')
await cards.nth(0).click()
await cards.nth(1).click()
await page.waitForTimeout(300)
await page.screenshot({ path: join(outDir, 'shot-2-selected.png') })

// Swing if legal; otherwise just one card.
const go = page.locator('.go')
if (await go.isDisabled()) {
  await cards.nth(1).click()
}
await go.click()
await page.waitForTimeout(900)
await page.screenshot({ path: join(outDir, 'shot-3-flight.png') })
await page.waitForTimeout(2200)
await page.screenshot({ path: join(outDir, 'shot-4-after.png') })

console.log(errors.length === 0 ? 'no console errors' : `CONSOLE ERRORS:\n${errors.join('\n')}`)
await browser.close()
process.exit(errors.length === 0 ? 0 : 1)
