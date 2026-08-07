/**
 * Drives the built game to the green and putts out, via the store bridge.
 * Screenshots the putt scene and the hole-complete overlay.
 *   npx tsx tools/smoke-putt.ts [outDir]
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
await page.waitForTimeout(1000)

// Play strokes with a greedy-ish picker until we reach the green.
for (let i = 0; i < 14; i++) {
  const phase = await page.evaluate(() => {
    const s = window.__pg!.getState()
    return s.animating ? 'anim' : s.done ? 'done' : s.sim.phase
  })
  if (phase === 'anim') {
    await page.waitForTimeout(400)
    continue
  }
  if (phase === 'putt' || phase === 'done') break
  await page.evaluate(() => {
    const store = window.__pg!
    const s = store.getState()
    const hand = s.sim.hand
    // Find a pair; else play the single lowest card.
    const byRank = new Map<string, string[]>()
    for (const id of hand) {
      const r = id[0]!
      byRank.set(r, [...(byRank.get(r) ?? []), id])
    }
    const pair = [...byRank.values()].find((g) => g.length >= 2)
    const pick = pair ? pair.slice(0, 2) : [hand.slice().sort()[0]!]
    for (const id of pick) store.getState().toggleCard(id)
    store.getState().play()
  })
  await page.waitForTimeout(2600)
}

await page.screenshot({ path: join(outDir, 'shot-5-green.png') })

// Putt out with the lowest cards until the hole falls or caps.
for (let i = 0; i < 10; i++) {
  const st = await page.evaluate(() => {
    const s = window.__pg!.getState()
    return { phase: s.sim.phase, done: !!s.done, anim: s.animating }
  })
  if (st.anim) {
    await page.waitForTimeout(400)
    continue
  }
  if (st.done || st.phase !== 'putt') break
  await page.evaluate(() => {
    const store = window.__pg!
    const s = store.getState()
    const distFt = s.sim.hole!.green!.distFt
    const order = '23456789TJQKA'
    const sorted = s.sim.hand.slice().sort((a, b) => order.indexOf(a[0]!) - order.indexOf(b[0]!))
    // One card whose roll lands nearest the cup, else the lowest.
    const factor = s.sim.hole!.green!.downhill ? 4 : s.sim.hole!.pin === 'front' ? 2.5 : 3
    let best = sorted[0]!
    let bestGap = Infinity
    for (const id of sorted) {
      const rank = id[0] === 'A' ? 1 : order.indexOf(id[0]!) + 2
      const gap = Math.abs(distFt - rank * factor)
      if (gap < bestGap) {
        bestGap = gap
        best = id
      }
    }
    store.getState().toggleCard(best)
    store.getState().play()
  })
  await page.waitForTimeout(1800)
}

await page.waitForTimeout(800)
await page.screenshot({ path: join(outDir, 'shot-6-done.png') })

const summary = await page.evaluate(() => {
  const s = window.__pg!.getState()
  return { scores: s.sim.scores, done: s.done }
})
console.log(JSON.stringify(summary))
console.log(errors.length === 0 ? 'no console errors' : `CONSOLE ERRORS:\n${errors.join('\n')}`)
await browser.close()
process.exit(errors.length === 0 ? 0 : 1)
