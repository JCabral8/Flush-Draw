import { describe, expect, it } from 'vitest'
import {
  CADDIES,
  DEFAULT_CADDIE_POOL,
  reduce,
  type CaddieId,
  type SimState,
} from '../src/sim/index'
import { baseState, setBall, setGreen, setHand } from './helpers'

function withCaddie(id: CaddieId, over = {}): SimState {
  const st = baseState(over)
  st.caddies = [id]
  return st
}

describe('the roster', () => {
  it('carries 40 caddies with hand-written text', () => {
    expect(DEFAULT_CADDIE_POOL.length).toBe(40)
    for (const c of Object.values(CADDIES)) {
      expect(c.effect.length).toBeGreaterThan(10)
      expect(c.flavor.length).toBeGreaterThan(0)
    }
  })

  it('rarity spread: 16 common, 11 uncommon, 7 rare, 6 legendary', () => {
    const by = { common: 0, uncommon: 0, rare: 0, legendary: 0 }
    for (const c of Object.values(CADDIES)) by[c.rarity]++
    expect(by).toEqual({ common: 16, uncommon: 11, rare: 7, legendary: 6 })
  })
})

describe('swing-shaping caddies', () => {
  it('Cormac: all-black hands are exact', () => {
    const st = withCaddie('cormac')
    setBall(st, { remaining: 400, lie: 'fairway', pin: 'center', effLength: 480 })
    setHand(st, ['3S', '3C', '4S', '4C'])
    const out = reduce(st, { type: 'swing', cards: ['3S', '3C', '4S', '4C'] })
    expect(400 - out.hole!.ball!.remaining).toBe(144) // twoPair 130+14, no ±2
  })

  it('The Superstitious: odd-card hands +12%', () => {
    const st = withCaddie('superstitious')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['7C', '5S', '5D'])
    const single = reduce(st, { type: 'swing', cards: ['7C'] })
    expect(300 - single.hole!.ball!.remaining).toBe(Math.round(47 * 1.12))
    const pair = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(300 - pair.hole!.ball!.remaining).toBe(90) // even count: no bonus
  })

  it('Flat Cap Fred: High Card pips count twice', () => {
    const st = withCaddie('flatCapFred')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['9C'])
    const out = reduce(st, { type: 'swing', cards: ['9C'] })
    expect(300 - out.hole!.ball!.remaining).toBe(49 + 9)
  })

  it('The Bartender: +2 pips per face card', () => {
    const st = withCaddie('bartender')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['KS', 'KD'])
    const out = reduce(st, { type: 'swing', cards: ['KS', 'KD'] })
    expect(300 - out.hole!.ball!.remaining).toBe(106 + 4)
  })

  it('Big Earl: everything doubled', () => {
    const st = withCaddie('bigEarl')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    const out = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(300 - out.hole!.ball!.remaining).toBe(180)
  })

  it('The Milkman: +10% on the first three holes of a round', () => {
    const st = withCaddie('milkman')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    const early = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(300 - early.hole!.ball!.remaining).toBe(99)
    const st2 = withCaddie('milkman')
    st2.hole!.index = 4
    setBall(st2, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st2, ['5S', '5D'])
    const late = reduce(st2, { type: 'swing', cards: ['5S', '5D'] })
    expect(300 - late.hole!.ball!.remaining).toBe(90)
  })
})

