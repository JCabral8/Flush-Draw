import { type HandEval, SCATTER, BASE_YARDS, isFlushFamily, HAND_LABELS } from './hands'
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

/** GDD §3.4: per-card proportional wind. */
export function windMod(hand: HandEval, wind: Wind, strength: number): number {
  let boost = 0
  let drag = 0
  for (const c of hand.cards) {
    if (c.suit === wind.boost) boost++
    else if (c.suit === wind.drag) drag++
  }
  return 1 + (strength * (boost - drag)) / hand.cards.length
}

/** Returns an error message if this hand may not be swung from this lie. */
export function swingRestriction(lie: SwingLie, hand: HandEval): string | null {
  const rules = LIE_RULES[lie]
  if (hand.cards.length > rules.maxCards) {
    return `${LIE_LABELS[lie]} allows at most ${rules.maxCards} cards`
  }
  if (rules.noFlush && isFlushFamily(hand.rank)) {
    return `no ${HAND_LABELS[hand.rank]} from ${LIE_LABELS[lie]}`
  }
  return null
}

export function assertSwingLegal(lie: SwingLie, hand: HandEval): void {
  const err = swingRestriction(lie, hand)
  if (err) throw new SimError(err)
}

/** Deterministic part of the swing (before scatter/skid). GDD §3.1. */
export function struckBase(hand: HandEval, lie: SwingLie, wind: Wind, windStrength: number): number {
  const effBase = BASE_YARDS[hand.rank] + hand.pips
  const raw = effBase * LIE_RULES[lie].mult * windMod(hand, wind, windStrength)
  return Math.round(raw)
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
): SwingPreview {
  const base = struckBase(hand, lie, wind, windStrength)
  const scatter = SCATTER[hand.rank]
  const skid = LIE_RULES[lie].skid ? 25 : 0
  return {
    rank: hand.rank,
    effBase: BASE_YARDS[hand.rank] + hand.pips,
    min: Math.max(1, base - scatter - skid),
    max: base + scatter + skid,
    scatter,
    skidPossible: skid > 0,
    junk: hand.junk,
  }
}
