/**
 * Caddies (GDD §8): passive rules-benders, the "Joker" slot. M4 ships the
 * system plus ten caddies chosen to exercise every hook the full 45-roster
 * needs (M5 content lands on these hooks):
 *  - swing multipliers / flats (Wren, Tony)
 *  - lie rule bending (Bobby)
 *  - asymmetric wind (Wanda) and no wind at all (Silent Sam)
 *  - deck economy (Lucky Penny, Marguerite, Silent Sam's no-reshuffle)
 *  - green factor bending (The Greenskeeper)
 *  - club charge economy (The Nephew)
 *  - pure information (The Statistician)
 */
export type CaddieId =
  | 'statistician'
  | 'wren'
  | 'bobby'
  | 'tony'
  | 'penny'
  | 'greenskeeper'
  | 'wanda'
  | 'nephew'
  | 'marguerite'
  | 'silentSam'

export type CaddieRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface CaddieSpec {
  id: CaddieId
  name: string
  rarity: CaddieRarity
  effect: string
  flavor: string
}

export const CADDIES: Record<CaddieId, CaddieSpec> = {
  statistician: {
    id: 'statistician',
    name: 'The Statistician',
    rarity: 'common',
    effect: 'The top card of the deck is always visible.',
    flavor: 'Knows the deck like his own bathtub.',
  },
  wren: {
    id: 'wren',
    name: 'Old Man Wren',
    rarity: 'common',
    effect: 'Hands using only red cards get +20% distance.',
    flavor: "Hates the color black. Won't say why.",
  },
  bobby: {
    id: 'bobby',
    name: 'Bag-of-Tees Bobby',
    rarity: 'common',
    effect: 'Tee shots play ×1.15 instead of ×1.10.',
    flavor: 'Sells them out of his coat, too.',
  },
  tony: {
    id: 'tony',
    name: 'Two-Glove Tony',
    rarity: 'common',
    effect: 'Pairs get +15 yards.',
    flavor: 'Twice the grip, twice the rip.',
  },
  penny: {
    id: 'penny',
    name: 'Lucky Penny',
    rarity: 'common',
    effect: 'The first reshuffle each round costs no stroke.',
    flavor: "Found it heads-up in the parking lot in '86.",
  },
  greenskeeper: {
    id: 'greenskeeper',
    name: 'The Greenskeeper',
    rarity: 'common',
    effect: 'Fringe putts are flat, not downhill.',
    flavor: "It's his fringe. He'll mow it how he likes.",
  },
  wanda: {
    id: 'wanda',
    name: 'Weatherbeaten Wanda',
    rarity: 'uncommon',
    effect: 'Wind boost is +20% (drag stays −15%).',
    flavor: 'Licks a finger. Points. Always right.',
  },
  nephew: {
    id: 'nephew',
    name: 'The Nephew',
    rarity: 'uncommon',
    effect: 'All per-round club charges +1.',
    flavor: 'Somebody owed the caddie master a favor.',
  },
  marguerite: {
    id: 'marguerite',
    name: 'Marguerite',
    rarity: 'rare',
    effect: 'Played 2s, 3s and 4s return to your hand.',
    flavor: 'Keeps the little ones close.',
  },
  silentSam: {
    id: 'silentSam',
    name: 'Silent Sam',
    rarity: 'rare',
    effect: 'No wind, ever. But the deck never reshuffles: run it dry and the run ends.',
    flavor: '…',
  },
}

export const DEFAULT_CADDIE_POOL: readonly CaddieId[] = Object.keys(CADDIES) as CaddieId[]

/** GDD §8 rarity weights (per-mille style integers). */
export const RARITY_WEIGHT: Record<CaddieRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  legendary: 3,
}
