import type { SwingLie } from './types'

/**
 * Clubs (GDD §7): every club is a verb. M3 ships the system plus the launch
 * set; the full 24-club collection is M5 content on top of these hooks.
 *
 * Hook types exercised here:
 *  - swing modifier (Driver ×1.25, 3-Wood +40, Pitching Wedge halve)
 *  - lie bender (Sand Wedge: bunker plays honest)
 *  - resolution bender (Pitching Wedge: [30 short, 20 long] counts as green)
 *  - instant card actions (7-Iron reroll, Punch Iron discard-2-draw-3)
 *  - putter variant (Blade: +1 card on putts)
 */
export type ClubId =
  | 'driver'
  | 'threeWood'
  | 'sevenIron'
  | 'pitchingWedge'
  | 'punchIron'
  | 'sandWedge'

export type PutterId = 'blade'

export interface ClubSpec {
  id: ClubId
  name: string
  kind: 'swing' | 'instant' | 'passive'
  /** Uses per round (Infinity = uncapped). */
  charges: number
  /** Additional per-hole cap (Driver: 1). */
  perHole?: number
  /** Only usable from these lies (Driver: tee). */
  lies?: readonly SwingLie[]
  distMult?: number
  distFlat?: number
  /** Halve the final struck distance (round down). */
  halve?: boolean
  /** Long-side yards that still count as on the green (Pitching Wedge). */
  greenWindowLong?: number
}

export const CLUBS: Record<ClubId, ClubSpec> = {
  driver: {
    id: 'driver',
    name: 'Driver',
    kind: 'swing',
    charges: Infinity,
    perHole: 1,
    lies: ['tee'],
    distMult: 1.25,
  },
  threeWood: {
    id: 'threeWood',
    name: '3-Wood',
    kind: 'swing',
    charges: 3,
    distFlat: 40,
  },
  sevenIron: {
    id: 'sevenIron',
    name: '7-Iron',
    kind: 'instant',
    charges: 3,
  },
  pitchingWedge: {
    id: 'pitchingWedge',
    name: 'Pitching Wedge',
    kind: 'swing',
    charges: 4,
    halve: true,
    greenWindowLong: 20,
  },
  punchIron: {
    id: 'punchIron',
    name: 'Punch Iron',
    kind: 'instant',
    charges: 4,
  },
  sandWedge: {
    id: 'sandWedge',
    name: 'Sand Wedge',
    kind: 'passive',
    charges: Infinity,
  },
}

/** GDD §7.2 launch bag. */
export const DEFAULT_BAG: readonly ClubId[] = [
  'driver',
  'threeWood',
  'sevenIron',
  'pitchingWedge',
  'punchIron',
]

/** Blade putter perk: +1 card allowed on putts (D10). */
export function putterMaxCards(putter: PutterId, baseline: number): number {
  return putter === 'blade' ? baseline + 1 : baseline
}
