import { type Card, type CardId, cardFromId } from './cards'

/**
 * Hand typing follows GDD §2.1 / D1–D2: the selected cards ARE the hand.
 * No kickers ride along — a selection's type is determined by its exact
 * structure, and anything that matches nothing scores as High Card with
 * all selected pips summed (the "pip dump").
 */
export type HandRank =
  | 'highCard'
  | 'pair'
  | 'twoPair'
  | 'trips'
  | 'straight'
  | 'flush'
  | 'fullHouse'
  | 'quads'
  | 'straightFlush'
  | 'royalFlush'

export const HAND_ORDER: readonly HandRank[] = [
  'highCard',
  'pair',
  'twoPair',
  'trips',
  'straight',
  'flush',
  'fullHouse',
  'quads',
  'straightFlush',
  'royalFlush',
]

/** GDD §3.2 base yardage. */
export const BASE_YARDS: Record<HandRank, number> = {
  highCard: 40,
  pair: 80,
  twoPair: 130,
  trips: 180,
  straight: 230,
  flush: 270,
  fullHouse: 310,
  quads: 360,
  straightFlush: 420,
  royalFlush: 500,
}

/** GDD §3.3 scatter by hand rank (± yards). */
export const SCATTER: Record<HandRank, number> = {
  highCard: 0,
  pair: 0,
  twoPair: 2,
  trips: 2,
  straight: 5,
  flush: 5,
  fullHouse: 8,
  quads: 8,
  straightFlush: 12,
  royalFlush: 12,
}

export const HAND_LABELS: Record<HandRank, string> = {
  highCard: 'High Card',
  pair: 'Pair',
  twoPair: 'Two Pair',
  trips: 'Three of a Kind',
  straight: 'Straight',
  flush: 'Flush',
  fullHouse: 'Full House',
  quads: 'Four of a Kind',
  straightFlush: 'Straight Flush',
  royalFlush: 'Royal Flush',
}

export interface HandEval {
  rank: HandRank
  /** Sum of rank pips of ALL selected cards (A=14 on swings). */
  pips: number
  cards: Card[]
  /** True when 2+ cards matched no structure and fell back to High Card. */
  junk: boolean
}

function isConsecutive(sorted: number[]): boolean {
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]! !== sorted[i - 1]! + 1) return false
  }
  return true
}

/**
 * Evaluate a selection of 1–5 distinct cards.
 * Throws on empty, >5, or duplicate ids (engine validates membership in hand).
 */
export function evaluateHand(ids: readonly CardId[]): HandEval {
  if (ids.length === 0) throw new Error('empty selection')
  if (ids.length > 5) throw new Error('at most 5 cards per stroke')
  if (new Set(ids).size !== ids.length) throw new Error('duplicate cards in selection')

  const cards = ids.map(cardFromId)
  const pips = cards.reduce((sum, c) => sum + c.rank, 0)

  // Rank multiplicity signature, sorted descending, e.g. full house = [3,2].
  const counts = new Map<number, number>()
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1)
  const signature = [...counts.values()].sort((a, b) => b - a).join(',')

  const done = (rank: HandRank, junk = false): HandEval => ({ rank, pips, cards, junk })

  if (cards.length === 1) return done('highCard')
  if (signature === '2') return done('pair')
  if (signature === '3') return done('trips')
  if (signature === '2,2') return done('twoPair')
  if (signature === '4') return done('quads')
  if (signature === '3,2') return done('fullHouse')

  if (cards.length === 5 && signature === '1,1,1,1,1') {
    const sorted = cards.map((c) => c.rank).sort((a, b) => a - b)
    const wheel = sorted.join(',') === '2,3,4,5,14' // A-2-3-4-5
    const straight = isConsecutive(sorted) || wheel
    const flush = cards.every((c) => c.suit === cards[0]!.suit)
    if (straight && flush) {
      return done(sorted.join(',') === '10,11,12,13,14' ? 'royalFlush' : 'straightFlush')
    }
    if (flush) return done('flush')
    if (straight) return done('straight')
  }

  return done('highCard', true)
}

/** True for the flush family (banned from bunkers, GDD §3.5). */
export function isFlushFamily(rank: HandRank): boolean {
  return rank === 'flush' || rank === 'straightFlush' || rank === 'royalFlush'
}
