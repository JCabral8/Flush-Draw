import { describe, expect, it } from 'vitest'
import {
  CLUBS,
  PUTTERS,
  initRound,
  previewSwingAction,
  reduce,
  replay,
  SimError,
  SUNNYVALE_FRONT_9,
  DEFAULT_CONFIG,
  type ClubId,
  type SimAction,
} from '../src/sim/index'
import { allCardsOf, baseState, setBall, setGreen, setHand } from './helpers'

const bag = (...clubs: ClubId[]): { bag: ClubId[] } => ({ bag: clubs })

describe('the full collection exists and is coherent', () => {
  it('24 clubs, 4 putters, all with flavor', () => {
    expect(Object.keys(CLUBS).length).toBe(24)
    expect(Object.keys(PUTTERS).length).toBe(4)
    for (const c of Object.values(CLUBS)) {
      expect(c.flavor.length).toBeGreaterThan(8)
      expect(c.flavor.toLowerCase()).not.toContain('lorem')
    }
    for (const p of Object.values(PUTTERS)) expect(p.flavor.length).toBeGreaterThan(8)
  })

  it('rejects duplicate clubs in a bag', () => {
    expect(() =>
      initRound('dup', SUNNYVALE_FRONT_9, {
        ...DEFAULT_CONFIG,
        bag: ['driver', 'driver'],
      }),
    ).toThrow(/duplicate/)
  })
})

