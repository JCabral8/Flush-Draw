import { describe, expect, it } from 'vitest'
import { evaluateHand } from '../src/sim/hands'
import { LIE_RULES, previewSwing, struckBase, swingRestriction, windMod } from '../src/sim/swing'
import type { SwingLie, Wind } from '../src/sim/types'

const NO_WIND: Wind = { boost: 'S', drag: 'H' }

describe('lie rules match the GDD (§3.5)', () => {
  it.each([
    ['tee', 1.1, 5], ['fairway', 1.0, 5], ['rough', 0.8, 4], ['deepRough', 0.65, 3],
    ['bunker', 0.6, 5], ['cartPath', 1.3, 5], ['fringe', 0.8, 5],
  ] as [SwingLie, number, number][])('%s: ×%d, max %i cards', (lie, mult, maxCards) => {
    expect(LIE_RULES[lie].mult).toBe(mult)
    expect(LIE_RULES[lie].maxCards).toBe(maxCards)
  })

  it('only the bunker bans flushes; only the cart path skids', () => {
    for (const [lie, rules] of Object.entries(LIE_RULES)) {
      expect(rules.noFlush).toBe(lie === 'bunker')
      expect(rules.skid).toBe(lie === 'cartPath')
    }
  })
})

describe('wind (§3.4): per-card, proportional', () => {
  const wind: Wind = { boost: 'H', drag: 'S' }

  it('a 5-card flush of the boost suit gets the full boost', () => {
    const h = evaluateHand(['2H', '5H', '7H', 'JH', 'KH'])
    expect(windMod(h, wind, 0.15)).toBeCloseTo(1.15)
  })

  it('a 5-card flush of the drag suit gets the full drag', () => {
    const h = evaluateHand(['2S', '5S', '7S', 'JS', 'KS'])
    expect(windMod(h, wind, 0.15)).toBeCloseTo(0.85)
  })

  it('neutral suits are unaffected', () => {
    const h = evaluateHand(['2D', '2C'])
    expect(windMod(h, wind, 0.15)).toBeCloseTo(1)
  })

  it('boost and drag cards cancel', () => {
    const h = evaluateHand(['9H', '9S'])
    expect(windMod(h, wind, 0.15)).toBeCloseTo(1)
  })

  it('partial exposure scales by card fraction', () => {
    const h = evaluateHand(['9H', '9D']) // 1 of 2 boosted
    expect(windMod(h, wind, 0.15)).toBeCloseTo(1.075)
  })

  it('a single boosted card takes the full swing effect', () => {
    const h = evaluateHand(['9H'])
    expect(windMod(h, wind, 0.15)).toBeCloseTo(1.15)
  })

  it('wind strength scales (tier winds, §12)', () => {
    const h = evaluateHand(['9H'])
    expect(windMod(h, wind, 0.25)).toBeCloseTo(1.25)
  })

  it('zero strength means no wind', () => {
    const h = evaluateHand(['2H', '5H', '7H', 'JH', 'KH'])
    expect(windMod(h, wind, 0)).toBe(1)
  })
})

describe('struck distance (§3.1): round(effBase × lie × wind)', () => {
  it('pair of 5s from the fairway, no wind: 80+10 = 90', () => {
    const h = evaluateHand(['5S', '5D'])
    expect(struckBase(h, 'fairway', NO_WIND, 0)).toBe(90)
  })

  it('same pair from the tee: 90 × 1.1 = 99', () => {
    const h = evaluateHand(['5S', '5D'])
    expect(struckBase(h, 'tee', NO_WIND, 0)).toBe(99)
  })

  it('same pair from deep rough: 90 × 0.65 = 58.5 → 59', () => {
    const h = evaluateHand(['5S', '5D'])
    expect(struckBase(h, 'deepRough', NO_WIND, 0)).toBe(59)
  })

  it('royal flush off the tee: (500+60) × 1.1 = 616', () => {
    const h = evaluateHand(['TS', 'JS', 'QS', 'KS', 'AS'])
    expect(struckBase(h, 'tee', NO_WIND, 0)).toBe(616)
  })

  it('junk pip dump: 40 + all pips', () => {
    const h = evaluateHand(['2S', '9D', 'KC'])
    expect(struckBase(h, 'fairway', NO_WIND, 0)).toBe(40 + 24)
  })

  it('wind applies before rounding', () => {
    const h = evaluateHand(['5H', '5D']) // 90, half boosted at 0.15 → ×1.075 = 96.75 → 97
    expect(struckBase(h, 'fairway', { boost: 'H', drag: 'S' }, 0.15)).toBe(97)
  })
})

