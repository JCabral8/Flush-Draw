/**
 * Milestone 1 CLI: plays a full 9-hole round with random legal inputs.
 *
 *   npm run sim -- --seed muni --quiet
 *
 * The policy is deliberately naive (random legal selections) — it exists to
 * prove the sim has no dead-end states and to give the balance harness (M6)
 * its "Naive" baseline. Uses its own RNG stream so it never perturbs the sim.
 */
import {
  initRound,
  reduce,
  SimError,
  SUNNYVALE_FRONT_9,
  seedStream,
  nextInt,
  cardFromId,
  type CardId,
  type SimAction,
  type SimState,
  type RngState,
} from '../src/sim/index'

function parseArgs(argv: string[]): { seed: string; quiet: boolean } {
  let seed = `cli-${process.pid}`
  let quiet = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--seed') seed = argv[++i] ?? seed
    if (argv[i] === '--quiet') quiet = true
  }
  return { seed, quiet }
}

function randomSubset(hand: readonly CardId[], size: number, rng: RngState): CardId[] {
  const pool = hand.slice()
  const out: CardId[] = []
  for (let i = 0; i < size && pool.length > 0; i++) {
    out.push(pool.splice(nextInt(rng, pool.length), 1)[0]!)
  }
  return out
}

/** Pick a random legal action by rejection — guaranteed to terminate because a
 * 1-card play is always legal (GDD §2.1). */
function randomAction(state: SimState, rng: RngState): SimAction {
  const onGreen = state.phase === 'putt'
  for (let attempt = 0; ; attempt++) {
    const maxSize = onGreen ? state.config.puttMaxCards : 5
    const size = attempt > 20 ? 1 : 1 + nextInt(rng, maxSize)
    const cards = randomSubset(state.hand, size, rng)
    const action: SimAction = onGreen
      ? { type: 'putt', cards, aceValues: aceDecls(cards, rng) }
      : { type: 'swing', cards }
    try {
      reduce(state, action)
      return action
    } catch (e) {
      if (e instanceof SimError) continue
      throw e
    }
  }
}

function aceDecls(cards: readonly CardId[], rng: RngState): Record<CardId, 1 | 14> {
  const decls: Record<CardId, 1 | 14> = {}
  for (const id of cards) {
    if (cardFromId(id).rank === 14) decls[id] = nextInt(rng, 2) === 0 ? 1 : 14
  }
  return decls
}

const { seed, quiet } = parseArgs(process.argv.slice(2))
const policyRng = seedStream(seed, 'cli-policy')

let state = initRound(seed, SUNNYVALE_FRONT_9)
if (!quiet) for (const line of state.lastEvents) console.log(line)

let actions = 0
while (state.phase !== 'runComplete') {
  const action = randomAction(state, policyRng)
  state = reduce(state, action)
  actions++
  if (!quiet) for (const line of state.lastEvents) console.log(`  ${line}`)
  if (actions > 500) throw new Error('runaway round — dead-end suspected')
}

const pars = SUNNYVALE_FRONT_9.map((h) => h.par)
const total = state.scores.reduce((a, b) => a + b, 0)
const parTotal = pars.reduce((a, b) => a + b, 0)
console.log('\n  #  par  strokes')
state.scores.forEach((s, i) => console.log(`  ${i + 1}    ${pars[i]}     ${s}`))
console.log(`\nSeed "${seed}": ${total} strokes (${total - parTotal >= 0 ? '+' : ''}${total - parTotal}) in ${actions} actions.`)
