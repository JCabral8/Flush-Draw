import { describe, expect, it } from 'vitest'
import {
  CADDIES,
  DEFAULT_CADDIE_POOL,
  DEFAULT_CONFIG,
  initRound,
  reduce,
  replay,
  SimError,
  SUNNYVALE_CHAMPIONSHIP,
  SUNNYVALE_RUN,
  TIERS,
  tierConfig,
  validateCourse,
  type CaddieId,
  type SimAction,
  type SimState,
} from '../src/sim/index'
import { baseState, setBall, setGreen, setHand } from './helpers'

const POOL = { caddiePool: [...DEFAULT_CADDIE_POOL] }

function withCaddie(id: CaddieId, over = {}): SimState {
  const st = baseState(over)
  st.caddies = [id]
  return st
}

describe('tour tiers (GDD §12)', () => {
  it('there are 8 tiers with monotonically tightening cuts', () => {
    expect(TIERS.length).toBe(8)
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i]!.cut1).toBeLessThanOrEqual(TIERS[i - 1]!.cut1)
      expect(TIERS[i]!.cut2).toBeLessThanOrEqual(TIERS[i - 1]!.cut2)
    }
  })

  it('tier difficulty never loosens the short side (D15)', () => {
    for (const t of TIERS) {
      expect(t.fringeWindow).toBeLessThanOrEqual(20)
      expect(t.gimmeFt).toBeLessThanOrEqual(3)
      expect(t.windStrength).toBeGreaterThanOrEqual(0.15)
      expect(t.reshufflePenalty).toBeGreaterThanOrEqual(1)
    }
  })

  it('tierConfig builds a 27-hole run config with cuts and caddies', () => {
    const cfg = tierConfig(1)
    expect(cfg.cuts).toEqual([
      { afterHole: 9, maxToPar: 1 },
      { afterHole: 18, maxToPar: 1 },
    ])
    expect(cfg.caddiePool.length).toBeGreaterThanOrEqual(10)
    expect(() => tierConfig(9)).toThrow()
  })

  it('the 27-hole Sunnyvale run validates; championship is par 36', () => {
    expect(validateCourse(SUNNYVALE_RUN)).toEqual([])
    expect(SUNNYVALE_CHAMPIONSHIP.reduce((a, h) => a + h.par, 0)).toBe(36)
    expect(SUNNYVALE_CHAMPIONSHIP.filter((h) => h.pinBias === 'back').length).toBe(3)
  })
})

describe('ceremonies & caddie picks', () => {
  it('a run with a caddie pool opens in ceremony with rarity-rolled offers', () => {
    const st = initRound('cer', SUNNYVALE_RUN, { ...DEFAULT_CONFIG, ...POOL })
    expect(st.phase).toBe('ceremony')
    expect(st.hole).toBeNull()
    expect(st.offers.length).toBe(3)
    expect(new Set(st.offers).size).toBe(3)
  })

  it('you must pick at run start; the pick starts hole 1', () => {
    let st = initRound('cer2', SUNNYVALE_RUN, { ...DEFAULT_CONFIG, ...POOL })
    expect(() => reduce(st, { type: 'caddie', pick: null })).toThrow(/pick a caddie/)
    const pick = st.offers[0]!
    st = reduce(st, { type: 'caddie', pick })
    expect(st.caddies).toEqual([pick])
    expect(st.phase).toBe('swing')
    expect(st.hole!.index).toBe(0)
    expect(st.offers).toEqual([])
  })

  it('rejects picks not on offer and play actions during ceremony', () => {
    const st = initRound('cer3', SUNNYVALE_RUN, { ...DEFAULT_CONFIG, ...POOL })
    const notOffered = DEFAULT_CADDIE_POOL.find((id) => !st.offers.includes(id))!
    expect(() => reduce(st, { type: 'caddie', pick: notOffered })).toThrow(/not on offer/)
    expect(() => reduce(st, { type: 'swing', cards: [st.hand[0]!] })).toThrow(/pick a caddie/)
    expect(() => reduce(st, { type: 'reroll', club: 'sevenIron' })).toThrow(/pick a caddie/)
  })

  it('caddie actions replay deterministically', () => {
    const run = (): SimState => {
      let st = initRound('cer4', SUNNYVALE_RUN, { ...DEFAULT_CONFIG, ...POOL })
      st = reduce(st, { type: 'caddie', pick: st.offers[1]! })
      st = reduce(st, { type: 'swing', cards: [st.hand[0]!] })
      return st
    }
    expect(run()).toEqual(run())
  })
})

