import {
  DEFAULT_CONFIG,
  initRound,
  makeDeck,
  SUNNYVALE_FRONT_9,
  type CardId,
  type Pin,
  type RunConfig,
  type SimState,
  type SwingLie,
  type Wind,
} from '../src/sim/index'

/**
 * Test scaffolding: start a real round, then sculpt the exact situation.
 * Tests may mutate a state freely — reduce() clones, never mutates its input.
 * windStrength defaults to 0 in tests so distances are exact unless a test
 * opts into wind.
 */
export function baseState(over: Partial<RunConfig> = {}, firstHoleId?: string): SimState {
  let holes = SUNNYVALE_FRONT_9
  if (firstHoleId) {
    const target = holes.find((h) => h.id === firstHoleId)
    if (!target) throw new Error(`no hole ${firstHoleId}`)
    holes = [target, ...holes.filter((h) => h.id !== firstHoleId)]
  }
  return initRound('test-seed', holes, { ...DEFAULT_CONFIG, windStrength: 0, ...over })
}

/** Put exactly these cards in hand; everything else goes to the deck. */
export function setHand(state: SimState, ids: CardId[]): void {
  state.hand = ids.slice()
  state.discard = []
  state.deck = makeDeck().filter((id) => !ids.includes(id))
}

export interface BallOpts {
  remaining: number
  lie?: SwingLie
  side?: 'short' | 'long'
  pin?: Pin
  effLength?: number
  wind?: Wind
  strokes?: number
}

export function setBall(state: SimState, opts: BallOpts): void {
  const hole = state.hole
  if (!hole) throw new Error('no live hole')
  hole.ball = {
    remaining: opts.remaining,
    side: opts.side ?? 'short',
    lie: opts.lie ?? 'fairway',
  }
  hole.green = null
  state.phase = 'swing'
  if (opts.pin) hole.pin = opts.pin
  if (opts.effLength !== undefined) hole.effLength = opts.effLength
  if (opts.wind) hole.wind = opts.wind
  if (opts.strokes !== undefined) hole.strokes = opts.strokes
}

export function setGreen(state: SimState, distFt: number, downhill = false, pin: Pin = 'center'): void {
  const hole = state.hole
  if (!hole) throw new Error('no live hole')
  hole.ball = null
  hole.green = { distFt, downhill }
  hole.pin = pin
  state.phase = 'putt'
}

/** Deck+discard+hand must always be the full 52 (card conservation). */
export function allCardsOf(state: SimState): string[] {
  return [...state.deck, ...state.discard, ...state.hand].sort()
}
