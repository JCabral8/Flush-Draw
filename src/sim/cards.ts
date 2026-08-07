import { type RngState, nextInt } from './rng'

export type Suit = 'S' | 'H' | 'D' | 'C'
export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C']
export const SUIT_NAMES: Record<Suit, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
}

/** Rank is 2..14; on full swings A always counts 14. Putts may declare A as 1. */
export type CardId = string // e.g. "AS", "TD", "9C"

export interface Card {
  id: CardId
  rank: number
  suit: Suit
}

const RANK_CHARS = '23456789TJQKA'

export function rankChar(rank: number): string {
  const c = RANK_CHARS[rank - 2]
  if (c === undefined) throw new Error(`bad rank ${rank}`)
  return c
}

export function cardFromId(id: CardId): Card {
  if (id.length !== 2) throw new Error(`bad card id "${id}"`)
  const r = RANK_CHARS.indexOf(id[0]!)
  const suit = id[1]! as Suit
  if (r < 0 || !SUITS.includes(suit)) throw new Error(`bad card id "${id}"`)
  return { id, rank: r + 2, suit }
}

/** The standard 52, in canonical (unshuffled) order. */
export function makeDeck(): CardId[] {
  const deck: CardId[] = []
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push(`${rankChar(rank)}${suit}`)
    }
  }
  return deck
}

/** Fisher–Yates on a copy, driven by the given stream. */
export function shuffle(ids: readonly CardId[], rng: RngState): CardId[] {
  const out = ids.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1)
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

/** Human-readable card label, e.g. "A♠". Suit glyphs get shapes in UI (a11y). */
export function cardLabel(id: CardId): string {
  const card = cardFromId(id)
  const glyph: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }
  return `${id[0]}${glyph[card.suit]}`
}