describe('cut lines', () => {
  function finishNinth(st: SimState): SimState {
    // Eight holes are already on the card; hole out the 9th with a gimme.
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    return reduce(st, { type: 'swing', cards: ['2S', '2H'] })
  }

  it('making the cut opens the caddie yard', () => {
    let st = initRound('cut1', SUNNYVALE_RUN, {
      ...DEFAULT_CONFIG,
      ...POOL,
      windStrength: 0,
      cuts: [{ afterHole: 9, maxToPar: 6 }],
    })
    st = reduce(st, { type: 'caddie', pick: st.offers[0]! })
    st.scores = [4, 4, 3, 4, 5, 4, 3, 4] // even par through 8
    st.hole!.index = 8
    st = finishNinth(st) // hole 9 in 1: comfortably under +6
    expect(st.phase).toBe('ceremony')
    expect(st.offers.length).toBe(3)
    expect(st.lastEvents.join(' ')).toContain('Made the cut')
    // Offers never include the caddie already on the bag.
    for (const o of st.offers) expect(st.caddies).not.toContain(o)
    // Recruiting (or walking on) tees up hole 10.
    st = reduce(st, { type: 'caddie', pick: null })
    expect(st.hole!.index).toBe(9)
  })

  it('missing the cut ends the run', () => {
    let st = initRound('cut2', SUNNYVALE_RUN, {
      ...DEFAULT_CONFIG,
      ...POOL,
      windStrength: 0,
      cuts: [{ afterHole: 9, maxToPar: 6 }],
    })
    st = reduce(st, { type: 'caddie', pick: st.offers[0]! })
    st.scores = [8, 8, 7, 8, 9, 8, 7, 8] // +27 through 8
    st.hole!.index = 8
    st = finishNinth(st)
    expect(st.phase).toBe('runComplete')
    expect(st.runEnd).toBe('missedCut')
    expect(st.hole).toBeNull()
    expect(() => reduce(st, { type: 'swing', cards: [st.hand[0]!] })).toThrow(/run is over/)
  })

  it('club charges refresh at the next round, not before', () => {
    let st = initRound('cut3', SUNNYVALE_RUN, {
      ...DEFAULT_CONFIG,
      ...POOL,
      windStrength: 0,
      cuts: [{ afterHole: 9, maxToPar: 20 }],
    })
    st = reduce(st, { type: 'caddie', pick: st.offers[0]! })
    // Burn a 3-Wood charge on hole 9.
    st.scores = [4, 4, 3, 4, 5, 4, 3, 4]
    st.hole!.index = 8
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'], club: 'threeWood' })
    expect(st.clubCharges.threeWood).toBe(2)
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] }) // cut made → ceremony
    expect(st.phase).toBe('ceremony')
    expect(st.clubCharges.threeWood).toBe(2) // not yet
    st = reduce(st, { type: 'caddie', pick: null }) // hole 10 tees off
    expect(st.clubCharges.threeWood).toBe(3) // fresh round, fresh charges
  })

  it('a full 27-hole run completes with runEnd "complete"', () => {
    let st = initRound('cut4', SUNNYVALE_RUN, { ...DEFAULT_CONFIG, windStrength: 0 }) // no cuts, no caddies
    st.scores = SUNNYVALE_RUN.slice(0, 26).map((h) => h.par)
    st.hole!.index = 26
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] })
    expect(st.phase).toBe('runComplete')
    expect(st.runEnd).toBe('complete')
    expect(st.scores.length).toBe(27)
  })
})

