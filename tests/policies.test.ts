import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  initRound,
  POLICIES,
  policyAction,
  reduce,
  seedStream,
  SUNNYVALE_FRONT_9,
  SUNNYVALE_RUN,
  tierConfig,
  type SimState,
} from '../src/sim/index'

function playOut(
  seed: string,
  policy: (typeof POLICIES)[number],
  holes = SUNNYVALE_FRONT_9,
  config = { ...DEFAULT_CONFIG },
): SimState {
  let st = initRound(seed, holes, config)
  const rng = seedStream(seed, `t-${policy}`)
  let guard = 0
  while (st.phase !== 'runComplete' && guard++ < 600) {
    st = reduce(st, policyAction(st, policy, rng))
  }
  return st
}

describe('policies: always legal, always terminate', () => {
  it.each(POLICIES.map((p) => [p] as const))('%s finishes a 9-hole practice round', (policy) => {
    for (const seed of ['p1', 'p2', 'p3']) {
      const st = playOut(`${seed}-${policy}`, policy)
      expect(st.phase).toBe('runComplete')
      expect(st.scores.length).toBe(9)
    }
  })

  it.each(POLICIES.map((p) => [p] as const))('%s survives a tier-1 tour run shape', (policy) => {
    const st = playOut(`tour-${policy}`, policy, SUNNYVALE_RUN, tierConfig(1))
    expect(st.phase).toBe('runComplete')
    expect(st.runEnd).not.toBeNull()
  })

  it('policies are deterministic given the same seed', () => {
    const a = playOut('det', 'optimal')
    const b = playOut('det', 'optimal')
    expect(a.scores).toEqual(b.scores)
  })

  it('optimal beats naive on the practice 9 (same seeds)', () => {
    let optimal = 0
    let naive = 0
    for (const seed of ['m1', 'm2', 'm3', 'm4', 'm5']) {
      optimal += playOut(seed, 'optimal').scores.reduce((x, y) => x + y, 0)
      naive += playOut(seed, 'naive').scores.reduce((x, y) => x + y, 0)
    }
    expect(optimal).toBeLessThan(naive)
  })

  it('the preview enforces lie restrictions (the bug the harness caught)', () => {
    const st = initRound('lie-check', SUNNYVALE_FRONT_9)
    st.hole!.ball = { remaining: 200, side: 'short', lie: 'rough' }
    st.hand = ['2S', '2H', '3D', '3C', '4S', '4H', '5D']
    expect(() =>
      reduce(st, { type: 'swing', cards: ['2S', '2H', '3D', '3C', '4S'] }),
    ).toThrow(/at most 4/)
  })
})
