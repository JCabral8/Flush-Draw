import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  initRound,
  previewSwingAction,
  reduce,
  replay,
  scoreName,
  SimError,
  SUNNYVALE_FRONT_9,
  toParString,
  type SimAction,
  type SimState,
} from '../src/sim/index'
import { allCardsOf, baseState, setBall, setGreen, setHand } from './helpers'

describe('round setup', () => {
  it('starts with a shuffled deck, 7 cards in hand, ball on the tee of hole 1', () => {
    const st = baseState()
    expect(st.hand.length).toBe(7)
    expect(st.deck.length).toBe(45)
    expect(st.discard.length).toBe(0)
    expect(st.hole?.index).toBe(0)
    expect(st.hole?.ball?.lie).toBe('tee')
    expect(st.hole?.ball?.remaining).toBe(st.hole?.effLength)
    expect(st.phase).toBe('swing')
  })

  it('wind boost and drag are always distinct suits', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const st = initRound(seed, SUNNYVALE_FRONT_9)
      expect(st.hole!.wind.boost).not.toBe(st.hole!.wind.drag)
    }
  })

  it('pin weights are honored (all-back weights give a back pin)', () => {
    const st = initRound('pins', SUNNYVALE_FRONT_9, {
      ...DEFAULT_CONFIG,
      pinWeights: { front: 0, center: 0, back: 1 },
    })
    expect(st.hole!.pin).toBe('back')
    expect(st.hole!.effLength).toBe(SUNNYVALE_FRONT_9[0]!.length + 12)
  })

  it('windBias and pinBias are honored on authored holes', () => {
    const first = { ...SUNNYVALE_FRONT_9[0]!, windBias: 'C' as const, pinBias: 'front' as const }
    const holes = [first, ...SUNNYVALE_FRONT_9.slice(1)]
    const st = initRound('bias', holes)
    expect(st.hole!.wind.boost).toBe('C')
    expect(st.hole!.pin).toBe('front')
  })

  it('rejects an invalid course', () => {
    expect(() => initRound('x', SUNNYVALE_FRONT_9.slice(0, 8))).toThrow(SimError)
  })

  it('same seed → identical initial state', () => {
    expect(initRound('twin', SUNNYVALE_FRONT_9)).toEqual(initRound('twin', SUNNYVALE_FRONT_9))
  })

  it('different seeds → different deals', () => {
    expect(initRound('one', SUNNYVALE_FRONT_9).hand).not.toEqual(
      initRound('two', SUNNYVALE_FRONT_9).hand,
    )
  })
})

describe('a scripted hole: pair to the green, one putt (eagle)', () => {
  it('plays exactly by the numbers', () => {
    let st = baseState() // muni-01, par 4
    setBall(st, { remaining: 92, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])

    st = reduce(st, { type: 'swing', cards: ['5S', '5D'] }) // 80+10 = 90 exact
    expect(st.phase).toBe('putt')
    expect(st.hole!.green).toEqual({ distFt: 6, downhill: false })
    expect(st.hole!.strokes).toBe(1)
    expect(st.hand.length).toBe(7) // drew back up

    setHand(st, ['2S'])
    st = reduce(st, { type: 'putt', cards: ['2S'] }) // 6 ft exact
    expect(st.scores).toEqual([2])
    expect(st.hole!.index).toBe(1) // advanced to hole 2
    expect(st.lastEvents.join(' ')).toContain('eagle')
  })
})

