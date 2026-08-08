import { describe, expect, it } from 'vitest'
import {
  CLUBS,
  DEFAULT_BAG,
  initRound,
  previewSwingAction,
  putterMaxCards,
  reduce,
  SimError,
  SUNNYVALE_FRONT_9,
  DEFAULT_CONFIG,
} from '../src/sim/index'
import { allCardsOf, baseState, setBall, setHand } from './helpers'

describe('the bag', () => {
  it('the launch bag is 5 clubs + Blade', () => {
    expect(DEFAULT_BAG.length).toBe(5)
    expect(DEFAULT_CONFIG.bag).toEqual([...DEFAULT_BAG])
    expect(DEFAULT_CONFIG.putter).toBe('blade')
  })

  it('finite charges are seeded at round start; passives are not tracked', () => {
    const st = baseState()
    expect(st.clubCharges.threeWood).toBe(3)
    expect(st.clubCharges.sevenIron).toBe(3)
    expect(st.clubCharges.pitchingWedge).toBe(4)
    expect(st.clubCharges.punchIron).toBe(4)
    expect(st.clubCharges.driver).toBeUndefined() // per-hole only
  })

  it('rejects a bag of more than 5 clubs', () => {
    expect(() =>
      initRound('x', SUNNYVALE_FRONT_9, {
        ...DEFAULT_CONFIG,
        bag: ['driver', 'threeWood', 'sevenIron', 'pitchingWedge', 'punchIron', 'sandWedge'],
      }),
    ).toThrow(SimError)
  })

  it('rejects a club that is not in the bag', () => {
    const st = baseState({ bag: ['threeWood'] })
    setBall(st, { remaining: 300, lie: 'tee', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    expect(() => reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'driver' })).toThrow(
      /not in the bag/,
    )
  })

  it('Blade putter math', () => {
    expect(putterMaxCards('blade', 2)).toBe(3)
  })
})

describe('Driver: ×1.25, tee only, once per hole', () => {
  it('multiplies before the lie multiplier', () => {
    let st = baseState()
    setBall(st, { remaining: 300, lie: 'tee', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    const p = previewSwingAction(st, ['5S', '5D'], 'driver')
    // 90 × 1.25 × 1.1 = 123.75 → 124
    expect(p.min).toBe(124)
    expect(p.max).toBe(124)
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'driver' })
    expect(st.hole!.ball!.remaining).toBe(176)
  })

  it('refuses off the tee', () => {
    const st = baseState()
    setBall(st, { remaining: 200, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    expect(() => reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'driver' })).toThrow(
      /only works from tee/,
    )
  })

  it('refuses a second use on the same hole, resets next hole', () => {
    let st = baseState()
    setBall(st, { remaining: 500, lie: 'tee', pin: 'center', effLength: 520 })
    setHand(st, ['5S', '5D'])
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'driver' })
    st.hole!.ball = { remaining: st.hole!.ball!.remaining, side: 'short', lie: 'tee' } // pretend
    setHand(st, ['6S', '6D'])
    expect(() => reduce(st, { type: 'swing', cards: ['6S', '6D'], club: 'driver' })).toThrow(
      /spent for this hole/,
    )
    // Hole out; next hole's tee allows the Driver again.
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 520 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] })
    expect(st.hole!.index).toBe(1)
    setBall(st, { remaining: 150, lie: 'tee', pin: 'center', effLength: 150 })
    setHand(st, ['5S', '5D'])
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'driver' })
    expect(st.lastEvents.join(' ')).toContain('Driver')
  })
})

describe('3-Wood: +40 flat, 3 per round', () => {
  it('adds after multipliers and burns a charge', () => {
    let st = baseState()
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    const p = previewSwingAction(st, ['5S', '5D'], 'threeWood')
    expect(p.min).toBe(130) // 90 + 40
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'threeWood' })
    expect(st.hole!.ball!.remaining).toBe(170)
    expect(st.clubCharges.threeWood).toBe(2)
  })

  it('runs out after 3 uses', () => {
    let st = baseState()
    for (let i = 0; i < 3; i++) {
      setBall(st, { remaining: 400, lie: 'fairway', pin: 'center', effLength: 480 })
      setHand(st, ['5S', '5D'])
      st = reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'threeWood' })
    }
    expect(st.clubCharges.threeWood).toBe(0)
    setBall(st, { remaining: 400, lie: 'fairway', pin: 'center', effLength: 480 })
    setHand(st, ['5S', '5D'])
    expect(() => reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'threeWood' })).toThrow(
      /out of charges/,
    )
  })
})

describe('Pitching Wedge: halve, and the long side sticks', () => {
  it('halves the final distance (round down)', () => {
    let st = baseState()
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '6D']) // junk 51 → halve → 25
    const p = previewSwingAction(st, ['5S', '6D'], 'pitchingWedge')
    expect(p.min).toBe(25)
    st = reduce(st, { type: 'swing', cards: ['5S', '6D'], club: 'pitchingWedge' })
    expect(st.hole!.ball!.remaining).toBe(275)
  })

  it('a long miss within 20 yds lands ON the green, downhill', () => {
    let st = baseState()
    setBall(st, { remaining: 30, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '9D', 'KC', 'QH']) // junk 40+36=76 → halve 38 → 8 long
    st = reduce(st, { type: 'swing', cards: ['2S', '9D', 'KC', 'QH'], club: 'pitchingWedge' })
    expect(st.phase).toBe('putt')
    expect(st.hole!.green).toEqual({ distFt: 24, downhill: true })
    expect(st.lastStroke).toMatchObject({ kind: 'swing', outcome: 'green' })
  })

  it('past 20 long is still out of bounds — the wall stands', () => {
    let st = baseState()
    setBall(st, { remaining: 10, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['KS', 'KD']) // 106 → halve 53 → 43 long
    st = reduce(st, { type: 'swing', cards: ['KS', 'KD'], club: 'pitchingWedge' })
    expect(st.lastStroke).toMatchObject({ kind: 'swing', outcome: 'oob' })
    expect(st.hole!.strokes).toBe(2)
  })
})

