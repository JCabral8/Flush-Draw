import { create } from 'zustand'
import {
  CLUBS,
  initRound,
  reduce,
  SimError,
  SUNNYVALE_FRONT_9,
  cardFromId,
  type CardId,
  type ClubId,
  type SimAction,
  type SimState,
} from '../sim/index'

function freshSeed(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return `web-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

export interface HoleDone {
  score: number
  par: number
  name: string
  roundOver: boolean
  totals: { strokes: number; toPar: number } | null
}

interface UIStore {
  sim: SimState
  /** Snapshot before the last action — the canvas animates on this scene. */
  prevSim: SimState | null
  selected: CardId[]
  aceDecls: Record<CardId, 1 | 14>
  /** Armed club for the next swing (or 'punchIron' = discard mode). */
  armedClub: ClubId | null
  animating: boolean
  /** Bumps once per accepted action; the canvas reacts to it. */
  animSeq: number
  /** Suggested animation length for the last stroke (canvas + counter agree). */
  animMs: number
  done: HoleDone | null
  error: string | null

  toggleCard(id: CardId): void
  toggleAce(id: CardId): void
  toggleClub(id: ClubId): void
  play(): void
  animationDone(): void
  nextHole(): void
  newRound(): void
}

function strokeDurationMs(sim: SimState): number {
  const s = sim.lastStroke
  if (!s) return 400
  if (s.kind === 'putt') return 450 + s.rolledFt * 9
  let ms = 500 + s.struck * 1.4
  if (s.finalPos !== s.landedPos) ms += 550 // splash/OOB return leg
  return Math.min(ms, 2400)
}

export const useGame = create<UIStore>((set, get) => ({
  sim: initRound(freshSeed(), SUNNYVALE_FRONT_9),
  prevSim: null,
  selected: [],
  aceDecls: {},
  armedClub: null,
  animating: false,
  animSeq: 0,
  animMs: 400,
  done: null,
  error: null,

  toggleCard(id) {
    const { sim, selected, animating, done, armedClub } = get()
    if (animating || done) return
    if (selected.includes(id)) {
      set({ selected: selected.filter((c) => c !== id), error: null })
      return
    }
    const max =
      armedClub === 'punchIron'
        ? 2
        : sim.phase === 'putt'
          ? sim.config.puttMaxCards + (sim.config.putter === 'blade' ? 1 : 0)
          : 5
    if (selected.length >= max) return
    set({ selected: [...selected, id], error: null })
  },

  toggleClub(id) {
    const { sim, armedClub, animating, done } = get()
    if (animating || done) return
    if (armedClub === id) {
      set({ armedClub: null, error: null })
      return
    }
    const spec = CLUBS[id]
    if (spec.kind === 'passive') return
    if (id === 'sevenIron') {
      // Instant: reroll now.
      try {
        const next = reduce(sim, { type: 'reroll', club: id })
        set({ sim: next, prevSim: sim, selected: [], aceDecls: {}, armedClub: null, error: null })
      } catch (e) {
        if (e instanceof SimError) set({ error: e.message })
        else throw e
      }
      return
    }
    // Punch Iron arms discard mode; swing clubs arm the next swing.
    set({ armedClub: id, selected: [], error: null })
  },

  toggleAce(id) {
    const { aceDecls } = get()
    set({ aceDecls: { ...aceDecls, [id]: (aceDecls[id] ?? 1) === 1 ? 14 : 1 } })
  },

  play() {
    const { sim, selected, aceDecls, animating, done, armedClub } = get()
    if (animating || done || selected.length === 0) return

    if (armedClub === 'punchIron') {
      try {
        const next = reduce(sim, { type: 'punch', club: 'punchIron', discard: selected })
        set({ sim: next, prevSim: sim, selected: [], armedClub: null, error: null })
      } catch (e) {
        if (e instanceof SimError) set({ error: e.message })
        else throw e
      }
      return
    }

    const isPutt = sim.phase === 'putt' || sim.hole?.ball?.lie === 'fringe'
    const action: SimAction = isPutt
      ? {
          type: 'putt',
          cards: selected,
          aceValues: Object.fromEntries(
            selected.filter((id) => cardFromId(id).rank === 14).map((id) => [id, aceDecls[id] ?? 1]),
          ),
        }
      : { type: 'swing', cards: selected, ...(armedClub ? { club: armedClub } : {}) }
    try {
      const next = reduce(sim, action)
      set({
        prevSim: sim,
        sim: next,
        selected: [],
        aceDecls: {},
        armedClub: null,
        animating: true,
        animSeq: get().animSeq + 1,
        animMs: strokeDurationMs(next),
        error: null,
      })
    } catch (e) {
      if (e instanceof SimError) set({ error: e.message })
      else throw e
    }
  },

  animationDone() {
    const { sim, prevSim } = get()
    const holeFinished = prevSim !== null && sim.scores.length > prevSim.scores.length
    if (holeFinished) {
      const idx = sim.scores.length - 1
      const spec = prevSim.holes[idx]!
      const roundOver = sim.phase === 'roundComplete'
      const strokes = sim.scores.reduce((a, b) => a + b, 0)
      const parSoFar = sim.holes.slice(0, sim.scores.length).reduce((a, h) => a + h.par, 0)
      set({
        animating: false,
        done: {
          score: sim.scores[idx]!,
          par: spec.par,
          name: spec.name,
          roundOver,
          totals: roundOver ? { strokes, toPar: strokes - parSoFar } : null,
        },
      })
    } else {
      set({ animating: false })
    }
  },

  nextHole() {
    set({ done: null, selected: [], aceDecls: {}, armedClub: null, prevSim: null })
  },

  newRound() {
    set({
      sim: initRound(freshSeed(), SUNNYVALE_FRONT_9),
      prevSim: null,
      selected: [],
      aceDecls: {},
      armedClub: null,
      animating: false,
      animSeq: 0,
      animMs: 400,
      done: null,
      error: null,
    })
  },
}))
