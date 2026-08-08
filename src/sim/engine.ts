import { CADDIES, RARITY_WEIGHT, type CaddieId } from './caddies'
import { type CardId, cardFromId, cardLabel, makeDeck, rankChar, shuffle, SUITS, SUIT_NAMES } from './cards'
import { CLUBS, PUTTERS, putterMaxCards, type ClubId, type ClubSpec } from './clubs'
import { evaluateHand, HAND_LABELS, type HandEval, type HandRank } from './hands'
import {
  APPROACH_GIMME_YDS,
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
  scatterFor,
  struckBase,
  type ClubMods,
  type LieRules,
  type SwingPreview,
} from './swing'
import {
  DEFAULT_CONFIG,
  SimError,
  type HoleLive,
  type HoleSpec,
  type MulliganSnapshot,
  type Pin,
  type RunConfig,
  type SimAction,
  type SimState,
  type SwingLie,
  type SwingResult,
  type WildDecl,
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
    caddies: [],
    offers: [],
    runEnd: null,
    reshufflesThisRound: 0,
    mulligan: null,
    peeked: [],
  }
  for (const id of state.config.bag) {
    const spec = CLUBS[id]
    if (!spec) throw new SimError(`unknown club ${id}`)
    if (Number.isFinite(spec.charges)) state.clubCharges[id] = spec.charges
  }
  if (state.config.bag.length > 5) throw new SimError('the bag holds at most 5 clubs')
  if (new Set(state.config.bag).size !== state.config.bag.length) {
    throw new SimError('no duplicate clubs in the bag')
  }
  state.deck = shuffle(makeDeck(), state.rng.deck)
  drawTo(state, [])
  if (state.config.caddiePool.length > 0) {
    // Run-start ceremony: pick your caddie before the first tee (GDD §8).
    rollOffers(state)
    state.phase = 'ceremony'
    state.lastEvents.push('Pick a caddie for the run.')
  } else {
    startHole(state, 0)
  }
  return state
}

/** Rarity-weighted, distinct, never-owned caddie offers from the caddie stream. */
function rollOffers(state: SimState): void {
  const available = state.config.caddiePool.filter((id) => !state.caddies.includes(id))
  const offers: CaddieId[] = []
  const n = Math.min(state.config.caddieOfferCount, available.length)
  const pool = available.slice()
  for (let i = 0; i < n; i++) {
    const weights = pool.map((id) => RARITY_WEIGHT[CADDIES[id].rarity])
    const idx = weightedIndex(state.rng.caddie, weights)
    offers.push(pool[idx]!)
    pool.splice(idx, 1)
  }
  state.offers = offers
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
  if (index > 0 && index % 9 === 0) {
    // New 9-hole round: club charges refresh (GDD §7), reshuffle count resets.
    refreshCharges(state)
    state.reshufflesThisRound = 0
  }
  state.lastEvents.push(
    `Hole ${index + 1} — ${spec.name}, par ${spec.par}, ${effLength} yds (pin ${pin}). ` +
      `Wind: +${SUIT_NAMES[boost]} / −${SUIT_NAMES[drag]}.`,
  )
}

/** Nephew adds one to every finite per-round charge. */
function refreshCharges(state: SimState): void {
  const bonus = state.caddies.includes('nephew') ? 1 : 0
  for (const id of state.config.bag) {
    const spec = CLUBS[id]!
    if (Number.isFinite(spec.charges)) state.clubCharges[id] = spec.charges + bonus
  }
}

/**
 * Draw back to hand size; reshuffling the discard costs a stroke (GDD §2).
 * Lucky Penny forgives the first reshuffle each round. Silent Sam never
 * reshuffles: an empty deck ends the run on the spot.
 */
