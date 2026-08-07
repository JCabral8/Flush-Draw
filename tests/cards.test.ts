import { describe, expect, it } from 'vitest'
import { cardFromId, cardLabel, makeDeck, rankChar, shuffle, SUITS } from '../src/sim/cards'
import { seedStream } from '../src/sim/rng'

describe('cards & deck', () => {
  it('the deck has 52 unique cards', () => {
    const deck = makeDeck()
    expect(deck.length).toBe(52)
    expect(new Set(deck).size).toBe(52)
  })

  it('every card id parses back to itself', () => {
    for (const id of makeDeck()) {
      const card = cardFromId(id)
      expect(card.id).toBe(id)
      expect(card.rank).toBeGreaterThanOrEqual(2)
      expect(card.rank).toBeLessThanOrEqual(14)
      expect(SUITS).toContain(card.suit)
    }
  })

  it.each([
    ['2S', 2, 'S'],
    ['9D', 9, 'D'],
    ['TC', 10, 'C'],
    ['JH', 11, 'H'],
    ['QS', 12, 'S'],
    ['KD', 13, 'D'],
    ['AS', 14, 'S'],
  ])('parses %s as rank %i of %s', (id, rank, suit) => {
    const card = cardFromId(id)
    expect(card.rank).toBe(rank)
    expect(card.suit).toBe(suit)
  })

  it.each(['XX', '1S', '0D', 'AA', 'S2', 'A', 'ASD'])('rejects bad id %s', (id) => {
    expect(() => cardFromId(id)).toThrow()
  })

  it('rankChar covers 2..14 and rejects outside', () => {
    expect(rankChar(2)).toBe('2')
    expect(rankChar(10)).toBe('T')
    expect(rankChar(14)).toBe('A')
    expect(() => rankChar(1)).toThrow()
    expect(() => rankChar(15)).toThrow()
  })

  it('shuffle is a permutation and does not mutate its input', () => {
    const deck = makeDeck()
    const before = deck.slice()
    const out = shuffle(deck, seedStream('s', 'deck'))
    expect(deck).toEqual(before)
    expect(out.slice().sort()).toEqual(deck.slice().sort())
  })

  it('shuffle is deterministic per seed and differs across seeds', () => {
    const a = shuffle(makeDeck(), seedStream('a', 'deck'))
    const b = shuffle(makeDeck(), seedStream('a', 'deck'))
    const c = shuffle(makeDeck(), seedStream('b', 'deck'))
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
    expect(a).not.toEqual(makeDeck())
  })

  it('cardLabel renders rank + suit glyph', () => {
    expect(cardLabel('AS')).toBe('A♠')
    expect(cardLabel('TH')).toBe('T♥')
    expect(cardLabel('2C')).toBe('2♣')
    expect(cardLabel('9D')).toBe('9♦')
  })
})