describe('distance shapers', () => {
  it('Big Bertha: ×1.5, doubled scatter, tee only, once per round', () => {
    const st = baseState(bag('bigBertha'))
    setBall(st, { remaining: 400, lie: 'tee', pin: 'center', effLength: 480 })
    setHand(st, ['5S', '5H', '5D', '2C', '3C'])
    const p = previewSwingAction(st, ['5S', '5H', '5D'], 'bigBertha') // trips 195 ×1.5×1.1
    expect(p.max - p.min).toBe(2 * 2 * 2) // ±2 scatter doubled → ±4
    expect(p.min).toBe(Math.round(195 * 1.5 * 1.1) - 4)
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 480 })
    expect(() => previewSwingAction(st, ['5S', '5H'], 'bigBertha')).toThrow(/tee/)
  })

  it('5-Wood: +25 and half scatter', () => {
    const st = baseState(bag('fiveWood'))
    setBall(st, { remaining: 400, lie: 'fairway', pin: 'center', effLength: 480 })
    setHand(st, ['5S', '5H', '5D'])
    const p = previewSwingAction(st, ['5S', '5H', '5D'], 'fiveWood') // trips ±2 → ±1
    expect(p.max - p.min).toBe(2)
    expect(p.min).toBe(195 + 25 - 1)
  })

  it('2-Iron Stinger: wind cannot touch it (×0.95)', () => {
    const st = baseState(bag('twoIron'), undefined)
    st.config.windStrength = 0.15
    setBall(st, {
      remaining: 300, lie: 'fairway', pin: 'center', effLength: 310,
      wind: { boost: 'H', drag: 'S' },
    })
    setHand(st, ['5H', '5D'])
    const p = previewSwingAction(st, ['5H', '5D'], 'twoIron')
    expect(p.min).toBe(Math.round(90 * 0.95)) // 86, no boost applied
  })

  it('4-Iron: deep rough plays like fairway (restrictions stay)', () => {
    const st = baseState(bag('fourIron'))
    setBall(st, { remaining: 300, lie: 'deepRough', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5H', '2D', '2C'])
    const p = previewSwingAction(st, ['5S', '5H'], 'fourIron')
    expect(p.min).toBe(90) // no ×0.65
    expect(() => previewSwingAction(st, ['5S', '5H', '2D', '2C'], 'fourIron')).toThrow(/at most 3/)
  })

  it('9-Iron: zero scatter on a flush', () => {
    const st = baseState(bag('nineIron', 'sandWedge'))
    setBall(st, { remaining: 400, lie: 'fairway', pin: 'center', effLength: 480 })
    setHand(st, ['2H', '5H', '7H', 'JH', 'KH'])
    const p = previewSwingAction(st, ['2H', '5H', '7H', 'JH', 'KH'], 'nineIron')
    expect(p.min).toBe(p.max)
  })

  it('Gap Wedge: −30 with a floor of 5', () => {
    const st = baseState(bag('gapWedge'))
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5H', '2D'])
    expect(previewSwingAction(st, ['5S', '5H'], 'gapWedge').min).toBe(60)
    expect(previewSwingAction(st, ['2D'], 'gapWedge').min).toBe(12)
    const st2 = baseState(bag('gapWedge'))
    setBall(st2, { remaining: 300, lie: 'deepRough', pin: 'center', effLength: 310 })
    setHand(st2, ['2D'])
    expect(previewSwingAction(st2, ['2D'], 'gapWedge').min).toBe(5) // 27−30 → floor
  })

  it('One-Iron: exactly 200, one card, no modifiers', () => {
    let st = baseState(bag('oneIron'))
    st.config.windStrength = 0.15
    setBall(st, { remaining: 350, lie: 'deepRough', pin: 'center', effLength: 400 })
    setHand(st, ['2S', '9D'])
    expect(() => previewSwingAction(st, ['2S', '9D'], 'oneIron')).toThrow(/exactly 1/)
    const p = previewSwingAction(st, ['2S'], 'oneIron')
    expect(p.min).toBe(200)
    expect(p.max).toBe(200)
    st = reduce(st, { type: 'swing', cards: ['2S'], club: 'oneIron' })
    expect(st.hole!.ball!.remaining).toBe(150)
  })

  it('Baffing Spoon: cannot pass green-front', () => {
    const st = baseState(bag('baffingSpoon'))
    setBall(st, { remaining: 100, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['KS', 'KH', 'KD']) // trips 219±2 — would sail OOB
    const p = previewSwingAction(st, ['KS', 'KH', 'KD'], 'baffingSpoon')
    expect(p.max).toBe(70) // capped at remaining − 30
    const out = reduce(st, { type: 'swing', cards: ['KS', 'KH', 'KD'], club: 'baffingSpoon' })
    expect(out.phase).toBe('putt') // exactly green-front = the 90 ft edge
    expect(out.hole!.green!.distFt).toBe(90)
  })
})

describe('hand shapers', () => {
  it('Long Iron: straights score one tier up', () => {
    const st = baseState(bag('longIron'))
    setBall(st, { remaining: 400, lie: 'fairway', pin: 'center', effLength: 480 })
    setHand(st, ['2S', '3H', '4D', '5C', '6S'])
    const p = previewSwingAction(st, ['2S', '3H', '4D', '5C', '6S'], 'longIron')
    expect(p.rank).toBe('flush')
    expect(p.effBase).toBe(270 + 20) // flush base + pips
  })

  it('Chipper: a lone card scores as a Pair', () => {
    const st = baseState(bag('chipper'))
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['7S'])
    const p = previewSwingAction(st, ['7S'], 'chipper')
    expect(p.rank).toBe('pair')
    expect(p.min).toBe(87) // 80 + 7
  })

  it('Cleek: one extra card in the rough, but not the bunker', () => {
    const st = baseState(bag('cleek'))
    setBall(st, { remaining: 300, lie: 'rough', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '3H', '4D', '5C', '6S'])
    expect(previewSwingAction(st, ['2S', '3H', '4D', '5C', '6S'], 'cleek').rank).toBe('straight')
    const st2 = baseState(bag('cleek'))
    setBall(st2, { remaining: 300, lie: 'bunker', pin: 'center', effLength: 310 })
    setHand(st2, ['2S', '5S', '7S', 'JS', 'KS'])
    expect(() => previewSwingAction(st2, ['2S', '5S', '7S', 'JS', 'KS'], 'cleek')).toThrow(/bunker/)
  })

  it('Hybrid: one wildcard completes the hand and its pips', () => {
    let st = baseState(bag('hybrid'))
    setBall(st, { remaining: 400, lie: 'fairway', pin: 'center', effLength: 480 })
    setHand(st, ['2S', '3H', '4D', '5C', 'KS'])
    const wild = { id: 'KS', rank: 6, suit: 'S' as const }
    const p = previewSwingAction(st, ['2S', '3H', '4D', '5C', 'KS'], 'hybrid', wild)
    expect(p.rank).toBe('straight')
    expect(p.effBase).toBe(230 + 20) // 2+3+4+5+6 — the wild counts as its declared rank
    st = reduce(st, { type: 'swing', cards: ['2S', '3H', '4D', '5C', 'KS'], club: 'hybrid', wild })
    expect(st.discard).toContain('KS') // the real card is what leaves
    expect(allCardsOf(st).length).toBe(52)
  })

  it('Hybrid: no declaring a duplicate of a selected card, no wild without it', () => {
    const st = baseState(bag('hybrid'))
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', 'KS'])
    expect(() =>
      previewSwingAction(st, ['5S', 'KS'], 'hybrid', { id: 'KS', rank: 5, suit: 'S' }),
    ).toThrow(/duplicate/)
    expect(() =>
      previewSwingAction(st, ['5S', 'KS'], undefined, { id: 'KS', rank: 5, suit: 'H' }),
    ).toThrow(/Hybrid/)
  })
})

