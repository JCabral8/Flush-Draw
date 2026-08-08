import { cardFromId, type CardId } from './cards'
import { previewSwingAction } from './engine'
import { HAND_ORDER } from './hands'
import { lieAt, waterDropPos } from './holes'
import { previewPutt } from './putting'
import { nextInt, type RngState } from './rng'
import { putterMaxCards } from './clubs'
import { SimError, type GreenState, type LayoutLie, type SimAction, type SimState } from './types'

/**
 * Balance-protocol policies (GDD §8 of the brief):
 *  - naive: random legal hand — the "decisions don't matter?" baseline
 *  - greedy: always the highest poker hand — the power fantasy baseline
 *  - optimal: minimize estimated strokes-to-go with a 2-ply-ish heuristic
 * Pure sim code (usable headless); policies never touch the sim's RNG
 * streams — they carry their own.
 */
export type PolicyName = 'naive' | 'greedy' | 'optimal'
export const POLICIES: readonly PolicyName[] = ['naive', 'greedy', 'optimal']

function* combinations(n: number, k: number): Generator<number[]> {
  const idx = Array.from({ length: k }, (_, i) => i)
  while (true) {
    yield idx.slice()
    let i = k - 1
    while (i >= 0 && idx[i]! === n - k + i) i--
    if (i < 0) return
    idx[i]!++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1]! + 1
  }
}

function subsets(hand: readonly CardId[], maxSize: number): CardId[][] {
  const out: CardId[][] = []
  for (let k = 1; k <= Math.min(maxSize, hand.length); k++) {
    for (const combo of combinations(hand.length, k)) {
      out.push(combo.map((i) => hand[i]!))
    }
  }
  return out
}

/** Estimated strokes to hole out from a full-swing position. */
function swingCost(remaining: number, lie: LayoutLie | 'fringe'): number {
  const lieAdd: Record<string, number> = {
    tee: 0,
    fairway: 0,
    rough: 0.3,
    deepRough: 0.6,
    bunker: 0.45,
    cartPath: 0.15,
    water: 1.2,
    fringe: 0.15,
  }
  return 1.2 + remaining / 160 + (lieAdd[lie] ?? 0)
}

/** Estimated strokes to hole out from the green. */
function puttCost(distFt: number, downhill: boolean): number {
  if (distFt <= 3) return 0
  return 1 + (distFt > 30 ? 0.55 : distFt > 12 ? 0.25 : 0.05) + (downhill ? 0.3 : 0)
}

/** Estimated total cost of a swing that travels exactly `struck` yards. */
function valueAfter(state: SimState, struck: number): number {
  const hole = state.hole!
  const ball = hole.ball!
  const spec = state.holes[hole.index]!
  const net = ball.side === 'short' ? ball.remaining - struck : struck - ball.remaining
  const side = net >= 0 ? 'short' : 'long'
  const rem = Math.abs(net)

  if (rem <= 1) return 0
  if (side === 'short') {
    if (rem <= 30) return puttCost(rem * 3, hole.pin === 'back')
    const pos = hole.effLength - rem
    const lie = lieAt(spec, pos)
    if (lie === 'water') {
      const drop = waterDropPos(spec, pos)
      return 1 + swingCost(hole.effLength - drop, 'fairway')
    }
    return swingCost(rem, lie)
  }
  if (rem <= state.config.fringeWindow) return puttCost(rem * 3, true) + 0.15
  // OOB: penalty stroke plus replaying the same shot situation.
  return 2 + swingCost(ball.remaining, ball.lie === 'fringe' ? 'fringe' : ball.lie)
}

function lowsSpent(cards: readonly CardId[]): number {
  return cards.filter((id) => cardFromId(id).rank <= 4).length
}

interface PuttCandidate {
  action: SimAction
  cost: number
}

function puttCandidates(state: SimState): PuttCandidate[] {
  const hole = state.hole!
  const maxCards = putterMaxCards(state.config.putter, state.config.puttMaxCards)
  const green: GreenState =
    state.phase === 'putt'
      ? hole.green!
      : { distFt: hole.ball!.remaining * 3, downhill: !state.caddies.includes('greenskeeper') }
  const out: PuttCandidate[] = []
  for (const cards of subsets(state.hand, maxCards)) {
    const aces = cards.filter((id) => cardFromId(id).rank === 14)
    const declCombos: Record<CardId, 1 | 14>[] = [{}]
    for (const ace of aces) {
      const next: Record<CardId, 1 | 14>[] = []
      for (const combo of declCombos) {
        next.push({ ...combo, [ace]: 1 }, { ...combo, [ace]: 14 })
      }
      declCombos.length = 0
      declCombos.push(...next)
    }
    for (const aceValues of declCombos) {
      const action: SimAction = { type: 'putt', cards, aceValues }
      const outcome = previewPutt(
        { type: 'putt', cards, aceValues },
        green,
        hole.pin,
        maxCards,
        state.config.gimmeFt,
      )
      const ranksSpent = cards.reduce((a, id) => {
        const r = cardFromId(id).rank
        return a + (r === 14 ? (aceValues[id] ?? 1) : r)
      }, 0)
      const cost = outcome.holed
        ? 1 - 0.002 * ranksSpent // sink it, and prefer burning big cards to do it
        : 2 +
          outcome.next!.distFt / 45 +
          (outcome.blewPast ? 0.35 : 0) +
          0.05 * lowsSpent(cards)
      out.push({ action, cost })
    }
  }
  return out
}

