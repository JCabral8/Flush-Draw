import type { SwingLie } from './types'

/**
 * Clubs (GDD §7): every club is a verb — distance, precision, information,
 * card economy, or a bent rule. The full collection; the bag of 5 is the
 * build. Hooks are consumed in engine.ts / swing.ts.
 */
export type ClubId =
  | 'driver'
  | 'bigBertha'
  | 'threeWood'
  | 'fiveWood'
  | 'twoIron'
  | 'fourIron'
  | 'sevenIron'
  | 'eightIron'
  | 'nineIron'
  | 'pitchingWedge'
  | 'gapWedge'
  | 'lobWedge'
  | 'sandWedge'
  | 'hybrid'
  | 'punchIron'
  | 'longIron'
  | 'chipper'
  | 'cleek'
  | 'mashie'
  | 'niblick'
  | 'persimmon'
  | 'baffingSpoon'
  | 'oneIron'
  | 'texasWedge'

export type PutterId = 'blade' | 'mallet' | 'belly' | 'broomstick'

export interface ClubSpec {
  id: ClubId
  name: string
  kind: 'swing' | 'instant' | 'passive'
  /** Uses per round (Infinity = uncapped). */
  charges: number
  /** Additional per-hole cap (Driver/Big Bertha: 1). */
  perHole?: number
  /** Only usable from these lies. */
  lies?: readonly SwingLie[]
  flavor: string
  // ---- swing shaping ----
  distMult?: number
  distFlat?: number
  /** Halve the final struck distance (round down). */
  halve?: boolean
  /** Multiplier on scatter (0 = dead straight, 2 = wild). */
  scatterMult?: number
  /** Wind does not touch this stroke. */
  windImmune?: boolean
  /** Lie distance multiplier becomes ×1.00 (restrictions still apply). */
  lieNeutral?: boolean
  /** Result below this floor is clamped up (Gap Wedge min 5). */
  minDistance?: number
  /** Play exactly 1 card; struck is exactly this, no modifiers. */
  fixedDistance?: number
  // ---- hand shaping ----
  /** Straights score one tier higher (Straight→Flush, SF→Royal). */
  straightTierUp?: boolean
  /** High Card strokes score as Pair. */
  highCardAsPair?: boolean
  /** +1 card above the lie's cap (rough/deep rough only). */
  cardCapBonus?: number
  /** One selected card may be declared as any rank+suit. */
  wildcard?: boolean
  // ---- resolution shaping ----
  /** Long-side yards that still count as on the green. */
  greenWindowLong?: number
  /** Struck distance capped at exactly green-front (30 short). */
  capAtGreenFront?: boolean
  /** This stroke, a long result maps to the lie the same distance short. */
  symmetricLong?: boolean
  // ---- economy / info / meta ----
  /** After the stroke, the highest played card returns to hand. */
  returnPlayed?: boolean
  /** Instant: peek this many deck cards. */
  peek?: number
  /** After the swing, the stroke may be retaken once (result stands). */
  mulligan?: boolean
  /** Putt from fairway/rough within 40 yds (F4, max 2 cards). */
  texasWedge?: boolean
}

const C = (spec: ClubSpec): ClubSpec => spec