describe('lie restrictions (§3.5)', () => {
  it('rough refuses 5 cards', () => {
    const h = evaluateHand(['2S', '3H', '4D', '5C', '6S'])
    expect(swingRestriction('rough', h)).toMatch(/at most 4/)
  })

  it('rough allows 4 cards', () => {
    const h = evaluateHand(['2S', '2H', '3D', '3C'])
    expect(swingRestriction('rough', h)).toBeNull()
  })

  it('deep rough refuses 4 cards', () => {
    const h = evaluateHand(['2S', '2H', '3D', '3C'])
    expect(swingRestriction('deepRough', h)).toMatch(/at most 3/)
  })

  it('deep rough allows 3 cards', () => {
    const h = evaluateHand(['2S', '2H', '3D'])
    expect(swingRestriction('deepRough', h)).toBeNull()
  })

  it.each([
    [['2S', '5S', '7S', 'JS', 'KS']],
    [['2S', '3S', '4S', '5S', '6S']],
    [['TS', 'JS', 'QS', 'KS', 'AS']],
  ])('bunker refuses the flush family (%j)', (ids) => {
    expect(swingRestriction('bunker', evaluateHand(ids))).toMatch(/no .* from a bunker/)
  })

  it('bunker allows a straight (mixed suits)', () => {
    const h = evaluateHand(['2S', '3H', '4D', '5C', '6S'])
    expect(swingRestriction('bunker', h)).toBeNull()
  })

  it('bunker allows quads and boats', () => {
    expect(swingRestriction('bunker', evaluateHand(['2S', '2H', '2D', '2C']))).toBeNull()
    expect(swingRestriction('bunker', evaluateHand(['2S', '2H', '2D', '3C', '3S']))).toBeNull()
  })

  it('tee and fairway allow full 5-card hands', () => {
    const h = evaluateHand(['2S', '3H', '4D', '5C', '6S'])
    expect(swingRestriction('tee', h)).toBeNull()
    expect(swingRestriction('fairway', h)).toBeNull()
  })
})

describe('swing preview (§3.1/pillar 4): honest, pure', () => {
  it('pair has an exact preview (no scatter)', () => {
    const h = evaluateHand(['5S', '5D'])
    const p = previewSwing(h, 'fairway', NO_WIND, 0)
    expect(p.min).toBe(90)
    expect(p.max).toBe(90)
    expect(p.scatter).toBe(0)
    expect(p.skidPossible).toBe(false)
  })

  it('flush shows its ±5 range', () => {
    const h = evaluateHand(['2H', '5H', '7H', 'JH', 'KH']) // 270+38=308
    const p = previewSwing(h, 'fairway', NO_WIND, 0)
    expect(p.min).toBe(303)
    expect(p.max).toBe(313)
  })

  it('cart path widens the range by the possible skid', () => {
    const h = evaluateHand(['5S', '5D']) // 90 × 1.3 = 117
    const p = previewSwing(h, 'cartPath', NO_WIND, 0)
    expect(p.skidPossible).toBe(true)
    expect(p.min).toBe(117 - 25)
    expect(p.max).toBe(117 + 25)
  })

  it('marks junk selections', () => {
    const p = previewSwing(evaluateHand(['2S', '9D']), 'fairway', NO_WIND, 0)
    expect(p.junk).toBe(true)
  })

  it('preview never goes below 1 yard', () => {
    const h = evaluateHand(['2S', '2H', '3D', '3C']) // twoPair 140 — fine; use scatter+deep math anyway
    const p = previewSwing(h, 'deepRough', NO_WIND, 0)
    expect(p.min).toBeGreaterThanOrEqual(1)
  })
})
