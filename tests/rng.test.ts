import { describe, expect, it } from 'vitest'
import { chance, nextInt, nextIntIn, nextU32, seedStream, weightedIndex } from '../src/sim/rng'

describe('rng: xorshift128+ streams', () => {
  it('same seed + stream yields the identical sequence', () => {
    const a = seedStream('alpha', 'deck')
    const b = seedStream('alpha', 'deck')
    for (let i = 0; i < 100; i++) expect(nextU32(a)).toBe(nextU32(b))
  })

  it('different seeds diverge', () => {
    const a = seedStream('alpha', 'deck')
    const b = seedStream('beta', 'deck')
    const seqA = Array.from({ length: 10 }, () => nextU32(a))
    const seqB = Array.from({ length: 10 }, () => nextU32(b))
    expect(seqA).not.toEqual(seqB)
  })

  it('different streams of the same seed diverge', () => {
    const a = seedStream('alpha', 'deck')
    const b = seedStream('alpha', 'wind')
    const seqA = Array.from({ length: 10 }, () => nextU32(a))
    const seqB = Array.from({ length: 10 }, () => nextU32(b))
    expect(seqA).not.toEqual(seqB)
  })

  it('near-identical seeds diverge (warmup decorrelates)', () => {
    const a = seedStream('run-1', 'deck')
    const b = seedStream('run-2', 'deck')
    const seqA = Array.from({ length: 10 }, () => nextU32(a))
    const seqB = Array.from({ length: 10 }, () => nextU32(b))
    expect(seqA).not.toEqual(seqB)
  })

  it('state is plain data: a copied state continues identically', () => {
    const a = seedStream('alpha', 'deck')
    nextU32(a)
    const b = structuredClone(a)
    for (let i = 0; i < 50; i++) expect(nextU32(a)).toBe(nextU32(b))
  })

  it('produces 32-bit unsigned integers', () => {
    const s = seedStream('bits', 'deck')
    for (let i = 0; i < 1000; i++) {
      const x = nextU32(s)
      expect(Number.isInteger(x)).toBe(true)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('hits both halves of the 32-bit range', () => {
    const s = seedStream('range', 'deck')
    let high = 0
    for (let i = 0; i < 1000; i++) if (nextU32(s) > 0x7fffffff) high++
    expect(high).toBeGreaterThan(350)
    expect(high).toBeLessThan(650)
  })

  it('nextInt stays in bounds and covers all values', () => {
    const s = seedStream('int', 'deck')
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const x = nextInt(s, 10)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(10)
      seen.add(x)
    }
    expect(seen.size).toBe(10)
  })

  it('nextInt is roughly uniform', () => {
    const s = seedStream('uniform', 'deck')
    const counts = new Array<number>(10).fill(0)
    for (let i = 0; i < 5000; i++) counts[nextInt(s, 10)]!++
    for (const c of counts) {
      expect(c).toBeGreaterThan(380) // expected 500
      expect(c).toBeLessThan(620)
    }
  })

  it('nextInt(1) is always 0', () => {
    const s = seedStream('one', 'deck')
    for (let i = 0; i < 20; i++) expect(nextInt(s, 1)).toBe(0)
  })

  it('nextInt rejects bad bounds', () => {
    const s = seedStream('bad', 'deck')
    expect(() => nextInt(s, 0)).toThrow()
    expect(() => nextInt(s, -1)).toThrow()
    expect(() => nextInt(s, 2.5)).toThrow()
  })

  it('nextIntIn is inclusive of both ends', () => {
    const s = seedStream('incl', 'deck')
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) seen.add(nextIntIn(s, -2, 2))
    expect([...seen].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2])
  })

  it('nextIntIn rejects inverted ranges', () => {
    const s = seedStream('inv', 'deck')
    expect(() => nextIntIn(s, 3, 2)).toThrow()
  })

  it('chance(0) is never true, chance(1) always', () => {
    const s = seedStream('chance', 'deck')
    for (let i = 0; i < 100; i++) expect(chance(s, 0)).toBe(false)
    for (let i = 0; i < 100; i++) expect(chance(s, 1)).toBe(true)
  })

  it('chance(0.5) is near 50/50', () => {
    const s = seedStream('half', 'deck')
    let hits = 0
    for (let i = 0; i < 2000; i++) if (chance(s, 0.5)) hits++
    expect(hits).toBeGreaterThan(850)
    expect(hits).toBeLessThan(1150)
  })

  it('weightedIndex respects zero weights', () => {
    const s = seedStream('weights', 'deck')
    for (let i = 0; i < 200; i++) expect(weightedIndex(s, [0, 1, 0])).toBe(1)
  })

  it('weightedIndex distributes by weight', () => {
    const s = seedStream('weights2', 'deck')
    const counts = [0, 0, 0]
    for (let i = 0; i < 3000; i++) counts[weightedIndex(s, [1, 1, 2])]!++
    expect(counts[2]!).toBeGreaterThan(counts[0]!)
    expect(counts[2]!).toBeGreaterThan(counts[1]!)
    expect(counts[2]!).toBeGreaterThan(1300)
    expect(counts[2]!).toBeLessThan(1700)
  })

  it('weightedIndex rejects empty or negative weights', () => {
    const s = seedStream('weights3', 'deck')
    expect(() => weightedIndex(s, [])).toThrow()
    expect(() => weightedIndex(s, [0, 0])).toThrow()
    expect(() => weightedIndex(s, [-1, 2])).toThrow()
    expect(() => weightedIndex(s, [0.5, 1])).toThrow()
  })
})
