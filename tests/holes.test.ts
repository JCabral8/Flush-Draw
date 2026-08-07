import { describe, expect, it } from 'vitest'
import { SUNNYVALE_FRONT_9 } from '../src/sim/data/sunnyvale'
import {
  APPROACH_GIMME_YDS,
  FRINGE_WINDOW,
  GREEN_WINDOW,
  lieAt,
  PAR_BANDS,
  PIN_SHIFT,
  validateCourse,
  validateHole,
  waterDropPos,
} from '../src/sim/holes'
import type { HoleSpec } from '../src/sim/types'

const ditch = SUNNYVALE_FRONT_9.find((h) => h.id === 'muni-04')!

describe('constants match the GDD', () => {
  it('green window 30, fringe 20, gimme 1 yd', () => {
    expect(GREEN_WINDOW).toBe(30)
    expect(FRINGE_WINDOW).toBe(20)
    expect(APPROACH_GIMME_YDS).toBe(1)
  })
  it('pin shifts ±12', () => {
    expect(PIN_SHIFT.front).toBe(-12)
    expect(PIN_SHIFT.center).toBe(0)
    expect(PIN_SHIFT.back).toBe(12)
  })
  it('par bands', () => {
    expect(PAR_BANDS[3]).toEqual([120, 260])
    expect(PAR_BANDS[4]).toEqual([261, 430])
    expect(PAR_BANDS[5]).toEqual([431, 620])
  })
})

describe('lieAt', () => {
  it('position 0 is the tee', () => {
    expect(lieAt(ditch, 0)).toBe('tee')
  })
  it('reads authored segments', () => {
    expect(lieAt(ditch, 100)).toBe('fairway')
    expect(lieAt(ditch, 180)).toBe('water')
    expect(lieAt(ditch, 205)).toBe('water')
    expect(lieAt(ditch, 206)).toBe('fairway')
    expect(lieAt(ditch, 260)).toBe('rough')
  })
  it('segment boundaries are inclusive on both ends', () => {
    expect(lieAt(ditch, 179)).toBe('fairway')
    expect(lieAt(ditch, 255)).toBe('rough')
    expect(lieAt(ditch, 289)).toBe('rough')
    expect(lieAt(ditch, 290)).toBe('fairway')
  })
  it('uncovered positions default to fairway (back-pin gap)', () => {
    expect(lieAt(ditch, 340)).toBe('fairway') // beyond authored 324
  })
})

describe('waterDropPos (D12): nearest fairway strictly behind', () => {
  it('drops just short of the water', () => {
    expect(waterDropPos(ditch, 190)).toBe(179)
  })
  it('drops behind even from the far edge of the water', () => {
    expect(waterDropPos(ditch, 205)).toBe(179)
  })
  it('falls back to the tee when no fairway exists behind', () => {
    const hole: HoleSpec = {
      id: 't',
      name: 'T',
      par: 3,
      length: 150,
      flavor: 'x',
      segments: [
        { from: 0, to: 0, lie: 'tee' },
        { from: 1, to: 30, lie: 'rough' },
        { from: 31, to: 60, lie: 'water' },
        { from: 61, to: 119, lie: 'fairway' },
      ],
    }
    expect(waterDropPos(hole, 45)).toBe(0)
  })
})

