import { type CardId, cardLabel, makeDeck, shuffle, SUITS, SUIT_NAMES } from './cards'
import { CLUBS, putterMaxCards, type ClubId, type ClubSpec } from './clubs'
import { evaluateHand, HAND_LABELS, SCATTER, type HandEval } from './hands'
import {
  APPROACH_GIMME_YDS,
  FRINGE_WINDOW,
  GREEN_WINDOW,
  lieAt,
  PIN_SHIFT,
  validateCourse,
  waterDropPos,
} from './holes'
import { planPutt, resolvePutt } from './putting'
import { nextInt, nextIntIn, chance, weightedIndex, seedStream } from './rng'
import {
  assertSwingLegal,
  finishStruck,
  LIE_LABELS,
  LIE_RULES,
  previewSwing,
  struckBase,
  type LieRules,
  type SwingPreview,
} from './swing'
import {
  DEFAULT_CONFIG,
  SimError,
  type HoleLive,
  type HoleSpec,
  type Pin,
  type RunConfig,
  type SimAction,
  type SimState,
  type SwingLie,
  type SwingResult,
} from './types'

/** Start a 9-hole round. Same (seed, holes, config) → identical round, always. */
export function initRound(
  seed: string,
  holes: readonly HoleSpec[],
  config: RunConfig = DEFAULT_CONFIG,
): SimState {
  const courseProblems = validateCourse(holes)
  if (courseProblems.length > 0) {
    throw new SimError(`invalid course: ${courseProblems.join('; ')}`)
  }
  const state: SimState = {
    v: 1,
    seed,
    config: { ...config, pinWeights: { ...config.pinWeights } },
    rng: {
      deck: seedStream(seed, 'deck'),
      wind: seedStream(seed, 'wind'),
      scatter: seedStream(seed, 'scatter'),
      cart: seedStream(seed, 'cart'),
      caddie: seedStream(seed, 'caddie'),
    },
    holes: holes.map((h) => structuredClone(h) as HoleSpec),
    deck: [],
    discard: [],
    hand: [],
    hole: null,
    scores: [],
    phase: 'swing',
    lastEvents: [],
    lastStroke: null,
    clubCharges: {},
    clubUsedThisHole: {},
  }
  for (const id of state.config.bag) {
    const spec = CLUBS[id]
    if (!spec) throw new SimError(`unknown club ${id}`)
    if (Number.isFinite(spec.charges)) state.clubCharges[id] = spec.charges
  }
  if (state.config.bag.length > 5) throw new SimError('the bag holds at most 5 clubs')
  state.deck = shuffle(makeDeck(), state.rng.deck)
  drawTo(state, [])
  startHole(state, 0)
  return state
}

/** Roll wind + pin (wind stream) and put the ball on the tee. */
function startHole(state: SimState, index: number): void {
  const spec = state.holes[index]
  if (!spec) throw new SimError(`no hole at index ${index}`)

  // Rolls are always consumed so authored biases never shift the stream.
  const boostRoll = SUITS[nextInt(state.rng.wind, 4)]!
  const boost = spec.windBias ?? boostRoll
  const rest = SUITS.filter((s) => s !== boost)
  const drag = rest[nextInt(state.rng.wind, 3)]!

  const w = state.config.pinWeights
  const pinRoll = weightedIndex(state.rng.wind, [w.front, w.center, w.back])
  const pin: Pin = spec.pinBias ?? (['front', 'center', 'back'] as const)[pinRoll]!

  const effLength = spec.length + PIN_SHIFT[pin]
  const hole: HoleLive = {
    index,
    wind: { boost, drag },
    pin,
    effLength,
    strokes: 0,
    ball: { remaining: effLength, side: 'short', lie: 'tee' },
    green: null,
  }
  state.hole = hole
  state.phase = 'swing'
  state.clubUsedThisHole = {}
  state.lastEvents.push(
    `Hole ${index + 1} — ${spec.name}, par ${spec.par}, ${effLength} yds (pin ${pin}). ` +
      `Wind: +${SUIT_NAMES[boost]} / −${SUIT_NAMES[drag]}.`,
  )
}

