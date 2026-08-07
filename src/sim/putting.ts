import { type CardId, cardFromId } from './cards'
import type { GreenState, Pin, SimAction } from './types'
import { SimError } from './types'

/**
 * GDD §4: putting is pure arithmetic. No wind, no scatter, no lie mults.
 * distance rolled = Σ(rank value) × F, F from slope (§4.3 / D6).
 */
export function greenFactor(green: GreenState, pin: Pin): number {
  if (green.downhill) return 4
  if (pin === 'front') return 2.5
  return 3
}

export interface PuttPlan {
  /** Rank values after ace declarations. */
  values: number[]
  sum: number
  factor: number
  /** Feet the ball will roll (front-pin halves round to nearest ft). */
  rolled: number
}

export function planPutt(
  cards: readonly CardId[],
  aceValues: Record<CardId, 1 | 14> | undefined,
  green: GreenState,
  pin: Pin,
  maxCards: number,
): PuttPlan {
  if (cards.length === 0) throw new SimError('play at least 1 card to putt')
  if (cards.length > maxCards) throw new SimError(`at most ${maxCards} cards on a putt`)
  if (new Set(cards).size !== cards.length) throw new SimError('duplicate cards in selection')

  const values = cards.map((id) => {
    const card = cardFromId(id)
    if (card.rank === 14) {
      const declared = aceValues?.[id]
      if (declared === undefined) {
        throw new SimError(`declare ${id} as 1 or 14 before putting`)
      }
      return declared
    }
    return card.rank
  })

  const sum = values.reduce((a, b) => a + b, 0)
  const factor = greenFactor(green, pin)
  return { values, sum, factor, rolled: Math.round(sum * factor) }
}

export interface PuttOutcome {
  rolled: number
  holed: boolean
  /** Next green state when not holed. */
  next: GreenState | null
  blewPast: boolean
}

/** Resolve a planned putt against the green (GDD §4.1). Pure. */
export function resolvePutt(plan: PuttPlan, green: GreenState, gimmeFt: number): PuttOutcome {
  const diff = green.distFt - plan.rolled
  if (Math.abs(diff) <= gimmeFt) {
    return { rolled: plan.rolled, holed: true, next: null, blewPast: false }
  }
  if (diff > 0) {
    // Short: putt again from what's left; slope unchanged.
    return {
      rolled: plan.rolled,
      holed: false,
      next: { distFt: diff, downhill: green.downhill },
      blewPast: false,
    }
  }
  // Long: ball rolls past; every subsequent putt on this green is downhill.
  return {
    rolled: plan.rolled,
    holed: false,
    next: { distFt: -diff, downhill: true },
    blewPast: true,
  }
}

/** Exact putt preview (pillar 4: putting is fully deterministic). */
export function previewPutt(
  action: Extract<SimAction, { type: 'putt' }>,
  green: GreenState,
  pin: Pin,
  maxCards: number,
  gimmeFt: number,
): PuttOutcome {
  const plan = planPutt(action.cards, action.aceValues, green, pin, maxCards)
  return resolvePutt(plan, green, gimmeFt)
}
