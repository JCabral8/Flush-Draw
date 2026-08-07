import { describe, expect, it } from 'vitest'
import {
  BASE_YARDS,
  evaluateHand,
  HAND_ORDER,
  isFlushFamily,
  SCATTER,
  type HandRank,
} from '../src/sim/hands'

describe('hand evaluation: the selected cards ARE the hand', () => {
  it.each([
    ['2S'], ['5D'], ['9C'], ['TH'], ['JS'], ['QD'], ['KC'], ['AH'],
  ])('a single card (%s) is High Card', (id) => {
    const h = evaluateHand([id])
    expect(h.rank).toBe('highCard')
    expect(h.junk).toBe(false)
  })

  it.each([
    [['2S', '2H']], [['3D', '3C']], [['4S', '4D']], [['5H', '5C']],
    [['6S', '6H']], [['7D', '7C']], [['8S', '8H']], [['9D', '9C']],
    [['TS', 'TH']], [['JD', 'JC']], [['QS', 'QH']], [['KD', 'KC']], [['AS', 'AH']],
  ])('%j is a Pair', (ids) => {
    expect(evaluateHand(ids).rank).toBe('pair')
  })

  it.each([
    [['2S', '2H', '2D']], [['7S', '7H', '7C']], [['TS', 'TD', 'TC']],
    [['QS', 'QH', 'QD']], [['AS', 'AH', 'AC']],
  ])('%j is Three of a Kind', (ids) => {
    expect(evaluateHand(ids).rank).toBe('trips')
  })

  it.each([
    [['2S', '2H', '3D', '3C']], [['9S', '9H', 'TD', 'TC']],
    [['JS', 'JH', 'QD', 'QC']], [['KS', 'KH', 'AD', 'AC']],
  ])('%j is Two Pair', (ids) => {
    expect(evaluateHand(ids).rank).toBe('twoPair')
  })

  it.each([
    [['2S', '2H', '2D', '2C']], [['8S', '8H', '8D', '8C']], [['AS', 'AH', 'AD', 'AC']],
  ])('%j is Four of a Kind', (ids) => {
    expect(evaluateHand(ids).rank).toBe('quads')
  })

  it.each([
    [['2S', '2H', '2D', '3C', '3S']],
    [['KS', 'KH', 'KD', 'QC', 'QS']],
    [['7S', '7H', '7D', 'AC', 'AS']],
  ])('%j is a Full House', (ids) => {
    expect(evaluateHand(ids).rank).toBe('fullHouse')
  })

  it.each([
    [['2S', '3H', '4D', '5C', '6S']],
    [['3S', '4H', '5D', '6C', '7S']],
    [['4S', '5H', '6D', '7C', '8S']],
    [['5S', '6H', '7D', '8C', '9S']],
    [['6S', '7H', '8D', '9C', 'TS']],
    [['7S', '8H', '9D', 'TC', 'JS']],
    [['8S', '9H', 'TD', 'JC', 'QS']],
    [['9S', 'TH', 'JD', 'QC', 'KS']],
    [['TS', 'JH', 'QD', 'KC', 'AS']],
  ])('%j is a Straight (mixed suits)', (ids) => {
    expect(evaluateHand(ids).rank).toBe('straight')
  })

  it('the wheel (A-2-3-4-5) is a Straight', () => {
    const h = evaluateHand(['AS', '2H', '3D', '4C', '5S'])
    expect(h.rank).toBe('straight')
    // A still counts 14 pips on a swing (GDD §2): 14+2+3+4+5.
    expect(h.pips).toBe(28)
  })

  it('K-A-2-3-4 does NOT wrap around', () => {
    const h = evaluateHand(['KS', 'AH', '2D', '3C', '4S'])
    expect(h.rank).toBe('highCard')
    expect(h.junk).toBe(true)
  })

  it.each([
    [['2S', '5S', '7S', 'JS', 'KS']],
    [['3H', '6H', '9H', 'TH', 'AH']],
    [['2D', '4D', '8D', 'QD', 'KD']],
    [['5C', '7C', '9C', 'JC', 'AC']],
  ])('%j is a Flush', (ids) => {
    expect(evaluateHand(ids).rank).toBe('flush')
  })

  it.each([
    [['2S', '3S', '4S', '5S', '6S']],
    [['5H', '6H', '7H', '8H', '9H']],
    [['9D', 'TD', 'JD', 'QD', 'KD']],
    [['AC', '2C', '3C', '4C', '5C']], // steel wheel
  ])('%j is a Straight Flush', (ids) => {
    expect(evaluateHand(ids).rank).toBe('straightFlush')
  })

  it.each([
    [['TS', 'JS', 'QS', 'KS', 'AS']],
    [['TH', 'JH', 'QH', 'KH', 'AH']],
    [['TD', 'JD', 'QD', 'KD', 'AD']],
    [['TC', 'JC', 'QC', 'KC', 'AC']],
  ])('%j is a Royal Flush', (ids) => {
    expect(evaluateHand(ids).rank).toBe('royalFlush')
  })

  describe('no kickers ride along: near-hands are junk High Card (D1/D2)', () => {
    it.each([
      [['2S', '2H', '2D', '2C', '5S'], 'quads plus a kicker'],
      [['7S', '7H', '7D', '2C'], 'trips plus a kicker'],
      [['9S', '9H', 'TD', 'TC', '3S'], 'two pair plus a kicker'],
      [['KS', 'KH', '4D'], 'pair plus a kicker'],
      [['KS', 'KH', '4D', '7C'], 'pair plus two kickers'],
      [['2S', '3H', '4D', '5C'], 'a 4-card straight'],
      [['2S', '5S', '9S', 'JS'], 'a 4-card flush'],
      [['2S', '3H', '4D', '5C', '7S'], 'a gapped straight'],
      [['2S', '9H'], 'two unmatched cards'],
      [['2S', '9H', 'KD'], 'three unmatched cards'],
      [['2S', '6H', '9D', 'JC', 'KS'], 'five unmatched offsuit cards'],
    ])('%j (%s) is junk High Card', (ids) => {
      const h = evaluateHand(ids)
      expect(h.rank).toBe('highCard')
      expect(h.junk).toBe(true)
    })

    it('junk still sums ALL selected pips (the pip dump)', () => {
      expect(evaluateHand(['2S', '9H', 'KD']).pips).toBe(2 + 9 + 13)
    })
  })

  describe('pips (A=14 on swings)', () => {
    it.each([
      ['2S', 2], ['3S', 3], ['4S', 4], ['5S', 5], ['6S', 6], ['7S', 7], ['8S', 8],
      ['9S', 9], ['TS', 10], ['JS', 11], ['QS', 12], ['KS', 13], ['AS', 14],
    ])('%s is worth %i pips', (id, pips) => {
      expect(evaluateHand([id]).pips).toBe(pips)
    })

    it('sums pips across the selection', () => {
      expect(evaluateHand(['KS', 'KH']).pips).toBe(26)
      expect(evaluateHand(['2S', '2H']).pips).toBe(4)
      expect(evaluateHand(['TS', 'JS', 'QS', 'KS', 'AS']).pips).toBe(60)
    })
  })

  describe('selection errors', () => {
    it('rejects an empty selection', () => {
      expect(() => evaluateHand([])).toThrow()
    })
    it('rejects more than 5 cards', () => {
      expect(() => evaluateHand(['2S', '3S', '4S', '5S', '6S', '7S'])).toThrow()
    })
    it('rejects duplicate cards', () => {
      expect(() => evaluateHand(['2S', '2S'])).toThrow()
    })
  })

  describe('yardage & scatter tables match the GDD', () => {
    const expectedBase: [HandRank, number][] = [
      ['highCard', 40], ['pair', 80], ['twoPair', 130], ['trips', 180],
      ['straight', 230], ['flush', 270], ['fullHouse', 310], ['quads', 360],
      ['straightFlush', 420], ['royalFlush', 500],
    ]
    it.each(expectedBase)('%s base is %i yds', (rank, yds) => {
      expect(BASE_YARDS[rank]).toBe(yds)
    })

    const expectedScatter: [HandRank, number][] = [
      ['highCard', 0], ['pair', 0], ['twoPair', 2], ['trips', 2],
      ['straight', 5], ['flush', 5], ['fullHouse', 8], ['quads', 8],
      ['straightFlush', 12], ['royalFlush', 12],
    ]
    it.each(expectedScatter)('%s scatter is ±%i yds', (rank, s) => {
      expect(SCATTER[rank]).toBe(s)
    })

    it('base yardage strictly increases with hand rank', () => {
      for (let i = 1; i < HAND_ORDER.length; i++) {
        expect(BASE_YARDS[HAND_ORDER[i]!]).toBeGreaterThan(BASE_YARDS[HAND_ORDER[i - 1]!])
      }
    })
  })

  describe('flush family (bunker ban)', () => {
    it.each([['flush'], ['straightFlush'], ['royalFlush']] as [HandRank][])(
      '%s is flush family',
      (rank) => expect(isFlushFamily(rank)).toBe(true),
    )
    it.each([
      ['highCard'], ['pair'], ['twoPair'], ['trips'], ['straight'], ['fullHouse'], ['quads'],
    ] as [HandRank][])('%s is not flush family', (rank) => {
      expect(isFlushFamily(rank)).toBe(false)
    })
  })
})