/** Draw back to hand size; reshuffling the discard costs a stroke (GDD §2). */
function drawTo(state: SimState, events: string[]): void {
  while (state.hand.length < state.config.handSize) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break
      state.deck = shuffle(state.discard, state.rng.deck)
      state.discard = []
      if (state.hole) {
        state.hole.strokes += state.config.reshufflePenalty
        events.push(`Deck exhausted — reshuffled, +${state.config.reshufflePenalty} stroke.`)
      } else {
        events.push('Deck exhausted — reshuffled.')
      }
    }
    state.hand.push(state.deck.pop()!)
  }
}

function finishHole(state: SimState, events: string[]): void {
  const hole = state.hole!
  const spec = state.holes[hole.index]!
  const cap = spec.par + state.config.capOverPar
  const score = Math.min(hole.strokes, cap)
  state.scores.push(score)
  events.push(`${spec.name}: ${score} strokes (${scoreName(score - spec.par)}).`)
  if (hole.index === state.holes.length - 1) {
    state.hole = null
    state.phase = 'roundComplete'
    const total = state.scores.reduce((a, b) => a + b, 0)
    const par = state.holes.reduce((a, h) => a + h.par, 0)
    events.push(`Round complete: ${total} strokes, ${toParString(total - par)}.`)
  } else {
    // startHole appends its tee-card line to lastEvents, after the score line.
    startHole(state, hole.index + 1)
  }
}

function checkPickup(state: SimState, events: string[]): boolean {
  const hole = state.hole!
  const spec = state.holes[hole.index]!
  const cap = spec.par + state.config.capOverPar
  if (hole.strokes >= cap) {
    events.push(`That's enough — picking up at ${cap}.`)
    finishHole(state, events)
    return true
  }
  return false
}

function validateSelection(state: SimState, cards: readonly CardId[]): void {
  if (cards.length === 0) throw new SimError('select at least 1 card')
  if (new Set(cards).size !== cards.length) throw new SimError('duplicate cards in selection')
  for (const id of cards) {
    if (!state.hand.includes(id)) throw new SimError(`${id} is not in hand`)
  }
}

function discardPlayed(state: SimState, cards: readonly CardId[]): void {
  state.hand = state.hand.filter((id) => !cards.includes(id))
  state.discard.push(...cards)
}

/** Validate a club for use right now; returns its spec. */
function requireClub(state: SimState, id: ClubId, kind: ClubSpec['kind']): ClubSpec {
  const spec = CLUBS[id]
  if (!spec || !state.config.bag.includes(id)) throw new SimError(`that club is not in the bag`)
  if (spec.kind !== kind) throw new SimError(`${spec.name} cannot be used that way`)
  const left = state.clubCharges[id]
  if (left !== undefined && left <= 0) throw new SimError(`${spec.name} is out of charges`)
  if (spec.perHole !== undefined && (state.clubUsedThisHole[id] ?? 0) >= spec.perHole) {
    throw new SimError(`${spec.name} is spent for this hole`)
  }
  return spec
}

function spendClub(state: SimState, id: ClubId): void {
  const left = state.clubCharges[id]
  if (left !== undefined) state.clubCharges[id] = left - 1
  state.clubUsedThisHole[id] = (state.clubUsedThisHole[id] ?? 0) + 1
}

/** Lie rules after passive bag effects (Sand Wedge honest bunkers). */
function effectiveRules(state: SimState, lie: SwingLie): LieRules {
  if (lie === 'bunker' && state.config.bag.includes('sandWedge')) {
    return { ...LIE_RULES.bunker, mult: 1.0, noFlush: false }
  }
  return LIE_RULES[lie]
}