function drawTo(state: SimState, events: string[]): void {
  while (state.hand.length < state.config.handSize) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break
      if (state.caddies.includes('silentSam')) {
        state.phase = 'runComplete'
        state.runEnd = 'deckDead'
        state.hole = null
        events.push('The deck is dry. Silent Sam shakes his head. The run is over.')
        return
      }
      state.deck = shuffle(state.discard, state.rng.deck)
      state.discard = []
      state.reshufflesThisRound++
      const free = state.caddies.includes('penny') && state.reshufflesThisRound === 1
      if (state.hole && !free) {
        state.hole.strokes += state.config.reshufflePenalty
        events.push(`Deck exhausted — reshuffled, +${state.config.reshufflePenalty} stroke.`)
      } else {
        events.push(
          free ? 'Deck exhausted — Lucky Penny covers the reshuffle.' : 'Deck exhausted — reshuffled.',
        )
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

  const done = state.scores.length
  const total = state.scores.reduce((a, b) => a + b, 0)
  const parSoFar = state.holes.slice(0, done).reduce((a, h) => a + h.par, 0)
  const toPar = total - parSoFar

  if (done === state.holes.length) {
    state.hole = null
    state.phase = 'runComplete'
    state.runEnd = 'complete'
    events.push(`Run complete: ${total} strokes, ${toParString(toPar)}.`)
    return
  }

  const cut = state.config.cuts.find((c) => c.afterHole === done)
  if (cut) {
    if (toPar > cut.maxToPar) {
      state.hole = null
      state.phase = 'runComplete'
      state.runEnd = 'missedCut'
      events.push(
        `MISSED THE CUT: ${toParString(toPar)} against a ${toParString(cut.maxToPar)} line.`,
      )
      return
    }
    events.push(`Made the cut (${toParString(toPar)} vs ${toParString(cut.maxToPar)}).`)
    const canRecruit =
      state.config.caddiePool.length > 0 &&
      state.caddies.length < 4 &&
      state.config.caddiePool.some((id) => !state.caddies.includes(id))
    if (canRecruit) {
      rollOffers(state)
      state.phase = 'ceremony'
      state.hole = null
      events.push('The caddie yard is open — recruit or walk on.')
      return
    }
  }
  // startHole appends its tee-card line to lastEvents, after the score line.
  startHole(state, done)
}

function checkPickup(state: SimState, events: string[]): boolean {
  if (state.phase === 'runComplete' || state.hole === null) return true
  const hole = state.hole
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

function discardPlayed(state: SimState, cards: readonly CardId[], played = true): void {
  state.hand = state.hand.filter((id) => !cards.includes(id))
  // Marguerite: PLAYED 2s, 3s and 4s come home instead of hitting the
  // discard. Deliberate discards (Punch Iron) are not played cards.
  const keepLows = played && state.caddies.includes('marguerite')
  for (const id of cards) {
    if (keepLows && cardFromId(id).rank <= 4) state.hand.push(id)
    else state.discard.push(id)
  }
}

/** Common gate for play actions. */
function requirePlay(state: SimState): void {
  if (state.phase === 'runComplete') throw new SimError('the run is over')
  if (state.phase === 'ceremony') throw new SimError('pick a caddie first')
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

/** Lie rules after passive bag/caddie effects. */
function effectiveRules(state: SimState, lie: SwingLie): LieRules {
  if (lie === 'bunker' && state.config.bag.includes('sandWedge')) {
    return { ...LIE_RULES.bunker, mult: 1.0, noFlush: false }
  }
  if (lie === 'tee' && state.caddies.includes('bobby')) {
    return { ...LIE_RULES.tee, mult: 1.15 }
  }
  return LIE_RULES[lie]
}

/** Rank promotion clubs (Long Iron, Chipper). */
function scoredRankFor(hand: HandEval, club?: ClubSpec): HandRank | undefined {
  if (club?.straightTierUp && hand.rank === 'straight') return 'flush'
  if (club?.straightTierUp && hand.rank === 'straightFlush') return 'royalFlush'
  if (club?.highCardAsPair && hand.rank === 'highCard') return 'pair'
  return undefined
}

function clubModsFor(hand: HandEval, club?: ClubSpec): ClubMods | undefined {
  if (!club) return undefined
  const rankOverride = scoredRankFor(hand, club)
  return { ...club, ...(rankOverride ? { rankOverride } : {}) }
}

/** Substitute the Hybrid's declared wildcard into a selection. */
function applyWild(cards: readonly CardId[], wild: WildDecl | undefined, club?: ClubSpec): CardId[] {
  if (!wild) return cards.slice()
  if (!club?.wildcard) throw new SimError('only the Hybrid declares wildcards')
  if (!cards.includes(wild.id)) throw new SimError('the wildcard must be a selected card')
  if (!Number.isInteger(wild.rank) || wild.rank < 2 || wild.rank > 14) {
    throw new SimError('declare a rank from 2 to 14')
  }
  if (!SUITS.includes(wild.suit)) throw new SimError('declare a real suit')
  const virtual = `${rankChar(wild.rank)}${wild.suit}`
  const out = cards.map((id) => (id === wild.id ? virtual : id))
  if (new Set(out).size !== out.length) {
    throw new SimError('the wildcard may not duplicate a selected card')
  }
  return out
}

/** Caddie swing shaping: Wren's red hands, Tony's pairs, Wanda/Sam's winds. */
function caddieSwing(
  state: SimState,
  hand: HandEval,
): { mods: { mult: number; flat: number; dragStrength: number }; windStrength: number } {
  let mult = 1
  let flat = 0
  if (
    state.caddies.includes('wren') &&
    hand.cards.every((c) => c.suit === 'H' || c.suit === 'D')
  ) {
    mult *= 1.2
  }
  if (state.caddies.includes('tony') && hand.rank === 'pair') flat += 15
  let boost = state.config.windStrength
  let drag = state.config.windStrength
  if (state.caddies.includes('wanda')) boost = Math.max(boost, 0.2)
  if (state.caddies.includes('silentSam')) {
    boost = 0
    drag = 0
  }
  return { mods: { mult, flat, dragStrength: drag }, windStrength: boost }
}

function reduceSwing(
  state: SimState,
  cards: readonly CardId[],
  club: ClubId | undefined,
  wild: WildDecl | undefined,
  events: string[],
): void {
  requirePlay(state)
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
  if (clubSpec?.fixedDistance !== undefined && cards.length !== 1) {
    throw new SimError(`${clubSpec.name} plays exactly 1 card`)
  }
  const scoringIds = applyWild(cards, wild, clubSpec)
  const hand = evaluateHand(scoringIds)
  let rules = effectiveRules(state, ball.lie)
  if (clubSpec?.lieNeutral) rules = { ...rules, mult: 1.0 }
  if (clubSpec?.cardCapBonus && (ball.lie === 'rough' || ball.lie === 'deepRough')) {
    rules = { ...rules, maxCards: rules.maxCards + clubSpec.cardCapBonus }
  }
  assertSwingLegal(ball.lie, hand, rules)

  // Distance: deterministic part, then scatter, then cart-path skid,
  // then club shaping (Pitching Wedge halves last, floors respected).
  const mods = clubModsFor(hand, clubSpec)
  const caddie = caddieSwing(state, hand)
  if (clubSpec?.windImmune) {
    caddie.windStrength = 0
    caddie.mods.dragStrength = 0
  }
  let struck: number
  if (clubSpec?.fixedDistance !== undefined) {
    struck = clubSpec.fixedDistance
  } else {
    struck = struckBase(hand, ball.lie, hole.wind, caddie.windStrength, rules, mods, caddie.mods)
    const spread = scatterFor(hand, mods)
    if (spread > 0) {
      struck += nextIntIn(state.rng.scatter, -spread, spread)
    }
    let skid = 0
    if (rules.skid && chance(state.rng.cart, 0.5)) {
      skid = chance(state.rng.cart, 0.5) ? 25 : -25
      struck += skid
    }
    struck = finishStruck(struck, mods)
    if (clubSpec?.capAtGreenFront) {
      const cap = ball.side === 'short' ? Math.max(1, ball.remaining - GREEN_WINDOW) : ball.remaining
      struck = Math.min(struck, cap)
    }
  }

  if (clubSpec) spendClub(state, clubSpec.id)
  if (clubSpec?.mulligan) {
    // Snapshot after the charge is spent, before the stroke lands (D33).
    state.mulligan = {
      deck: state.deck.slice(),
      discard: state.discard.slice(),
      hand: state.hand.slice(),
      hole: structuredClone(hole) as HoleLive,
      phase: state.phase,
      reshufflesThisRound: state.reshufflesThisRound,
    }
  }
  hole.strokes++
  const scored = mods?.rankOverride ?? hand.rank
  const label = `${HAND_LABELS[scored]}${hand.junk ? ' (junk)' : ''}`
  events.push(
    `Swung ${label} [${cards.map(cardLabel).join(' ')}]${clubSpec ? ` with the ${clubSpec.name}` : ''}${wild ? ` (wild as ${rankChar(wild.rank)}${wild.suit})` : ''} from ${LIE_LABELS[ball.lie]}: ${struck} yds.`,
  )

  // Travel is always toward the cup; 'long' side only ever means the fringe.
  const fromPos = ball.side === 'short' ? hole.effLength - ball.remaining : hole.effLength + ball.remaining
  const net = ball.side === 'short' ? ball.remaining - struck : struck - ball.remaining
  let side = net >= 0 ? 'short' : 'long'
  const rem = Math.abs(net)
  if (side === 'long' && clubSpec?.symmetricLong) {
    side = 'short' // Niblick: for one swing, long is forgiven
    events.push('The Niblick takes the sting out of the long side.')
  }
  const landedPos = side === 'short' ? hole.effLength - rem : hole.effLength + rem
  const stroke = (outcome: SwingResult['outcome'], finalPos: number): void => {
    state.lastStroke = { kind: 'swing', struck, fromPos, landedPos, finalPos, outcome }
  }

  if (rem <= APPROACH_GIMME_YDS) {
    events.push('IN THE HOLE from the fairway!')
    stroke('holed', hole.effLength)
    hole.ball = null
    discardPlayed(state, cards)
    returnBest(state, cards, clubSpec, events)
    drawTo(state, events)
    if (state.runEnd !== null) return // deck died on the draw (Silent Sam)
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
  } else if (rem <= state.config.fringeWindow) {
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
  returnBest(state, cards, clubSpec, events)
  drawTo(state, events)
  checkPickup(state, events)
}

/** 8-Iron: the highest played card comes back for another dance. */
function returnBest(
  state: SimState,
  played: readonly CardId[],
  club: ClubSpec | undefined,
  events: string[],
): void {
  if (!club?.returnPlayed) return
  let best: CardId | null = null
  for (const id of played) {
    if (state.discard.includes(id) && (best === null || cardFromId(id).rank > cardFromId(best).rank)) {
      best = id
    }
  }
  if (best) {
    state.discard = state.discard.filter((id) => id !== best)
    state.hand.push(best)
    events.push(`${club.name}: ${cardLabel(best)} returns to hand.`)
  }
}

function reducePutt(
  state: SimState,
  cards: readonly CardId[],
  aceValues: Record<CardId, 1 | 14> | undefined,
  club: ClubId | undefined,
  events: string[],
): void {
  requirePlay(state)
  const hole = state.hole!
  const putter = PUTTERS[state.config.putter]

  let texas: ClubSpec | undefined
  if (club) {
    texas = requireClub(state, club, 'instant')
    if (!texas.texasWedge) throw new SimError(`${texas.name} is not a putter`)
    const ball = hole.ball
    if (state.phase !== 'swing' || !ball) throw new SimError('you are already putting')
    if (ball.side !== 'short' || ball.remaining > 40 || (ball.lie !== 'fairway' && ball.lie !== 'rough')) {
      throw new SimError(`${texas.name} works from fairway or rough within 40 yds`)
    }
    spendClub(state, club)
    hole.green = { distFt: ball.remaining * 3, downhill: true }
    hole.ball = null
    state.phase = 'putt'
    events.push(`${texas.name}: running it along the ground.`)
  }

  // Fringe balls may putt (downhill, D7 — unless the Greenskeeper mows it flat).
  if (state.phase === 'swing') {
    const ball = hole.ball
    if (!ball || ball.lie !== 'fringe') throw new SimError('you can only putt on the green or fringe')
    hole.green = { distFt: ball.remaining * 3, downhill: !state.caddies.includes('greenskeeper') }
    hole.ball = null
    state.phase = 'putt'
  }
  const green = hole.green!

  validateSelection(state, cards)
  const maxPuttCards = texas ? 2 : putterMaxCards(state.config.putter, state.config.puttMaxCards)
  const plan = planPutt(cards, aceValues, green, hole.pin, maxPuttCards, putter)
  hole.strokes++
  const outcome = resolvePutt(plan, green, putter.gimmeFt ?? state.config.gimmeFt)
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
    if (state.runEnd !== null) return // deck died on the draw (Silent Sam)
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
  requirePlay(state)
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
  requirePlay(state)
  if (club !== 'punchIron') throw new SimError('only the Punch Iron does that')
  const spec = requireClub(state, club, 'instant')
  if (discard.length !== 2) throw new SimError(`${spec.name} discards exactly 2 cards`)
  validateSelection(state, discard)
  spendClub(state, club)
  state.lastStroke = null
  discardPlayed(state, discard, false)
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

/** Mashie: peek the top of the deck. */
function reducePeek(state: SimState, club: ClubId, events: string[]): void {
  requirePlay(state)
  const spec = requireClub(state, club, 'instant')
  if (!spec.peek) throw new SimError(`${spec.name} has nothing to show you`)
  spendClub(state, club)
  state.lastStroke = null
  const n = Math.min(spec.peek, state.deck.length)
  state.peeked = state.deck.slice(state.deck.length - n)
  events.push(
    `${spec.name}: next up — ${[...state.peeked].reverse().map(cardLabel).join(', ')}.`,
  )
}

/** Persimmon: rewind to just before the last swing; the next result stands. */
function reduceRetake(state: SimState, snapshot: MulliganSnapshot | null, events: string[]): void {
  requirePlay(state)
  if (!snapshot) throw new SimError('there is nothing to retake')
  state.deck = snapshot.deck
  state.discard = snapshot.discard
  state.hand = snapshot.hand
  state.hole = snapshot.hole
  state.phase = snapshot.phase
  state.reshufflesThisRound = snapshot.reshufflesThisRound
  state.lastStroke = null
  events.push("Persimmon says that one didn't count. Play it again.")
}

/** Ceremony: hire from the offer, or walk on (run start requires a pick). */
function reduceCaddie(state: SimState, pick: CaddieId | null, events: string[]): void {
  if (state.phase !== 'ceremony') throw new SimError('there is no caddie offer right now')
  state.lastStroke = null
  if (pick !== null) {
    if (!state.offers.includes(pick)) throw new SimError('that caddie is not on offer')
    if (state.caddies.length >= 4) throw new SimError('four caddies is plenty')
    state.caddies.push(pick)
    events.push(`${CADDIES[pick].name} joins the bag. ${CADDIES[pick].effect}`)
  } else {
    if (state.caddies.length === 0) throw new SimError('pick a caddie to start the run')
    events.push('Walked past the caddie yard.')
  }
  state.offers = []
  startHole(state, state.scores.length)
}

/** Pure reducer: same state + same action → same next state. */
export function reduce(state: SimState, action: SimAction): SimState {
  return reduceInPlace(structuredClone(state) as SimState, action)
}

/**
 * The reducer without the defensive clone — identical semantics, mutates its
 * input. For the Monte Carlo harness and other tight loops that own their
 * state. UI code should use reduce().
 */
export function reduceInPlace(state: SimState, action: SimAction): SimState {
  const next = state
  next.lastEvents = []
  const events = next.lastEvents
  // Ephemeral windows close on the next action.
  const snapshot = next.mulligan
  next.mulligan = null
  next.peeked = []
  switch (action.type) {
    case 'swing':
      reduceSwing(next, action.cards, action.club, action.wild, events)
      break
    case 'putt':
      reducePutt(next, action.cards, action.aceValues, action.club, events)
      break
    case 'reroll':
      reduceReroll(next, action.club, events)
      break
    case 'punch':
      reducePunch(next, action.club, action.discard, events)
      break
    case 'peek':
      reducePeek(next, action.club, events)
      break
    case 'retake':
      reduceRetake(next, snapshot, events)
      break
    case 'caddie':
      reduceCaddie(next, action.pick, events)
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
  wild?: WildDecl,
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
  if (clubSpec?.fixedDistance !== undefined && cards.length !== 1) {
    throw new SimError(`${clubSpec.name} plays exactly 1 card`)
  }
  const hand: HandEval = evaluateHand(applyWild(cards, wild, clubSpec))
  let rules = effectiveRules(state, ball.lie)
  if (clubSpec?.lieNeutral) rules = { ...rules, mult: 1.0 }
  if (clubSpec?.cardCapBonus && (ball.lie === 'rough' || ball.lie === 'deepRough')) {
    rules = { ...rules, maxCards: rules.maxCards + clubSpec.cardCapBonus }
  }
  assertSwingLegal(ball.lie, hand, rules)
  if (clubSpec?.fixedDistance !== undefined) {
    return {
      rank: hand.rank,
      effBase: clubSpec.fixedDistance,
      min: clubSpec.fixedDistance,
      max: clubSpec.fixedDistance,
      scatter: 0,
      skidPossible: false,
      junk: false,
    }
  }
  const mods = clubModsFor(hand, clubSpec)
  const caddie = caddieSwing(state, hand)
  if (clubSpec?.windImmune) {
    caddie.windStrength = 0
    caddie.mods.dragStrength = 0
  }
  const p = previewSwing(hand, ball.lie, state.hole.wind, caddie.windStrength, rules, mods, caddie.mods)
  if (clubSpec?.capAtGreenFront) {
    const cap = ball.side === 'short' ? Math.max(1, ball.remaining - GREEN_WINDOW) : ball.remaining
    return { ...p, min: Math.min(p.min, cap), max: Math.min(p.max, cap) }
  }
  return p
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
