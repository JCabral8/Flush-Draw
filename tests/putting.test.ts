import { describe, expect, it } from 'vitest'
import { greenFactor, planPutt, previewPutt, resolvePutt } from '../src/sim/putting'
import type { GreenState } from '../src/sim/types'

const flat = (distFt: number): GreenState => ({ distFt, downhill: false })
const down = (distFt: number): GreenState => ({ distFt, downhill: true })

describe('green factor (§4.3/D6): one number is the whole slope system', () => {
  it('front pin is uphill: ×2.5', () => {
    expect(greenFactor(flat(30), 'front')).toBe(2.5)
  })
  it('center pin is flat: ×3', () => {
    expect(greenFactor(flat(30), 'center')).toBe(3)
  })
  it('downhill is ×4 regardless of pin', () => {
    expect(greenFactor(down(30), 'front')).toBe(4)
    expect(greenFactor(down(30), 'center')).toBe(4)
    expect(greenFactor(down(30), 'back')).toBe(4)
  })
})

describe('planPutt (§4.1)', () => {
  it('a single 2 rolls 6 ft flat', () => {
    const p = planPutt(['2S'], undefined, flat(10), 'center', 2)
    expect(p.sum).toBe(2)
    expect(p.rolled).toBe(6)
  })

  it('two cards sum their ranks', () => {
    const p = planPutt(['4S', '7D'], undefined, flat(40), 'center', 2)
    expect(p.sum).toBe(11)
    expect(p.rolled).toBe(33)
  })

  it.each([
    [2, 6], [3, 9], [4, 12], [5, 15], [6, 18], [7, 21], [8, 24], [9, 27], [10, 30],
  ])('rank %i rolls %i ft flat', (_rank, ft) => {
    const ids = ['2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', 'TS']
    const id = ids[_rank - 2]!
    expect(planPutt([id], undefined, flat(90), 'center', 2).rolled).toBe(ft)
  })

  it('faces are 11/12/13: J=33, Q=36, K=39 ft flat', () => {
    expect(planPutt(['JS'], undefined, flat(90), 'center', 2).rolled).toBe(33)
    expect(planPutt(['QS'], undefined, flat(90), 'center', 2).rolled).toBe(36)
    expect(planPutt(['KS'], undefined, flat(90), 'center', 2).rolled).toBe(39)
  })

  it('an ace must be declared', () => {
    expect(() => planPutt(['AS'], undefined, flat(10), 'center', 2)).toThrow(/declare/)
    expect(() => planPutt(['AS'], {}, flat(10), 'center', 2)).toThrow(/declare/)
  })

  it('ace as 1 rolls 3 ft; ace as 14 rolls 42 ft (flat)', () => {
    expect(planPutt(['AS'], { AS: 1 }, flat(10), 'center', 2).rolled).toBe(3)
    expect(planPutt(['AS'], { AS: 14 }, flat(90), 'center', 2).rolled).toBe(42)
  })

  it('two aces may be declared differently', () => {
    const p = planPutt(['AS', 'AH'], { AS: 1, AH: 14 }, flat(50), 'center', 2)
    expect(p.sum).toBe(15)
    expect(p.rolled).toBe(45)
  })

  it('front pin halves round to the nearest foot', () => {
    // sum 5 × 2.5 = 12.5 → 13
    expect(planPutt(['5S'], undefined, flat(20), 'front', 2).rolled).toBe(13)
    // sum 4 × 2.5 = 10
    expect(planPutt(['4S'], undefined, flat(20), 'front', 2).rolled).toBe(10)
  })

  it('downhill multiplies ×4', () => {
    expect(planPutt(['5S'], undefined, down(30), 'center', 2).rolled).toBe(20)
  })

  it('enforces the card ceiling', () => {
    expect(() => planPutt(['2S', '3S', '4S'], undefined, flat(30), 'center', 2)).toThrow(/at most 2/)
    // Blade putter raises the ceiling (M3): same code path, higher max.
    expect(planPutt(['2S', '3S', '4S'], undefined, flat(30), 'center', 3).sum).toBe(9)
  })

  it('rejects empty and duplicate selections', () => {
    expect(() => planPutt([], undefined, flat(30), 'center', 2)).toThrow()
    expect(() => planPutt(['2S', '2S'], undefined, flat(30), 'center', 2)).toThrow(/duplicate/)
  })
})

describe('resolvePutt (§4.1)', () => {
  it('exact distance sinks', () => {
    const plan = planPutt(['4S'], undefined, flat(12), 'center', 2)
    expect(resolvePutt(plan, flat(12), 3).holed).toBe(true)
  })

  it('within 3 ft short sinks (gimme)', () => {
    const plan = planPutt(['4S'], undefined, flat(15), 'center', 2) // 12 vs 15 → 3 short
    expect(resolvePutt(plan, flat(15), 3).holed).toBe(true)
  })

  it('within 3 ft long sinks (gimme)', () => {
    const plan = planPutt(['4S'], undefined, flat(9), 'center', 2) // 12 vs 9 → 3 long
    expect(resolvePutt(plan, flat(9), 3).holed).toBe(true)
  })

  it('4 ft short stays short, slope unchanged', () => {
    const plan = planPutt(['4S'], undefined, flat(16), 'center', 2) // 12 vs 16
    const out = resolvePutt(plan, flat(16), 3)
    expect(out.holed).toBe(false)
    expect(out.blewPast).toBe(false)
    expect(out.next).toEqual({ distFt: 4, downhill: false })
  })

  it('4 ft long rolls past and turns the green downhill', () => {
    const plan = planPutt(['4S'], undefined, flat(8), 'center', 2) // 12 vs 8
    const out = resolvePutt(plan, flat(8), 3)
    expect(out.holed).toBe(false)
    expect(out.blewPast).toBe(true)
    expect(out.next).toEqual({ distFt: 4, downhill: true })
  })

  it('a green already downhill stays downhill on a short leave', () => {
    const plan = planPutt(['2S'], undefined, down(30), 'center', 2) // 8 vs 30
    const out = resolvePutt(plan, down(30), 3)
    expect(out.next).toEqual({ distFt: 22, downhill: true })
  })

  it('tier-7 gimme radius (2 ft) is respected', () => {
    const plan = planPutt(['4S'], undefined, flat(15), 'center', 2) // 3 short
    expect(resolvePutt(plan, flat(15), 2).holed).toBe(false)
  })

  it('the three-putt spiral: K on a 12 ft green races 27 past', () => {
    const plan = planPutt(['KS'], undefined, flat(12), 'center', 2) // 39 vs 12
    const out = resolvePutt(plan, flat(12), 3)
    expect(out.blewPast).toBe(true)
    expect(out.next).toEqual({ distFt: 27, downhill: true })
  })
})

describe('previewPutt: putting is fully deterministic (pillar 4)', () => {
  it('preview equals resolution', () => {
    const green = flat(45)
    const preview = previewPutt(
      { type: 'putt', cards: ['7S', '8D'] },
      green,
      'center',
      2,
      3,
    )
    expect(preview.rolled).toBe(45)
    expect(preview.holed).toBe(true)
  })

  it('previews the downhill conversion', () => {
    const preview = previewPutt({ type: 'putt', cards: ['TS'] }, flat(20), 'center', 2, 3)
    expect(preview.blewPast).toBe(true)
    expect(preview.next).toEqual({ distFt: 10, downhill: true })
  })
})