describe('resolution shapers & economy clubs', () => {
  it('Niblick: one long swing resolves as if short', () => {
    let st = baseState(bag('niblick'))
    setBall(st, { remaining: 60, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5H']) // 90 → 30 long → with Niblick: as 30 short → green
    st = reduce(st, { type: 'swing', cards: ['5S', '5H'], club: 'niblick' })
    expect(st.phase).toBe('putt')
    expect(st.hole!.green!.distFt).toBe(90)
  })

  it('8-Iron: the highest played card returns', () => {
    let st = baseState(bag('eightIron'))
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5H', 'KD'])
    st = reduce(st, { type: 'swing', cards: ['5S', '5H'], club: 'eightIron' })
    expect(st.hand).toContain('5S') // one of the pair comes back (first of the tied ranks)
    expect(allCardsOf(st).length).toBe(52)
  })

  it('Mashie: peeks the top three, cleared by the next action', () => {
    let st = baseState(bag('mashie'))
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    const top3 = st.deck.slice(-3)
    st = reduce(st, { type: 'peek', club: 'mashie' })
    expect(st.peeked).toEqual(top3)
    expect(st.clubCharges.mashie).toBe(2)
    st = reduce(st, { type: 'swing', cards: [st.hand[0]!] })
    expect(st.peeked).toEqual([])
  })

  it('Persimmon: retake rewinds the stroke; the window closes after one action', () => {
    let st = baseState(bag('persimmon'))
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5H', '2D', '3C', '4S', '6H', '7D'])
    const handBefore = [...st.hand]
    st = reduce(st, { type: 'swing', cards: ['5S', '5H'], club: 'persimmon' })
    expect(st.mulligan).not.toBeNull()
    expect(st.hole!.strokes).toBe(1)
    st = reduce(st, { type: 'retake' })
    expect(st.hole!.strokes).toBe(0)
    expect(st.hole!.ball!.remaining).toBe(300)
    expect(st.hand).toEqual(handBefore)
    expect(st.clubCharges.persimmon).toBe(0) // the charge stays spent
    expect(() => reduce(st, { type: 'retake' })).toThrow(/nothing to retake/)
    // Ordinary swings never open the window.
    st = reduce(st, { type: 'swing', cards: ['5S', '5H'] })
    expect(st.mulligan).toBeNull()
  })

  it('Texas Wedge: putting from the fairway inside 40 yds', () => {
    let st = baseState(bag('texasWedge'))
    setBall(st, { remaining: 35, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['9S', 'QD', '2C'])
    // 105 ft at F4: 9+Q = 21 × 4 = 84 → 21 left. Max 2 cards enforced.
    st = reduce(st, { type: 'putt', cards: ['9S', 'QD'], club: 'texasWedge' })
    expect(st.phase).toBe('putt')
    expect(st.hole!.green!.distFt).toBe(21)
    expect(st.clubCharges.texasWedge).toBe(1)
    const st2 = baseState(bag('texasWedge'))
    setBall(st2, { remaining: 45, lie: 'fairway', pin: 'center', effLength: 310 })
    expect(() => reduce(st2, { type: 'putt', cards: [st2.hand[0]!], club: 'texasWedge' })).toThrow(
      /within 40/,
    )
  })
})

describe('putter variants', () => {
  it('Mallet rounds the roll to the nearest 5 ft', () => {
    const st = baseState({ putter: 'mallet' })
    setGreen(st, 35, false, 'center')
    setHand(st, ['4S'])
    const out = reduce(st, { type: 'putt', cards: ['4S'] }) // 12 → rounds to 10
    expect(out.hole!.green!.distFt).toBe(25)
  })

  it('Belly putter: 6 ft gimme', () => {
    const st = baseState({ putter: 'belly' })
    setGreen(st, 18, false, 'center')
    setHand(st, ['4S'])
    const out = reduce(st, { type: 'putt', cards: ['4S'] }) // 12 vs 18 → 6 short → in
    expect(out.scores.length).toBe(1)
  })

  it('Broomstick: downhill rolls at ×3, not ×4', () => {
    const st = baseState({ putter: 'broomstick' })
    setGreen(st, 30, true, 'center')
    setHand(st, ['TS'])
    const out = reduce(st, { type: 'putt', cards: ['TS'] }) // 10 × 3 = 30 → holed
    expect(out.scores.length).toBe(1)
  })

  it('non-Blade putters do not get the extra card', () => {
    const st = baseState({ putter: 'mallet' })
    setGreen(st, 60, false, 'center')
    setHand(st, ['2S', '3S', '4S'])
    expect(() => reduce(st, { type: 'putt', cards: ['2S', '3S', '4S'] })).toThrow(/at most 2/)
  })
})

describe('new actions replay deterministically', () => {
  it('peek + retake + wild swing rebuild from the log', () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      windStrength: 0,
      bag: ['mashie', 'persimmon', 'hybrid', 'threeWood', 'punchIron'] as ClubId[],
    }
    const log: SimAction[] = []
    let st = initRound('m5-replay', SUNNYVALE_FRONT_9, cfg)
    const act = (a: SimAction): void => {
      st = reduce(st, a)
      log.push(a)
    }
    act({ type: 'peek', club: 'mashie' })
    act({ type: 'swing', cards: [st.hand[0]!], club: 'persimmon' })
    act({ type: 'retake' })
    act({ type: 'swing', cards: [st.hand[1]!] })
    expect(replay('m5-replay', SUNNYVALE_FRONT_9, log, cfg)).toEqual(st)
  })
})