describe('caddie effects', () => {
  it('Old Man Wren: all-red hands +20%', () => {
    const st = withCaddie('wren')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5H', '5D', '6S', '6C'])
    const red = reduce(st, { type: 'swing', cards: ['5H', '5D'] })
    expect(300 - red.hole!.ball!.remaining).toBe(108) // 90 × 1.2
    const black = reduce(st, { type: 'swing', cards: ['6S', '6C'] })
    expect(300 - black.hole!.ball!.remaining).toBe(92) // no bonus
  })

  it('Two-Glove Tony: pairs +15 yds (pairs only)', () => {
    const st = withCaddie('tony')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D', '7C'])
    const pair = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(300 - pair.hole!.ball!.remaining).toBe(105) // 90 + 15
    const single = reduce(st, { type: 'swing', cards: ['7C'] })
    expect(300 - single.hole!.ball!.remaining).toBe(47) // untouched
  })

  it('Bag-of-Tees Bobby: tee is ×1.15', () => {
    const st = withCaddie('bobby')
    setBall(st, { remaining: 300, lie: 'tee', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    const out = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(300 - out.hole!.ball!.remaining).toBe(103) // 90 × 1.15 = 103.4999… in floats → 103
  })

  it('Weatherbeaten Wanda: boost 20%, drag stays 15%', () => {
    const st = withCaddie('wanda', { windStrength: 0.15 })
    setBall(st, {
      remaining: 300,
      lie: 'fairway',
      pin: 'center',
      effLength: 310,
      wind: { boost: 'H', drag: 'S' },
    })
    setHand(st, ['5H', '5D', '6S', '6C'])
    const boosted = reduce(st, { type: 'swing', cards: ['5H', '5D'] })
    expect(300 - boosted.hole!.ball!.remaining).toBe(99) // 90 × (1 + .2/2) — one H of two

    const dragged = reduce(st, { type: 'swing', cards: ['6S', '6C'] })
    expect(300 - dragged.hole!.ball!.remaining).toBe(85) // 92 × (1 − .15/2) — one S of two
  })

  it('Silent Sam: no wind at all', () => {
    const st = withCaddie('silentSam', { windStrength: 0.15 })
    setBall(st, {
      remaining: 300,
      lie: 'fairway',
      pin: 'center',
      effLength: 310,
      wind: { boost: 'H', drag: 'S' },
    })
    setHand(st, ['5H', '5D'])
    const out = reduce(st, { type: 'swing', cards: ['5H', '5D'] })
    expect(300 - out.hole!.ball!.remaining).toBe(90) // flat 90 despite full heart boost
  })

  it('Silent Sam: an empty deck ends the run instead of reshuffling', () => {
    let st = withCaddie('silentSam')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    st.deck = []
    st.discard = ['2S', '2H', '2D']
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(st.phase).toBe('runComplete')
    expect(st.runEnd).toBe('deckDead')
  })

  it('Lucky Penny: first reshuffle each round is free, second is not', () => {
    let st = withCaddie('penny')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    st.deck = []
    st.discard = ['2S', '2H', '2D', '3S', '3H', '3D', '4S', '4H', '4D', '6S', '6H']
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(st.hole!.strokes).toBe(1) // no penalty
    expect(st.lastEvents.join(' ')).toContain('Lucky Penny')
    // Force a second reshuffle this round.
    st.deck = []
    st.discard = st.hand.splice(0, 5)
    setBall(st, { remaining: 200, lie: 'fairway', pin: 'center', effLength: 310 })
    const before = st.hole!.strokes
    st = reduce(st, { type: 'swing', cards: [st.hand[0]!] })
    expect(st.hole!.strokes).toBe(before + 2) // stroke + reshuffle penalty
  })

  it('The Greenskeeper: fringe putts are flat', () => {
    const st = withCaddie('greenskeeper')
    setBall(st, { remaining: 10, side: 'long', lie: 'fringe', pin: 'center', effLength: 310 })
    setHand(st, ['TS'])
    const out = reduce(st, { type: 'putt', cards: ['TS'] }) // 30 ft, F3 → holed exactly
    expect(out.scores.length).toBe(1)
  })

  it('Marguerite: played 2s-4s come home; punch discards do not', () => {
    let st = withCaddie('marguerite')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '3S', '9D', '9C', 'KS', 'QD', 'JC'])
    st = reduce(st, { type: 'swing', cards: ['2S', '3S'] }) // junk 45
    expect(st.hand).toContain('2S')
    expect(st.hand).toContain('3S')
    expect(st.discard).not.toContain('2S')
    // Punch Iron discards are deliberate, not played: lows really leave.
    st = reduce(st, { type: 'punch', club: 'punchIron', discard: ['2S', '3S'] })
    expect(st.hand).not.toContain('2S')
    expect(st.discard).toContain('2S')
  })

  it('The Nephew: +1 club charge on the round refresh', () => {
    let st = initRound('nephew', SUNNYVALE_RUN, {
      ...DEFAULT_CONFIG,
      ...POOL,
      windStrength: 0,
      cuts: [{ afterHole: 9, maxToPar: 20 }],
    })
    // Force the nephew into the bag regardless of the offer roll.
    st = reduce(st, { type: 'caddie', pick: st.offers[0]! })
    st.caddies = ['nephew']
    st.scores = [4, 4, 3, 4, 5, 4, 3, 4]
    st.hole!.index = 8
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] })
    st = reduce(st, { type: 'caddie', pick: null })
    expect(st.clubCharges.threeWood).toBe(4) // 3 + 1
    expect(st.clubCharges.punchIron).toBe(5)
  })

  it('The Statistician: the sim already exposes the next draw', () => {
    const st = withCaddie('statistician')
    expect(st.deck[st.deck.length - 1]).toBeDefined() // UI reads this
  })
})