function reduceSwing(
  state: SimState,
  cards: readonly CardId[],
  club: ClubId | undefined,
  events: string[],
): void {
  if (state.phase === 'roundComplete') throw new SimError('the round is over')
  if (state.phase !== 'swing') throw new SimError('you are on the green — putt')
  const hole = state.hole!
  const ball = hole.ball!
  const spec = state.holes[hole.index]!

  let clubSpec: ClubSpec | undefined
  if (club) {
    clubSpec = requireClub(state, club, 'swing')
    if (clubSpec.lies && !clubSpec.lies.includes(ball.lie)) {
      throw new SimError(`${clubSpec.name} only works from ${clubSpec.lies.join('/')}`)
    }
  }

  validateSelection(state, cards)
  if (cards.length > 5) throw new SimError('at most 5 cards per stroke')
  const hand = evaluateHand(cards)
  const rules = effectiveRules(state, ball.lie)
  assertSwingLegal(ball.lie, hand, rules)

  // Distance: deterministic part, then scatter, then cart-path skid,
  // then club shaping (Pitching Wedge halves last).
  let struck = struckBase(hand, ball.lie, hole.wind, state.config.windStrength, rules, clubSpec)
  const spread = SCATTER[hand.rank]
  let scatterRoll = 0
  if (spread > 0) {
    scatterRoll = nextIntIn(state.rng.scatter, -spread, spread)
    struck += scatterRoll
  }
  let skid = 0
  if (rules.skid && chance(state.rng.cart, 0.5)) {
    skid = chance(state.rng.cart, 0.5) ? 25 : -25
    struck += skid
  }
  struck = finishStruck(struck, clubSpec)

  if (clubSpec) spendClub(state, clubSpec.id)
  hole.strokes++
  const label = `${HAND_LABELS[hand.rank]}${hand.junk ? ' (junk)' : ''}`
  events.push(
    `Swung ${label} [${cards.map(cardLabel).join(' ')}]${clubSpec ? ` with the ${clubSpec.name}` : ''} from ${LIE_LABELS[ball.lie]}: ${struck} yds` +
      `${skid !== 0 ? ` (cart path skid ${skid > 0 ? '+' : ''}${skid})` : ''}.`,
  )

  // Travel is always toward the cup; 'long' side only ever means the fringe.
  const fromPos = ball.side === 'short' ? hole.effLength - ball.remaining : hole.effLength + ball.remaining
  const net = ball.side === 'short' ? ball.remaining - struck : struck - ball.remaining
  const side = net >= 0 ? 'short' : 'long'
  const rem = Math.abs(net)
  const landedPos = side === 'short' ? hole.effLength - rem : hole.effLength + rem
  const stroke = (outcome: SwingResult['outcome'], finalPos: number): void => {
    state.lastStroke = { kind: 'swing', struck, fromPos, landedPos, finalPos, outcome }
  }

  if (rem <= APPROACH_GIMME_YDS) {
    events.push('IN THE HOLE from the fairway!')
    stroke('holed', hole.effLength)
    hole.ball = null
    discardPlayed(state, cards)
    drawTo(state, events)
    finishHole(state, events)
    return
  }

  if (side === 'short') {
    if (rem <= GREEN_WINDOW) {
      hole.ball = null
      hole.green = { distFt: rem * 3, downhill: hole.pin === 'back' }
      state.phase = 'putt'
      stroke('green', landedPos)
      events.push(`On the green — ${hole.green.distFt} ft${hole.green.downhill ? ', downhill' : ''}.`)
    } else {
      const pos = hole.effLength - rem
      const lie = lieAt(spec, pos)
      if (lie === 'water') {
        hole.strokes++
        const dropPos = waterDropPos(spec, pos)
        const dropLie: SwingLie = dropPos === 0 ? 'tee' : 'fairway'
        hole.ball = { remaining: hole.effLength - dropPos, side: 'short', lie: dropLie }
        stroke('water', dropPos)
        events.push(
          `Into the water — +1 stroke, drop back at ${hole.ball.remaining} yds out.`,
        )
      } else {
        hole.ball = { remaining: rem, side: 'short', lie }
        stroke('land', landedPos)
        events.push(`${rem} yds out, on ${LIE_LABELS[lie]}.`)
      }
    }
  } else if (clubSpec?.greenWindowLong !== undefined && rem <= clubSpec.greenWindowLong) {
    // Pitching Wedge sticks the long side: on the green, but above the hole.
    hole.ball = null
    hole.green = { distFt: rem * 3, downhill: true }
    state.phase = 'putt'
    stroke('green', landedPos)
    events.push(`${clubSpec.name} bites — ${rem} yds past, on the green. Downhill.`)
  } else if (rem <= FRINGE_WINDOW) {
    hole.ball = { remaining: rem, side: 'long', lie: 'fringe' }
    stroke('fringe', landedPos)
    events.push(`Flew the pin — ${rem} yds long, on the fringe. It's all downhill from here.`)
  } else {
    // Past the fringe: out of bounds. Stroke and distance (D12).
    hole.strokes++
    hole.ball = { ...ball }
    stroke('oob', fromPos)
    events.push(
      `${rem} yds LONG — out of bounds. +1 stroke, replaying from ${ball.remaining} yds.`,
    )
  }

  discardPlayed(state, cards)
  drawTo(state, events)
  checkPickup(state, events)
}

