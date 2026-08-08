import { type HandEval, type HandRank, SCATTER, BASE_YARDS, isFlushFamily, HAND_LABELS } from './hands'
import type { SwingLie, Wind } from './types'
import { SimError } from './types'

export interface LieRules {
  mult: number
  maxCards: number
  noFlush: boolean
  skid: boolean
}

/** GDD §3.5. Fringe's ×0.8 applies to full swings taken from it (D7). */
export const LIE_RULES: Record<SwingLie, LieRules> = {
  tee: { mult: 1.1, maxCards: 5, noFlush: false, skid: false },
  fairway: { mult: 1.0, maxCards: 5, noFlush: false, skid: false },
  rough: { mult: 0.8, maxCards: 4, noFlush: false, skid: false },
  deepRough: { mult: 0.65, maxCards: 3, noFlush: false, skid: false },
  bunker: { mult: 0.6, maxCards: 5, noFlush: true, skid: false },
  cartPath: { mult: 1.3, maxCards: 5, noFlush: false, skid: true },
  fringe: { mult: 0.8, maxCards: 5, noFlush: false, skid: false },
}

export const LIE_LABELS: Record<SwingLie, string> = {
  tee: 'the tee',
  fairway: 'the fairway',
  rough: 'the rough',
  deepRough: 'deep rough',
  bunker: 'a bunker',
  cartPath: 'the cart path',
  fringe: 'the fringe',
}

/** GDD §3.4: per-card proportional wind. Boost/drag strengths can differ
 * (Weatherbeaten Wanda boosts the boost side only). */
export function windMod(
  hand: HandEval,
  wind: Wind,
  strength: number,
  dragStrength: number = strength,
): number {
  let boost = 0
  let drag = 0
  for (const c of hand.cards) {
    if (c.suit === wind.boost) boost++
    else if (c.suit === wind.drag) drag++
  }
  return 1 + (strength * boost - dragStrength * drag) / hand.cards.length
}

/** Club effects that touch the distance math (GDD §7). */
export interface ClubMods {
  distMult?: number
  distFlat?: number
  halve?: boolean
  scatterMult?: number
  minDistance?: number
  /** Score the hand as this rank (Long Iron, Chipper). */
  rankOverride?: HandRank
}

/** Returns an error message if this hand may not be swung from this lie. */
export function swingRestriction(
  lie: SwingLie,
  hand: HandEval,
  rules: LieRules = LIE_RULES[lie],
): string | null {
  if (hand.cards.length > rules.maxCards) {
    return `${LIE_LABELS[lie]} allows at most ${rules.maxCards} cards`
  }
  if (rules.noFlush && isFlushFamily(hand.rank)) {
    return `no ${HAND_LABELS[hand.rank]} from ${LIE_LABELS[lie]}`
  }
  return null
}

export function assertSwingLegal(lie: SwingLie, hand: HandEval, rules?: LieRules): void {
  const err = swingRestriction(lie, hand, rules)
  if (err) throw new SimError(err)
}

/** Deterministic part of the swing (before scatter/skid). GDD §3.1/§7. */
export function struckBase(
  hand: HandEval,
  lie: SwingLie,
  wind: Wind,
  windStrength: number,
  rules: LieRules = LIE_RULES[lie],
  club?: ClubMods,
  caddie?: { mult?: number; flat?: number; dragStrength?: number },
): number {
  const effBase = BASE_YARDS[club?.rankOverride ?? hand.rank] + hand.pips
  const raw =
    effBase *
    (club?.distMult ?? 1) *
    (caddie?.mult ?? 1) *
    rules.mult *
    windMod(hand, wind, windStrength, caddie?.dragStrength ?? windStrength)
  return Math.round(raw) + (club?.distFlat ?? 0) + (caddie?.flat ?? 0)
}

/** Effective scatter for a hand under a club (Big Bertha 2×, 9-Iron 0×). */
export function scatterFor(hand: HandEval, club?: ClubMods): number {
  const base = SCATTER[club?.rankOverride ?? hand.rank]
  return Math.round(base * (club?.scatterMult ?? 1))
}

/** Post-scatter shaping: clamp then Pitching Wedge halving (round down). */
export function finishStruck(struck: number, club?: ClubMods): number {
  const floor = Math.max(1, club?.minDistance ?? 1)
  const clamped = Math.max(floor, struck)
  return club?.halve ? Math.max(floor, Math.floor(clamped / 2)) : clamped
}

export interface SwingPreview {
  rank: HandEval['rank']
  effBase: number
  /** Distance bounds including scatter and possible cart-path skid. */
  min: number
  max: number
  scatter: number
  skidPossible: boolean
  junk: boolean
}

/** Honest pre-swing preview (GDD pillar 4). Pure — consumes no RNG. */
export function previewSwing(
  hand: HandEval,
  lie: SwingLie,
  wind: Wind,
  windStrength: number,
  rules: LieRules = LIE_RULES[lie],
  club?: ClubMods,
  caddie?: { mult?: number; flat?: number; dragStrength?: number },
): SwingPreview {
  const base = struckBase(hand, lie, wind, windStrength, rules, club, caddie)
  const scatter = scatterFor(hand, club)
  const skid = rules.skid ? 25 : 0
  const scoredRank = club?.rankOverride ?? hand.rank
  return {
    rank: scoredRank,
    effBase: BASE_YARDS[scoredRank] + hand.pips,
    min: finishStruck(base - scatter - skid, club),
    max: finishStruck(base + scatter + skid, club),
    scatter,
    skidPossible: skid > 0,
    junk: hand.junk,
  }
}