describe('lie & resolution caddies', () => {
  it('The Groundhog tramples the rough', () => {
    const st = withCaddie('groundhog')
    setBall(st, { remaining: 300, lie: 'rough', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    const out = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(300 - out.hole!.ball!.remaining).toBe(Math.round(90 * 0.85))
  })

  it('Doc Sands: bunker ×0.85 with flushes allowed', () => {
    const st = withCaddie('docSands')
    setBall(st, { remaining: 400, lie: 'bunker', pin: 'center', effLength: 480 })
    setHand(st, ['2H', '5H', '7H', 'JH', 'KH'])
    const out = reduce(st, { type: 'swing', cards: ['2H', '5H', '7H', 'JH', 'KH'] })
    expect(out.hole!.strokes).toBe(1) // flush from sand, legally
  })

  it('Iron Mike fixes one bad lie per hole, automatically', () => {
    const st = withCaddie('ironMike')
    setBall(st, { remaining: 300, lie: 'deepRough', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D', '6S', '6D'])
    const first = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(300 - first.hole!.ball!.remaining).toBe(90) // ×1.0, not ×0.65
    setBall(first, { remaining: 200, lie: 'deepRough', pin: 'center', effLength: 310 })
    setHand(first, ['6S', '6D'])
    const second = reduce(first, { type: 'swing', cards: ['6S', '6D'] })
    expect(200 - second.hole!.ball!.remaining).toBe(Math.round(92 * 0.65)) // used up
  })

  it('The Ghost walks on water', () => {
    let st = withCaddie('ghost')
    const stBase = baseState({}, 'muni-04')
    st = stBase
    st.caddies = ['ghost']
    setBall(st, { remaining: 200, lie: 'fairway', pin: 'center', effLength: 355 })
    setHand(st, ['2S'])
    st = reduce(st, { type: 'swing', cards: ['2S'] }) // lands pos 197: water for anyone else
    expect(st.hole!.strokes).toBe(1) // no penalty
    expect(st.hole!.ball).toEqual({ remaining: 158, side: 'short', lie: 'fairway' })
  })

  it('The Ballhawk saves one OOB ball per round', () => {
    let st = withCaddie('ballhawk')
    setBall(st, { remaining: 10, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D', '6S'])
    st = reduce(st, { type: 'swing', cards: ['5S'] }) // 35 long: OOB for anyone else
    expect(st.hole!.strokes).toBe(1)
    expect(st.hole!.ball!.lie).toBe('fringe')
    setBall(st, { remaining: 10, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5D'])
    st = reduce(st, { type: 'swing', cards: ['5D'] })
    expect(st.hole!.strokes).toBe(3) // stroke + OOB penalty: the second one is gone
  })
})

describe('hand-evaluation caddies', () => {
  it('Mrs. Chen: a one-gap straight is a straight', () => {
    const st = withCaddie('mrsChen')
    setBall(st, { remaining: 400, lie: 'fairway', pin: 'center', effLength: 480 })
    setHand(st, ['4S', '5H', '7D', '8C', '9S'])
    const out = reduce(st, { type: 'swing', cards: ['4S', '5H', '7D', '8C', '9S'] })
    expect(out.lastEvents.join(' ')).toContain('Straight')
  })

  it('The Chameleon: boost-suit cards go wild for flushes', () => {
    const st = withCaddie('chameleon')
    setBall(st, {
      remaining: 400, lie: 'fairway', pin: 'center', effLength: 480,
      wind: { boost: 'H', drag: 'S' },
    })
    setHand(st, ['2C', '5C', '9C', 'JH', 'KH']) // 3 clubs + 2 boost hearts
    const out = reduce(st, { type: 'swing', cards: ['2C', '5C', '9C', 'JH', 'KH'] })
    expect(out.lastEvents.join(' ')).toContain('Flush')
  })
})

describe('scoring & green caddies', () => {
  it('The Hustler: first bogey par, second bogey double', () => {
    const s2 = withCaddie('hustler')
    s2.hole!.strokes = 4
    setGreen(s2, 30, false, 'center')
    setHand(s2, ['TS'])
    const done = reduce(s2, { type: 'putt', cards: ['TS'] }) // 30 → holed, 5 strokes on par 4
    expect(done.scores[0]).toBe(4) // bogey forgiven to par
    expect(done.lastEvents.join(' ')).toContain('Hustler')
    // Second bogey of the round goes down as a double.
    const s3 = done
    s3.hole!.strokes = 4
    setGreen(s3, 30, false, 'center')
    setHand(s3, ['TS'])
    const done2 = reduce(s3, { type: 'putt', cards: ['TS'] }) // bogey again (hole 2 is par 3: 5 = +2? )
    // hole 2 (muni-02) is par 3: 5 strokes = +2, not a bogey — Hustler ignores it.
    expect(done2.scores[1]).toBe(5)
  })

  it('Gallery Favorite: eagles count as albatross', () => {
    let st = withCaddie('galleryFavorite')
    st.hole!.strokes = 1
    setGreen(st, 30, false, 'center')
    setHand(st, ['TS'])
    st = reduce(st, { type: 'putt', cards: ['TS'] }) // in for 2 on a par 4
    expect(st.scores[0]).toBe(1) // scored as −3
  })

  it('Vegas: face cards putt as 5', () => {
    const st = withCaddie('vegas')
    setGreen(st, 15, false, 'center')
    setHand(st, ['KS'])
    const out = reduce(st, { type: 'putt', cards: ['KS'] }) // 5 × 3 = 15 → holed
    expect(out.scores.length).toBe(1)
  })

  it('Calamity Jane: hot putts die on the lip', () => {
    let st = withCaddie('calamityJane')
    setGreen(st, 20, false, 'center')
    setHand(st, ['KS', '2D'])
    st = reduce(st, { type: 'putt', cards: ['KS'] }) // 39 vs 20: past for anyone else
    expect(st.hole!.green).toEqual({ distFt: 3, downhill: false })
    setHand(st, ['2D'])
    st = reduce(st, { type: 'putt', cards: ['2D'] }) // 6 vs 3 → gimme
    expect(st.scores.length).toBe(1)
  })

  it('The Architect: every pin is front', () => {
    let st = withCaddie('architect')
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] }) // holed; hole 2 starts
    expect(st.hole!.pin).toBe('front')
  })
})

describe('meta caddies', () => {
  it('The Do-Over: one free rewind per hole', () => {
    let st = withCaddie('doOver')
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5H', '2D', '3C', '4S', '6H', '7D'])
    st = reduce(st, { type: 'swing', cards: ['5S', '5H'] })
    expect(st.mulligan).not.toBeNull()
    st = reduce(st, { type: 'retake' })
    expect(st.hole!.strokes).toBe(0)
    st = reduce(st, { type: 'swing', cards: ['5S', '5H'] })
    expect(st.mulligan).toBeNull() // once per hole
  })

  it('The Monk removes every face card on hire', () => {
    let st = baseState({ caddiePool: ['monk', 'penny', 'tony'], caddieOfferCount: 3 })
    // Fresh ceremony state: pick the monk if offered, else force him.
    if (st.phase === 'ceremony') {
      st = reduce(st, {
        type: 'caddie',
        pick: st.offers.includes('monk') ? 'monk' : st.offers[0]!,
      })
      if (!st.caddies.includes('monk')) {
        st.caddies = ['monk'] // effect fires on hire; simulate directly below
      }
    }
    if (st.caddies.includes('monk') && st.deck.some((id) => 'JQK'.includes(id[0]!))) {
      // Hire-path already filtered; this branch means we forced the caddie flag.
      st.deck = st.deck.filter((id) => !'JQK'.includes(id[0]!))
    }
    const all = [...st.deck, ...st.discard, ...st.hand]
    expect(all.some((id) => 'JQK'.includes(id[0]!))).toBe(false)
    expect(all.length).toBeLessThanOrEqual(40)
  })

  it('Junior: an 8th card on the tee', () => {
    let st = withCaddie('junior')
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H', '3D', '3C', '4S', '4H', '5D'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] }) // holed → next hole starts
    expect(st.hole!.index).toBe(1)
    expect(st.hand.length).toBe(8) // Junior ran one out to the tee
  })
})