function reducePutt(
  state: SimState,
  cards: readonly CardId[],
  aceValues: Record<CardId, 1 | 14> | undefined,
  events: string[],
): void {
  if (state.phase === 'roundComplete') throw new SimError('the round is over')
  const hole = state.hole!

  // Fringe balls may putt (always downhill, D7); this converts them to the green.
  if (state.phase === 'swing') {
    const ball = hole.ball
    if (!ball || ball.lie !== 'fringe') throw new SimError('you can only putt on the green or fringe')
    hole.green = { distFt: ball.remaining * 3, downhill: true }
    hole.ball = null
    state.phase = 'putt'
  }
  const green = hole.green!

  validateSelection(state, cards)
  const maxPuttCards = putterMaxCards(state.config.putter, state.config.puttMaxCards)
  const plan = planPutt(cards, aceValues, green, hole.pin, maxPuttCards)
  hole.strokes++
  const outcome = resolvePutt(plan, green, state.config.gimmeFt)
  state.lastStroke = {
    kind: 'putt',
    fromFt: green.distFt,
    rolledFt: outcome.rolled,
    endFt: outcome.holed ? 0 : outcome.next!.distFt,
    holed: outcome.holed,
    blewPast: outcome.blewPast,
  }
  events.push(
    `Putt [${cards.map(cardLabel).join(' ')}] rolls ${outcome.rolled} ft (×${plan.factor}) from ${green.distFt} ft.`,
  )

  discardPlayed(state, cards)

  if (outcome.holed) {
    hole.green = null
    events.push('In the cup.')
    drawTo(state, events)
    finishHole(state, events)
    return
  }

  hole.green = outcome.next
  events.push(
    outcome.blewPast
      ? `Raced ${outcome.next!.distFt} ft past. Coming back downhill.`
      : `${outcome.next!.distFt} ft left${outcome.next!.downhill ? ', downhill' : ''}.`,
  )
  drawTo(state, events)
  checkPickup(state, events)
}

/** 7-Iron: dump the whole hand, draw fresh. Costs a charge, not a stroke. */
function reduceReroll(state: SimState, club: ClubId, events: string[]): void {
  if (state.phase === 'roundComplete') throw new SimError('the round is over')
  if (state.phase !== 'swing') throw new SimError('no rerolls on the green')
  if (club !== 'sevenIron') throw new SimError('only the 7-Iron rerolls')
  const spec = requireClub(state, club, 'instant')
  spendClub(state, club)
  state.lastStroke = null
  const n = state.hand.length
  state.discard.push(...state.hand)
  state.hand = []
  events.push(`${spec.name}: tossed ${n} cards for a fresh hand.`)
  drawTo(state, events)
  checkPickup(state, events) // a reroll can force the reshuffle penalty
}