interface SwingCandidate {
  action: SimAction
  cost: number
  rankIdx: number
  pips: number
}

function swingCandidates(state: SimState): SwingCandidate[] {
  const out: SwingCandidate[] = []
  for (const cards of subsets(state.hand, 5)) {
    let preview
    try {
      preview = previewSwingAction(state, cards)
    } catch (e) {
      if (e instanceof SimError) continue
      throw e
    }
    const mid = Math.round((preview.min + preview.max) / 2)
    const cost =
      0.25 * (1 + valueAfter(state, preview.min)) +
      0.5 * (1 + valueAfter(state, mid)) +
      0.25 * (1 + valueAfter(state, preview.max)) +
      0.05 * lowsSpent(cards)
    out.push({
      action: { type: 'swing', cards },
      cost,
      rankIdx: HAND_ORDER.indexOf(preview.rank),
      pips: preview.effBase,
    })
  }
  return out
}

/**
 * Optimal's read on each caddie for a policy that plays bare hands and does
 * not manage the deck around rule-breakers. Silent Sam is a trap for it —
 * the first sweep showed it hiring him ~25% of runs and dying deck-dead.
 */
const CADDIE_VALUE: Partial<Record<string, number>> = {
  marguerite: 9,
  wanda: 8,
  tony: 7,
  wren: 6,
  nephew: 5,
  bobby: 5,
  penny: 4,
  greenskeeper: 4,
  statistician: 2,
  silentSam: -5,
}

function ceremonyPick(state: SimState, policy: PolicyName, rng: RngState): SimAction {
  const offers = state.offers
  if (policy === 'naive') return { type: 'caddie', pick: offers[nextInt(rng, offers.length)]! }
  if (policy === 'greedy') return { type: 'caddie', pick: offers[0]! }
  let best = offers[0]!
  for (const id of offers) {
    if ((CADDIE_VALUE[id] ?? 3) > (CADDIE_VALUE[best] ?? 3)) best = id
  }
  if ((CADDIE_VALUE[best] ?? 3) <= 0 && state.caddies.length > 0) {
    return { type: 'caddie', pick: null } // nothing worth hiring: walk on
  }
  return { type: 'caddie', pick: best }
}

/** Choose this policy's next action for the current state. Always legal. */
export function policyAction(state: SimState, policy: PolicyName, rng: RngState): SimAction {
  if (state.phase === 'ceremony') return ceremonyPick(state, policy, rng)
  const onGreen = state.phase === 'putt'
  const onFringe = !onGreen && state.hole?.ball?.lie === 'fringe'

  if (policy === 'naive') {
    // Random legal selection; retry on restriction (1-card is always legal).
    for (let attempt = 0; ; attempt++) {
      const putt = onGreen || (onFringe && nextInt(rng, 2) === 0)
      const maxCards = putt
        ? putterMaxCards(state.config.putter, state.config.puttMaxCards)
        : 5
      const size = attempt > 10 ? 1 : 1 + nextInt(rng, Math.min(maxCards, state.hand.length))
      const pool = state.hand.slice()
      const cards: CardId[] = []
      for (let i = 0; i < size; i++) {
        cards.push(pool.splice(nextInt(rng, pool.length), 1)[0]!)
      }
      if (putt) {
        const aceValues: Record<CardId, 1 | 14> = {}
        for (const id of cards) {
          if (cardFromId(id).rank === 14) aceValues[id] = nextInt(rng, 2) === 0 ? 1 : 14
        }
        return { type: 'putt', cards, aceValues }
      }
      try {
        previewSwingAction(state, cards)
        return { type: 'swing', cards }
      } catch (e) {
        if (e instanceof SimError) continue
        throw e
      }
    }
  }

  if (policy === 'greedy') {
    if (onGreen) {
      // Biggest single card, ace high, always.
      const best = state.hand.reduce((a, b) => (cardFromId(b).rank > cardFromId(a).rank ? b : a))
      const aceValues: Record<CardId, 1 | 14> = {}
      if (cardFromId(best).rank === 14) aceValues[best] = 14
      return { type: 'putt', cards: [best], aceValues }
    }
    const candidates = swingCandidates(state)
    candidates.sort((a, b) => b.rankIdx - a.rankIdx || b.pips - a.pips)
    return candidates[0]!.action
  }

  // optimal
  if (onGreen || onFringe) {
    const putts = puttCandidates(state)
    let best = putts[0]!
    for (const c of putts) if (c.cost < best.cost) best = c
    if (onFringe) {
      // A fringe swing is occasionally better than a downhill putt — compare.
      const swings = swingCandidates(state)
      let bestSwing = swings[0]
      for (const c of swings) if (bestSwing === undefined || c.cost < bestSwing.cost) bestSwing = c
      if (bestSwing && bestSwing.cost < best.cost) return bestSwing.action
    }
    return best.action
  }
  const candidates = swingCandidates(state)
  let best = candidates[0]!
  for (const c of candidates) if (c.cost < best.cost) best = c
  return best.action
}