export const CLUBS: Record<ClubId, ClubSpec> = {
  driver: C({
    id: 'driver', name: 'Driver', kind: 'swing', charges: Infinity, perHole: 1,
    lies: ['tee'], distMult: 1.25,
    flavor: 'The big dog. Feed it off the tee, once a hole.',
  }),
  bigBertha: C({
    id: 'bigBertha', name: 'Big Bertha', kind: 'swing', charges: 1, perHole: 1,
    lies: ['tee'], distMult: 1.5, scatterMult: 2,
    flavor: 'Half again as far, twice as wild. Bertha regrets nothing.',
  }),
  threeWood: C({
    id: 'threeWood', name: '3-Wood', kind: 'swing', charges: 3, distFlat: 40,
    flavor: 'Forty honest yards, no questions asked.',
  }),
  fiveWood: C({
    id: 'fiveWood', name: '5-Wood', kind: 'swing', charges: 3, distFlat: 25, scatterMult: 0.5,
    flavor: 'A little more, a lot straighter.',
  }),
  twoIron: C({
    id: 'twoIron', name: '2-Iron Stinger', kind: 'swing', charges: 3,
    windImmune: true, distMult: 0.95,
    flavor: 'Under the wind, under the radar.',
  }),
  fourIron: C({
    id: 'fourIron', name: '4-Iron', kind: 'swing', charges: 2, lieNeutral: true,
    flavor: "Doesn't believe in rough. Rough believes in it.",
  }),
  sevenIron: C({
    id: 'sevenIron', name: '7-Iron', kind: 'instant', charges: 3,
    flavor: 'Toss the hand. Trust the deck.',
  }),
  eightIron: C({
    id: 'eightIron', name: '8-Iron', kind: 'swing', charges: 2, returnPlayed: true,
    flavor: 'Your best card comes back for another dance.',
  }),
  nineIron: C({
    id: 'nineIron', name: '9-Iron', kind: 'swing', charges: 3, scatterMult: 0,
    flavor: 'Dead straight. Boring. Beautiful.',
  }),
  pitchingWedge: C({
    id: 'pitchingWedge', name: 'Pitching Wedge', kind: 'swing', charges: 4,
    halve: true, greenWindowLong: 20,
    flavor: 'Half the distance, all of the green.',
  }),
  gapWedge: C({
    id: 'gapWedge', name: 'Gap Wedge', kind: 'swing', charges: 4, distFlat: -30, minDistance: 5,
    flavor: 'Thirty yards less of whatever you were about to do.',
  }),
  lobWedge: C({
    id: 'lobWedge', name: 'Lob Wedge', kind: 'swing', charges: 2, greenWindowLong: 20,
    flavor: 'Straight up, straight down, sticks like gossip.',
  }),
  sandWedge: C({
    id: 'sandWedge', name: 'Sand Wedge', kind: 'passive', charges: Infinity,
    flavor: 'Bunkers are just fairways with opinions.',
  }),
  hybrid: C({
    id: 'hybrid', name: 'Hybrid', kind: 'swing', charges: 2, wildcard: true,
    flavor: 'One card is whatever you say it is. Say it with a straight face.',
  }),
  punchIron: C({
    id: 'punchIron', name: 'Punch Iron', kind: 'instant', charges: 4,
    flavor: 'Two out, three in. The oldest trade there is.',
  }),
  longIron: C({
    id: 'longIron', name: 'Long Iron', kind: 'swing', charges: 3, straightTierUp: true,
    flavor: 'Stretches a straight into something rude.',
  }),
  chipper: C({
    id: 'chipper', name: 'Chipper', kind: 'swing', charges: 3, highCardAsPair: true,
    flavor: 'One card, all wrist.',
  }),
  cleek: C({
    id: 'cleek', name: 'Cleek', kind: 'swing', charges: 3, cardCapBonus: 1,
    flavor: 'An old name for an unfair advantage in tall grass.',
  }),
  mashie: C({
    id: 'mashie', name: 'Mashie', kind: 'instant', charges: 3, peek: 3,
    flavor: 'Knows what the deck is thinking.',
  }),
  niblick: C({
    id: 'niblick', name: 'Niblick', kind: 'swing', charges: 1, symmetricLong: true,
    flavor: 'For one swing, long is forgiven. One.',
  }),
  persimmon: C({
    id: 'persimmon', name: 'Persimmon', kind: 'swing', charges: 1, mulligan: true,
    flavor: "That one didn't count. This one counts.",
  }),
  baffingSpoon: C({
    id: 'baffingSpoon', name: 'Baffing Spoon', kind: 'swing', charges: 2, capAtGreenFront: true,
    flavor: 'Physically incapable of hitting it past the front. A coward. A genius.',
  }),
  oneIron: C({
    id: 'oneIron', name: 'One-Iron', kind: 'swing', charges: 1, fixedDistance: 200,
    flavor: "Even God can't hit a 1-iron. You can: exactly 200, every time.",
  }),
  texasWedge: C({
    id: 'texasWedge', name: 'Texas Wedge', kind: 'instant', charges: 2, texasWedge: true,
    flavor: 'Why loft it when the ground is right there?',
  }),
}

export interface PutterSpec {
  id: PutterId
  name: string
  flavor: string
  /** Extra cards allowed on putts. */
  extraCards?: number
  /** Rolled distance rounds to the nearest 5 ft. */
  roundTo5?: boolean
  /** Gimme radius override (ft). */
  gimmeFt?: number
  /** Downhill factor capped at 3. */
  downhillCap?: boolean
}

export const PUTTERS: Record<PutterId, PutterSpec> = {
  blade: {
    id: 'blade', name: 'Blade', extraCards: 1,
    flavor: 'Thin, honest, and one card more generous than the rules.',
  },
  mallet: {
    id: 'mallet', name: 'Mallet', roundTo5: true,
    flavor: 'Rolls to the nearest five feet. Precision through bluntness.',
  },
  belly: {
    id: 'belly', name: 'Belly', gimmeFt: 6,
    flavor: 'Twice the gimme. No dignity whatsoever.',
  },
  broomstick: {
    id: 'broomstick', name: 'Broomstick', downhillCap: true,
    flavor: 'The slope can push. It cannot shove.',
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

/** Putter perk: extra cards allowed on putts (D10). */
export function putterMaxCards(putter: PutterId, baseline: number): number {
  return baseline + (PUTTERS[putter].extraCards ?? 0)
}