/** Punch Iron: discard exactly 2, draw 3 (hand runs rich until spent). */
function reducePunch(
  state: SimState,
  club: ClubId,
  discard: readonly CardId[],
  events: string[],
): void {
  if (state.phase === 'roundComplete') throw new SimError('the round is over')
  if (club !== 'punchIron') throw new SimError('only the Punch Iron does that')
  const spec = requireClub(state, club, 'instant')
  if (discard.length !== 2) throw new SimError(`${spec.name} discards exactly 2 cards`)
  validateSelection(state, discard)
  spendClub(state, club)
  state.lastStroke = null
  discardPlayed(state, discard)
  for (let i = 0; i < 3; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break
      state.deck = shuffle(state.discard, state.rng.deck)
      state.discard = []
      if (state.hole) {
        state.hole.strokes += state.config.reshufflePenalty
        events.push(`Deck exhausted — reshuffled, +${state.config.reshufflePenalty} stroke.`)
      }
    }
    state.hand.push(state.deck.pop()!)
  }
  events.push(`${spec.name}: 2 out, 3 in — ${state.hand.length} cards in hand.`)
  checkPickup(state, events)
}

/** Pure reducer: same state + same action → same next state. */
export function reduce(state: SimState, action: SimAction): SimState {
  const next = structuredClone(state) as SimState
  next.lastEvents = []
  const events = next.lastEvents
  switch (action.type) {
    case 'swing':
      reduceSwing(next, action.cards, action.club, events)
      break
    case 'putt':
      reducePutt(next, action.cards, action.aceValues, events)
      break
    case 'reroll':
      reduceReroll(next, action.club, events)
      break
    case 'punch':
      reducePunch(next, action.club, action.discard, events)
      break
  }
  return next
}

/** Rebuild any state from its seed + action log (saves, ghosts, dailies). */
export function replay(
  seed: string,
  holes: readonly HoleSpec[],
  actions: readonly SimAction[],
  config: RunConfig = DEFAULT_CONFIG,
): SimState {
  let state = initRound(seed, holes, config)
  for (const action of actions) state = reduce(state, action)
  return state
}

/** Honest pre-swing preview for the current lie/wind/club. Consumes no RNG. */
export function previewSwingAction(
  state: SimState,
  cards: readonly CardId[],
  club?: ClubId,
): SwingPreview {
  if (state.phase !== 'swing' || !state.hole?.ball) throw new SimError('not in swing position')
  const ball = state.hole.ball
  let clubSpec: ClubSpec | undefined
  if (club) {
    clubSpec = requireClub(state, club, 'swing')
    if (clubSpec.lies && !clubSpec.lies.includes(ball.lie)) {
      throw new SimError(`${clubSpec.name} only works from ${clubSpec.lies.join('/')}`)
    }
  }
  validateSelection(state, cards)
  const hand: HandEval = evaluateHand(cards)
  const rules = effectiveRules(state, ball.lie)
  return previewSwing(hand, ball.lie, state.hole.wind, state.config.windStrength, rules, clubSpec)
}

export function scoreName(diff: number): string {
  if (diff <= -3) return 'albatross'
  if (diff === -2) return 'eagle'
  if (diff === -1) return 'birdie'
  if (diff === 0) return 'par'
  if (diff === 1) return 'bogey'
  if (diff === 2) return 'double bogey'
  if (diff === 3) return 'triple bogey'
  return `+${diff}`
}

export function toParString(diff: number): string {
  if (diff === 0) return 'even par'
  return diff > 0 ? `+${diff}` : `${diff}`
}