describe('7-Iron: reroll the hand', () => {
  it('replaces the whole hand without costing a stroke', () => {
    let st = baseState()
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    const before = st.hand.slice()
    st = reduce(st, { type: 'reroll', club: 'sevenIron' })
    expect(st.hand.length).toBe(7)
    expect(st.hand).not.toEqual(before)
    expect(st.hole!.strokes).toBe(0)
    expect(st.clubCharges.sevenIron).toBe(2)
    expect(allCardsOf(st).length).toBe(52)
  })

  it('is refused on the green and when out of charges', () => {
    let st = baseState()
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    st = reduce(st, { type: 'reroll', club: 'sevenIron' })
    st = reduce(st, { type: 'reroll', club: 'sevenIron' })
    st = reduce(st, { type: 'reroll', club: 'sevenIron' })
    expect(() => reduce(st, { type: 'reroll', club: 'sevenIron' })).toThrow(/out of charges/)
    const st2 = baseState()
    st2.phase = 'putt'
    st2.hole!.green = { distFt: 30, downhill: false }
    st2.hole!.ball = null
    expect(() => reduce(st2, { type: 'reroll', club: 'sevenIron' })).toThrow(/green/)
  })

  it('only the 7-Iron rerolls', () => {
    const st = baseState()
    expect(() => reduce(st, { type: 'reroll', club: 'driver' })).toThrow(SimError)
  })
})

describe('Punch Iron: discard 2, draw 3', () => {
  it('grows the hand to 8 and conserves the deck', () => {
    let st = baseState()
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    const targets = st.hand.slice(0, 2)
    st = reduce(st, { type: 'punch', club: 'punchIron', discard: targets })
    expect(st.hand.length).toBe(8)
    for (const id of targets) expect(st.hand).not.toContain(id)
    expect(st.clubCharges.punchIron).toBe(3)
    expect(allCardsOf(st).length).toBe(52)
    expect(new Set(allCardsOf(st)).size).toBe(52)
  })

  it('demands exactly 2 cards from the hand', () => {
    const st = baseState()
    expect(() =>
      reduce(st, { type: 'punch', club: 'punchIron', discard: [st.hand[0]!] }),
    ).toThrow(/exactly 2/)
    expect(() =>
      reduce(st, { type: 'punch', club: 'punchIron', discard: ['XX', 'YY'] }),
    ).toThrow(SimError)
  })

  it('the rich hand persists until a stroke spends it', () => {
    let st = baseState()
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    st = reduce(st, { type: 'punch', club: 'punchIron', discard: st.hand.slice(0, 2) })
    expect(st.hand.length).toBe(8)
    st = reduce(st, { type: 'swing', cards: [st.hand[0]!] })
    expect(st.hand.length).toBe(7) // drew back to hand size, not 8
  })
})

describe('Sand Wedge: bunkers play honest (passive)', () => {
  it('bunker is ×1.0 and allows flushes when carried', () => {
    const bag = { bag: ['sandWedge'] as ('sandWedge')[] }
    let st = baseState(bag)
    setBall(st, { remaining: 300, lie: 'bunker', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '5S', '7S', 'JS', 'KS'])
    const p = previewSwingAction(st, ['2S', '5S', '7S', 'JS', 'KS'])
    expect(p.min).toBe(303) // 270+38 flat, no 0.6 mult, ±5 scatter
    expect(p.max).toBe(313)
    st = reduce(st, { type: 'swing', cards: ['2S', '5S', '7S', 'JS', 'KS'] })
    expect(st.hole!.strokes).toBe(1)
  })

  it('without it the bunker still bites', () => {
    const st = baseState()
    setBall(st, { remaining: 300, lie: 'bunker', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '5S', '7S', 'JS', 'KS'])
    expect(() => reduce(st, { type: 'swing', cards: ['2S', '5S', '7S', 'JS', 'KS'] })).toThrow(
      /bunker/,
    )
  })
})

describe('clubs & determinism', () => {
  it('club actions replay identically', () => {
    const play = (): ReturnType<typeof initRound> => {
      let st = initRound('club-replay', SUNNYVALE_FRONT_9)
      st = reduce(st, { type: 'punch', club: 'punchIron', discard: st.hand.slice(0, 2) })
      st = reduce(st, { type: 'reroll', club: 'sevenIron' })
      st = reduce(st, { type: 'swing', cards: [st.hand[0]!], club: 'threeWood' })
      return st
    }
    expect(play()).toEqual(play())
  })

  it('club charge state survives into the next hole', () => {
    let st = baseState()
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'threeWood' })
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] }) // holed, hole 2 starts
    expect(st.hole!.index).toBe(1)
    expect(st.clubCharges.threeWood).toBe(2) // per-round, not per-hole
  })

  it('every club spec is coherent', () => {
    for (const spec of Object.values(CLUBS)) {
      expect(spec.name.length).toBeGreaterThan(2)
      if (spec.kind === 'passive') expect(spec.charges).toBe(Infinity)
      if (Number.isFinite(spec.charges)) expect(spec.charges).toBeGreaterThan(0)
    }
  })
})
