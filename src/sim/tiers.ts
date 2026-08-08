import { DEFAULT_BAG } from './clubs'
import { DEFAULT_CADDIE_POOL } from './caddies'
import { DEFAULT_CONFIG, type RunConfig } from './types'

/**
 * Tour tiers ("Tour Cards", GDD §12). Cut lines are cumulative-to-par
 * ceilings checked after holes 9 and 18. Tier modifiers only ever tighten
 * the long side or scarcity — never soften short (D15).
 */
export interface TierSpec {
  tier: number
  name: string
  cut1: number
  cut2: number
  windStrength: number
  pinWeights: { front: number; center: number; back: number }
  reshufflePenalty: number
  fringeWindow: number
  gimmeFt: number
  caddieOfferCount: number
}

/**
 * Cut lines retuned by Monte Carlo (see BALANCE.md): the original +6/+9
 * entry cuts let near-optimal play through 96% of the time. These lines put
 * tier 1 at ~65% for the optimal policy (top of the 55–65% target band —
 * the entry tier errs friendly) and tier 8 in the 8–15% band.
 */
export const TIERS: readonly TierSpec[] = [
  { tier: 1, name: 'Municipal', cut1: 1, cut2: 1, windStrength: 0.15, pinWeights: { front: 40, center: 40, back: 20 }, reshufflePenalty: 1, fringeWindow: 20, gimmeFt: 3, caddieOfferCount: 3 },
  { tier: 2, name: 'Public', cut1: 1, cut2: 1, windStrength: 0.15, pinWeights: { front: 35, center: 40, back: 25 }, reshufflePenalty: 1, fringeWindow: 20, gimmeFt: 3, caddieOfferCount: 3 },
  { tier: 3, name: 'Club', cut1: 0, cut2: 1, windStrength: 0.18, pinWeights: { front: 30, center: 40, back: 30 }, reshufflePenalty: 1, fringeWindow: 20, gimmeFt: 3, caddieOfferCount: 3 },
  { tier: 4, name: 'Amateur', cut1: 0, cut2: 0, windStrength: 0.18, pinWeights: { front: 25, center: 40, back: 35 }, reshufflePenalty: 1, fringeWindow: 20, gimmeFt: 3, caddieOfferCount: 3 },
  { tier: 5, name: 'Q-School', cut1: -1, cut2: 0, windStrength: 0.2, pinWeights: { front: 20, center: 40, back: 40 }, reshufflePenalty: 2, fringeWindow: 20, gimmeFt: 3, caddieOfferCount: 3 },
  { tier: 6, name: 'Tour', cut1: -1, cut2: -1, windStrength: 0.2, pinWeights: { front: 20, center: 35, back: 45 }, reshufflePenalty: 2, fringeWindow: 15, gimmeFt: 3, caddieOfferCount: 3 },
  { tier: 7, name: 'Major', cut1: -2, cut2: -2, windStrength: 0.22, pinWeights: { front: 15, center: 35, back: 50 }, reshufflePenalty: 2, fringeWindow: 15, gimmeFt: 2, caddieOfferCount: 3 },
  { tier: 8, name: 'Immortal', cut1: -2, cut2: -4, windStrength: 0.25, pinWeights: { front: 10, center: 30, back: 60 }, reshufflePenalty: 2, fringeWindow: 15, gimmeFt: 2, caddieOfferCount: 2 },
]

/** Build the RunConfig for a tour tier (27-hole run with cuts + caddies). */
export function tierConfig(tier: number): RunConfig {
  const spec = TIERS[tier - 1]
  if (!spec) throw new Error(`no tier ${tier}`)
  return {
    ...DEFAULT_CONFIG,
    windStrength: spec.windStrength,
    pinWeights: { ...spec.pinWeights },
    reshufflePenalty: spec.reshufflePenalty,
    fringeWindow: spec.fringeWindow,
    gimmeFt: spec.gimmeFt,
    bag: [...DEFAULT_BAG],
    cuts: [
      { afterHole: 9, maxToPar: spec.cut1 },
      { afterHole: 18, maxToPar: spec.cut2 },
    ],
    caddiePool: [...DEFAULT_CADDIE_POOL],
    caddieOfferCount: spec.caddieOfferCount,
  }
}