describe('hole validation', () => {
  const good: HoleSpec = {
    id: 'ok',
    name: 'Fine Hole',
    par: 4,
    length: 300,
    flavor: 'Perfectly reasonable.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 269, lie: 'fairway' },
    ],
  }

  it('accepts a well-formed hole', () => {
    expect(validateHole(good)).toEqual([])
  })

  it.each([
    [3, 119], [3, 261], [4, 260], [4, 431], [5, 430], [5, 621],
  ] as [3 | 4 | 5, number][])('rejects par %i at %i yds (out of band)', (par, length) => {
    const bad = { ...good, par, length }
    expect(validateHole(bad).some((p) => p.includes('must be'))).toBe(true)
  })

  it.each([
    [3, 120], [3, 260], [4, 261], [4, 430], [5, 431], [5, 620],
  ] as [3 | 4 | 5, number][])('accepts par %i at %i yds (band edge)', (par, length) => {
    const seg = [
      { from: 0, to: 0, lie: 'tee' as const },
      { from: 1, to: length - 31, lie: 'fairway' as const },
    ]
    expect(validateHole({ ...good, par, length, segments: seg })).toEqual([])
  })

  it('rejects a gap in segments', () => {
    const bad = {
      ...good,
      segments: [
        { from: 0, to: 0, lie: 'tee' as const },
        { from: 5, to: 269, lie: 'fairway' as const },
      ],
    }
    expect(validateHole(bad).some((p) => p.includes('gap'))).toBe(true)
  })

  it('rejects overlapping segments', () => {
    const bad = {
      ...good,
      segments: [
        { from: 0, to: 0, lie: 'tee' as const },
        { from: 1, to: 100, lie: 'fairway' as const },
        { from: 90, to: 269, lie: 'rough' as const },
      ],
    }
    expect(validateHole(bad).some((p) => p.includes('overlap'))).toBe(true)
  })

  it('rejects inverted segments', () => {
    const bad = {
      ...good,
      segments: [
        { from: 0, to: 0, lie: 'tee' as const },
        { from: 100, to: 50, lie: 'fairway' as const },
      ],
    }
    expect(validateHole(bad).some((p) => p.includes('inverted'))).toBe(true)
  })

  it('rejects segments that stop short of the green', () => {
    const bad = {
      ...good,
      segments: [
        { from: 0, to: 0, lie: 'tee' as const },
        { from: 1, to: 200, lie: 'fairway' as const },
      ],
    }
    expect(validateHole(bad).some((p) => p.includes('must cover'))).toBe(true)
  })

  it('rejects water at the tee', () => {
    const bad = {
      ...good,
      segments: [
        { from: 0, to: 0, lie: 'tee' as const },
        { from: 1, to: 40, lie: 'water' as const },
        { from: 41, to: 269, lie: 'fairway' as const },
      ],
    }
    expect(validateHole(bad).some((p) => p.includes('water'))).toBe(true)
  })

  it('demands a name and flavor text (no lorem ipsum ships)', () => {
    expect(validateHole({ ...good, name: '  ' }).some((p) => p.includes('name'))).toBe(true)
    expect(validateHole({ ...good, flavor: '' }).some((p) => p.includes('flavor'))).toBe(true)
  })
})

describe('the authored front 9 is valid', () => {
  it('validates as a course', () => {
    expect(validateCourse(SUNNYVALE_FRONT_9)).toEqual([])
  })

  it.each(SUNNYVALE_FRONT_9.map((h) => [h.id, h] as const))('%s validates', (_id, hole) => {
    expect(validateHole(hole)).toEqual([])
  })

  it('is par 36 with 2/5/2 pars', () => {
    const pars = SUNNYVALE_FRONT_9.map((h) => h.par)
    expect(pars.reduce((a, b) => a + b, 0)).toBe(36)
    expect(pars.filter((p) => p === 3).length).toBe(2)
    expect(pars.filter((p) => p === 4).length).toBe(5)
    expect(pars.filter((p) => p === 5).length).toBe(2)
  })

  it('every hole has hand-written flavor', () => {
    for (const hole of SUNNYVALE_FRONT_9) {
      expect(hole.flavor.length).toBeGreaterThan(10)
      expect(hole.flavor.toLowerCase()).not.toContain('lorem')
    }
  })

  it('course validation catches a wrong-sized course and duplicate ids', () => {
    expect(validateCourse(SUNNYVALE_FRONT_9.slice(0, 8)).length).toBeGreaterThan(0)
    const dup = [...SUNNYVALE_FRONT_9.slice(0, 8), SUNNYVALE_FRONT_9[0]!]
    expect(validateCourse(dup).some((p) => p.includes('duplicate'))).toBe(true)
  })
})