describe('ball resolution through the engine', () => {
  it('holes out from the fairway inside the 1-yd gimme', () => {
    let st = baseState()
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] }) // 84 → 1 yd → holed
    expect(st.scores).toEqual([1])
    expect(st.lastEvents.join(' ')).toContain('IN THE HOLE')
  })

  it('exactly 30 yds short is the edge of the green (90 ft)', () => {
    let st = baseState()
    setBall(st, { remaining: 114, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] }) // 84 → 30 short
    expect(st.phase).toBe('putt')
    expect(st.hole!.green!.distFt).toBe(90)
  })

  it('31 yds short misses the green and reads the layout lie', () => {
    let st = baseState()
    setBall(st, { remaining: 115, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] }) // 84 → 31 short → pos 279 → rough
    expect(st.phase).toBe('swing')
    expect(st.hole!.ball).toEqual({ remaining: 31, side: 'short', lie: 'rough' })
  })

  it('a back pin makes the green downhill on arrival', () => {
    let st = baseState()
    setBall(st, { remaining: 100, lie: 'fairway', pin: 'back', effLength: 322 })
    setHand(st, ['5S', '5D'])
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'] }) // 90 → 10 short
    expect(st.hole!.green).toEqual({ distFt: 30, downhill: true })
  })

  it('2–20 yds long is the fringe', () => {
    let st = baseState()
    setBall(st, { remaining: 25, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S'])
    st = reduce(st, { type: 'swing', cards: ['2S'] }) // 42 → 17 long
    expect(st.hole!.ball).toEqual({ remaining: 17, side: 'long', lie: 'fringe' })
    expect(st.phase).toBe('swing')
  })

  it('more than 20 yds long is OOB: +1 stroke, stroke-and-distance', () => {
    let st = baseState()
    setBall(st, { remaining: 10, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S'])
    st = reduce(st, { type: 'swing', cards: ['5S'] }) // 45 → 35 long
    expect(st.hole!.strokes).toBe(2)
    expect(st.hole!.ball).toEqual({ remaining: 10, side: 'short', lie: 'fairway' })
    expect(st.lastEvents.join(' ')).toContain('out of bounds')
  })

  it('water costs a stroke and drops at the nearest fairway behind', () => {
    let st = baseState({}, 'muni-04')
    setBall(st, { remaining: 200, lie: 'fairway', pin: 'center', effLength: 355 })
    setHand(st, ['2S'])
    st = reduce(st, { type: 'swing', cards: ['2S'] }) // 42 → pos 197 → water 180-205
    expect(st.hole!.strokes).toBe(2)
    expect(st.hole!.ball).toEqual({ remaining: 176, side: 'short', lie: 'fairway' }) // drop at 179
    expect(st.lastEvents.join(' ')).toContain('water')
  })

  it('a swing from the fringe crosses back toward the cup', () => {
    let st = baseState()
    setBall(st, { remaining: 18, side: 'long', lie: 'fringe', pin: 'center', effLength: 310 })
    setHand(st, ['2S'])
    st = reduce(st, { type: 'swing', cards: ['2S'] }) // 42 × 0.8 = 33.6 → 34 → 16 short
    expect(st.phase).toBe('putt')
    expect(st.hole!.green!.distFt).toBe(48)
  })
})

describe('putting through the engine', () => {
  it('fringe putts convert to the green, always downhill (D7)', () => {
    let st = baseState()
    setBall(st, { remaining: 17, side: 'long', lie: 'fringe', pin: 'center', effLength: 310 })
    setHand(st, ['JS'])
    st = reduce(st, { type: 'putt', cards: ['JS'] }) // 51 ft, ×4 → 44 → 7 left
    expect(st.phase).toBe('putt')
    expect(st.hole!.green).toEqual({ distFt: 7, downhill: true })
    setHand(st, ['2S'])
    st = reduce(st, { type: 'putt', cards: ['2S'] }) // 8 vs 7 → within gimme
    expect(st.scores).toEqual([2])
  })

  it('blowing a putt past turns the green downhill for good', () => {
    let st = baseState()
    setGreen(st, 20, false, 'center')
    setHand(st, ['TS'])
    st = reduce(st, { type: 'putt', cards: ['TS'] }) // 30 vs 20 → 10 past
    expect(st.hole!.green).toEqual({ distFt: 10, downhill: true })
    expect(st.lastEvents.join(' ')).toContain('past')
  })

  it('front-pin uphill putts use ×2.5', () => {
    let st = baseState()
    setGreen(st, 30, false, 'front')
    setHand(st, ['QS'])
    st = reduce(st, { type: 'putt', cards: ['QS'] }) // 12 × 2.5 = 30 → holed
    expect(st.scores.length).toBe(1)
  })

  it('aces must be declared and both values work', () => {
    let st = baseState()
    setGreen(st, 42, false, 'center')
    setHand(st, ['AS'])
    expect(() => reduce(st, { type: 'putt', cards: ['AS'] })).toThrow(/declare/)
    st = reduce(st, { type: 'putt', cards: ['AS'], aceValues: { AS: 14 } }) // 42 → holed
    expect(st.scores.length).toBe(1)

    let st2 = baseState()
    setGreen(st2, 3, false, 'center')
    setHand(st2, ['AS'])
    st2 = reduce(st2, { type: 'putt', cards: ['AS'], aceValues: { AS: 1 } }) // 3 vs 3 → holed
    expect(st2.scores.length).toBe(1)
  })

  it('the Blade putter allows 3 cards; 4 is too many (D10)', () => {
    let st = baseState()
    setGreen(st, 27, false, 'center')
    setHand(st, ['2S', '3S', '4S', '5S'])
    expect(() =>
      reduce(st, { type: 'putt', cards: ['2S', '3S', '4S', '5S'] }),
    ).toThrow(/at most 3/)
    st = reduce(st, { type: 'putt', cards: ['2S', '3S', '4S'] }) // 9 × 3 = 27 → holed
    expect(st.scores.length).toBe(1)
  })
})

describe('deck economy', () => {
  it('reshuffling the discard costs a stroke and recycles every card', () => {
    let st = baseState()
    setBall(st, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st.deck = ['3S']
    st.discard = st.deck.length === 1 ? allCardsOf(st).filter((id) => !['2S', '2H', '3S'].includes(id)) : []
    st.discard = ['4S', '4H', '4D', '4C', '5H', '5C', '6S', '6H', '6D', '6C']

    st = reduce(st, { type: 'swing', cards: ['2S'] })
    expect(st.hole!.strokes).toBe(2) // 1 swing + 1 reshuffle penalty
    expect(st.lastEvents.join(' ')).toContain('reshuffled')
    expect(st.hand.length).toBe(7)
    expect(st.discard.length).toBe(0)
  })

  it('cards are conserved across every action', () => {
    let st = baseState()
    setBall(st, { remaining: 200, lie: 'fairway', pin: 'center', effLength: 310 })
    const before = allCardsOf(st).length
    st = reduce(st, { type: 'swing', cards: [st.hand[0]!] })
    expect(allCardsOf(st).length).toBe(before)
    expect(new Set(allCardsOf(st)).size).toBe(before)
  })

  it('the hand persists across holes', () => {
    let st = baseState()
    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H', '9S', '9H', '9D', 'KC', 'KD'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] }) // holed
    expect(st.hole!.index).toBe(1)
    // The five unplayed cards are still in hand; two were drawn to refill.
    for (const id of ['9S', '9H', '9D', 'KC', 'KD']) expect(st.hand).toContain(id)
    expect(st.hand.length).toBe(7)
  })
})

describe('the stroke cap (D5): no dead ends, ever', () => {
  it('picks up at par + 4', () => {
    let st = baseState() // muni-01 par 4 → cap 8
    for (let i = 0; i < 8; i++) {
      expect(st.hole!.index).toBe(0)
      setGreen(st, 90, false, 'center')
      setHand(st, ['KS'])
      st = reduce(st, { type: 'putt', cards: ['KS'] }) // 39 vs 90, never in
    }
    expect(st.scores).toEqual([8])
    expect(st.hole!.index).toBe(1)
  })

  it('penalties can never push the recorded score past the cap', () => {
    let st = baseState() // par 4, cap 8
    setBall(st, { remaining: 200, lie: 'fairway', pin: 'center', effLength: 310, strokes: 7 })
    setHand(st, ['5S'])
    // swing (8) then OOB penalty (9) → recorded as 8.
    st = reduce(st, { type: 'swing', cards: ['5S'] })
    expect(st.scores).toEqual([8])
  })
})

describe('action validation', () => {
  it('cannot swing from the green', () => {
    const st = baseState()
    setGreen(st, 30, false, 'center')
    setHand(st, ['5S', '5D'])
    expect(() => reduce(st, { type: 'swing', cards: ['5S', '5D'] })).toThrow(/putt/)
  })

  it('cannot putt from the fairway', () => {
    const st = baseState()
    setBall(st, { remaining: 100, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S'])
    expect(() => reduce(st, { type: 'putt', cards: ['5S'] })).toThrow(/green or fringe/)
  })

  it('cannot play cards you do not hold', () => {
    const st = baseState()
    setBall(st, { remaining: 100, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S'])
    expect(() => reduce(st, { type: 'swing', cards: ['6S'] })).toThrow(/not in hand/)
  })

  it('rejects duplicates and empty selections', () => {
    const st = baseState()
    setBall(st, { remaining: 100, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S'])
    expect(() => reduce(st, { type: 'swing', cards: [] })).toThrow(/at least 1/)
    expect(() => reduce(st, { type: 'swing', cards: ['5S', '5S'] })).toThrow(/duplicate/)
  })

  it('enforces lie card caps through the engine', () => {
    const st = baseState()
    setBall(st, { remaining: 200, lie: 'deepRough', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H', '3D', '3C'])
    expect(() => reduce(st, { type: 'swing', cards: ['2S', '2H', '3D', '3C'] })).toThrow(/at most 3/)
  })

  it('enforces the bunker flush ban through the engine', () => {
    const st = baseState()
    setBall(st, { remaining: 200, lie: 'bunker', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '5S', '7S', 'JS', 'KS'])
    expect(() => reduce(st, { type: 'swing', cards: ['2S', '5S', '7S', 'JS', 'KS'] })).toThrow(/bunker/)
  })

  it('rejects actions after the round is over', () => {
    let st = baseState()
    st.phase = 'roundComplete'
    st.hole = null
    expect(() => reduce(st, { type: 'swing', cards: ['2S'] })).toThrow(/over/)
    expect(() => reduce(st, { type: 'putt', cards: ['2S'] })).toThrow(/over/)
  })
})

describe('previews consume no RNG and match the swing', () => {
  it('an exact hand previews min === max and the swing lands there', () => {
    let st = baseState()
    setBall(st, { remaining: 200, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    const p = previewSwingAction(st, ['5S', '5D'])
    expect(p.min).toBe(90)
    expect(p.max).toBe(90)
    const before = structuredClone(st.rng)
    expect(st.rng).toEqual(before)
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(st.hole!.ball!.remaining).toBe(110)
  })

  it('scattered hands always land inside the previewed range', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) {
      let st = initRound(seed, SUNNYVALE_FRONT_9, { ...DEFAULT_CONFIG, windStrength: 0 })
      setBall(st, { remaining: 400, lie: 'fairway', pin: 'center', effLength: 480 })
      setHand(st, ['3S', '3H', '4D', '4C'])
      const p = previewSwingAction(st, ['3S', '3H', '4D', '4C']) // two pair ±2
      st = reduce(st, { type: 'swing', cards: ['3S', '3H', '4D', '4C'] })
      const struck = 400 - st.hole!.ball!.remaining
      expect(struck).toBeGreaterThanOrEqual(p.min)
      expect(struck).toBeLessThanOrEqual(p.max)
    }
  })

  it('preview refuses when not in swing position', () => {
    const st = baseState()
    setGreen(st, 30, false, 'center')
    expect(() => previewSwingAction(st, [st.hand[0]!])).toThrow(SimError)
  })
})

describe('counterfactual fairness (D14): streams never cross', () => {
  it('consuming scatter rolls does not change the next hole wind', () => {
    // Path A: finish hole 1 without any scatter roll.
    let a = baseState()
    setBall(a, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(a, ['2S', '2H'])
    a = reduce(a, { type: 'swing', cards: ['2S', '2H'] })

    // Path B: burn a scatter roll first, then finish the same way.
    let b = baseState()
    setBall(b, { remaining: 300, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(b, ['3S', '3H', '4D', '4C'])
    b = reduce(b, { type: 'swing', cards: ['3S', '3H', '4D', '4C'] })
    setBall(b, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(b, ['2S', '2H'])
    b = reduce(b, { type: 'swing', cards: ['2S', '2H'] })

    expect(a.hole!.index).toBe(1)
    expect(b.hole!.index).toBe(1)
    expect(a.hole!.wind).toEqual(b.hole!.wind)
    expect(a.hole!.pin).toBe(b.hole!.pin)
  })
})

describe('determinism & replay (§16): state ≡ fold(seed, actions)', () => {
  function naivePlay(seed: string): { states: SimState[]; actions: SimAction[] } {
    let st = initRound(seed, SUNNYVALE_FRONT_9)
    const states = [st]
    const actions: SimAction[] = []
    let guard = 0
    while (st.phase !== 'roundComplete' && guard++ < 400) {
      const onGreen = st.phase === 'putt'
      // Deterministic naive policy: play the single lowest card; declare aces low.
      const card = [...st.hand].sort()[0]!
      const action: SimAction = onGreen
        ? { type: 'putt', cards: [card], aceValues: { [card]: 1 } }
        : { type: 'swing', cards: [card] }
      st = reduce(st, action)
      states.push(st)
      actions.push(action)
    }
    return { states, actions }
  }

  it('reduce is pure: the input state is never mutated', () => {
    const st = baseState()
    const frozen = structuredClone(st)
    reduce(st, { type: 'swing', cards: [st.hand[0]!] })
    expect(st).toEqual(frozen)
  })

  it('the same action list replays to the identical final state', () => {
    const { states, actions } = naivePlay('replay-me')
    const replayed = replay('replay-me', SUNNYVALE_FRONT_9, actions)
    expect(replayed).toEqual(states[states.length - 1])
  })

  it('a full naive round completes all 9 holes with no dead ends', () => {
    for (const seed of ['n1', 'n2', 'n3', 'n4', 'n5']) {
      const { states } = naivePlay(seed)
      const final = states[states.length - 1]!
      expect(final.phase).toBe('roundComplete')
      expect(final.scores.length).toBe(9)
      final.scores.forEach((s, i) => {
        expect(s).toBeGreaterThanOrEqual(1)
        expect(s).toBeLessThanOrEqual(SUNNYVALE_FRONT_9[i]!.par + 4)
      })
    }
  })

  it('card conservation holds at every step of a full round', () => {
    const { states } = naivePlay('conserve')
    for (const st of states) {
      const all = allCardsOf(st)
      expect(all.length).toBe(52)
      expect(new Set(all).size).toBe(52)
    }
  })

  it('two runs of the same seed produce identical scorecards', () => {
    const a = naivePlay('twin-run')
    const b = naivePlay('twin-run')
    expect(a.states[a.states.length - 1]!.scores).toEqual(b.states[b.states.length - 1]!.scores)
  })

  it('different seeds produce different rounds', () => {
    const a = naivePlay('seed-a')
    const b = naivePlay('seed-b')
    expect(a.actions).not.toEqual(b.actions)
  })
})

describe('lastStroke: the sim reports what happened, for animation', () => {
  it('a clean landing reports from/landed/final positions', () => {
    let st = baseState()
    setBall(st, { remaining: 200, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'] }) // 90 from pos 110
    expect(st.lastStroke).toEqual({
      kind: 'swing', struck: 90, fromPos: 110, landedPos: 200, finalPos: 200, outcome: 'land',
    })
  })

  it('water reports the splash point and the drop point', () => {
    let st = baseState({}, 'muni-04')
    setBall(st, { remaining: 200, lie: 'fairway', pin: 'center', effLength: 355 })
    setHand(st, ['2S'])
    st = reduce(st, { type: 'swing', cards: ['2S'] }) // lands 197 (water), drops 179
    expect(st.lastStroke).toMatchObject({
      kind: 'swing', outcome: 'water', landedPos: 197, finalPos: 179,
    })
  })

  it('OOB reports the landing past the fringe and the return', () => {
    let st = baseState()
    setBall(st, { remaining: 10, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S'])
    st = reduce(st, { type: 'swing', cards: ['5S'] }) // 45 → 35 long
    expect(st.lastStroke).toMatchObject({
      kind: 'swing', outcome: 'oob', fromPos: 300, landedPos: 345, finalPos: 300,
    })
  })

  it('reaching the green and holing out are distinct outcomes', () => {
    let st = baseState()
    setBall(st, { remaining: 100, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['5S', '5D'])
    st = reduce(st, { type: 'swing', cards: ['5S', '5D'] })
    expect(st.lastStroke).toMatchObject({ kind: 'swing', outcome: 'green' })

    setBall(st, { remaining: 85, lie: 'fairway', pin: 'center', effLength: 310 })
    setHand(st, ['2S', '2H'])
    st = reduce(st, { type: 'swing', cards: ['2S', '2H'] })
    expect(st.lastStroke).toMatchObject({ kind: 'swing', outcome: 'holed', finalPos: 310 })
  })

  it('putts report roll, end distance, and blew-past', () => {
    let st = baseState()
    setGreen(st, 20, false, 'center')
    setHand(st, ['TS'])
    st = reduce(st, { type: 'putt', cards: ['TS'] }) // 30 vs 20
    expect(st.lastStroke).toEqual({
      kind: 'putt', fromFt: 20, rolledFt: 30, endFt: 10, holed: false, blewPast: true,
    })
    setHand(st, ['2S'])
    st = reduce(st, { type: 'putt', cards: ['2S'] }) // 8 downhill vs 10 → holed
    expect(st.lastStroke).toEqual({
      kind: 'putt', fromFt: 10, rolledFt: 8, endFt: 0, holed: true, blewPast: false,
    })
  })
})

describe('score names', () => {
  it.each([
    [-3, 'albatross'], [-2, 'eagle'], [-1, 'birdie'], [0, 'par'],
    [1, 'bogey'], [2, 'double bogey'], [3, 'triple bogey'], [4, '+4'],
  ])('%i → %s', (diff, name) => {
    expect(scoreName(diff)).toBe(name)
  })

  it('formats to-par strings', () => {
    expect(toParString(0)).toBe('even par')
    expect(toParString(3)).toBe('+3')
    expect(toParString(-2)).toBe('-2')
  })
})