describe('save/resume: the whole run replays from its action log', () => {
  it('a run with ceremony, clubs, and strokes rebuilds exactly', () => {
    const cfg = { ...DEFAULT_CONFIG, ...POOL, cuts: [{ afterHole: 9, maxToPar: 6 }] }
    const log: SimAction[] = []
    let st = initRound('resume-me', SUNNYVALE_RUN, cfg)
    const act = (a: SimAction): void => {
      st = reduce(st, a)
      log.push(a)
    }
    act({ type: 'caddie', pick: st.offers[2]! })
    act({ type: 'punch', club: 'punchIron', discard: st.hand.slice(0, 2) })
    act({ type: 'swing', cards: [st.hand[0]!], club: 'threeWood' })
    act({ type: 'swing', cards: [st.hand[1]!] })
    const resumed = replay('resume-me', SUNNYVALE_RUN, log, cfg)
    expect(resumed).toEqual(st)
  })
})

describe('caddie data', () => {
  it('every caddie has hand-written flavor and effect text', () => {
    for (const c of Object.values(CADDIES)) {
      expect(c.name.length).toBeGreaterThan(2)
      expect(c.effect.length).toBeGreaterThan(10)
      expect(c.flavor.length).toBeGreaterThan(0)
      expect(c.effect.toLowerCase()).not.toContain('lorem')
    }
  })
})

describe('Ironwood Pines (M5c)', () => {
  it('front 9, back 9 and championship all validate; run is 27 holes', async () => {
    const { IRONWOOD_FRONT_9, IRONWOOD_BACK_9, IRONWOOD_CHAMPIONSHIP, IRONWOOD_RUN, COURSES } =
      await import('../src/sim/index')
    expect(validateCourse(IRONWOOD_RUN)).toEqual([])
    expect(IRONWOOD_FRONT_9.reduce((a, h) => a + h.par, 0)).toBe(36)
    expect(IRONWOOD_BACK_9.reduce((a, h) => a + h.par, 0)).toBe(36)
    expect(IRONWOOD_CHAMPIONSHIP.reduce((a, h) => a + h.par, 0)).toBe(36)
    expect(IRONWOOD_CHAMPIONSHIP.filter((h) => h.pinBias === 'back').length).toBe(3)
    expect(Object.keys(COURSES).length).toBe(2)
    for (const h of IRONWOOD_RUN) {
      expect(h.flavor.length).toBeGreaterThan(10)
    }
  })

  it('a tour run plays on Ironwood', async () => {
    const { IRONWOOD_RUN } = await import('../src/sim/index')
    let st = initRound('iron-run', IRONWOOD_RUN, { ...DEFAULT_CONFIG, windStrength: 0 })
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 340 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] })
    expect(st.scores).toEqual([1])
    expect(st.hole!.index).toBe(1)
  })
})
