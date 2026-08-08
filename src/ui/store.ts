import { create } from 'zustand'
import {
  CLUBS,
  COURSES,
  DEFAULT_BAG,
  DEFAULT_CONFIG,
  DEFAULT_COURSE,
  policyAction,
  reduceInPlace,
  seedStream,
  initRound,
  reduce,
  replay,
  SimError,
  SUNNYVALE_FRONT_9,
  SUNNYVALE_RUN,
  tierConfig,
  cardFromId,
  type CaddieId,
  type CardId,
  type ClubId,
  type CourseId,
  type PutterId,
  type RunConfig,
  type RunEndReason,
  type SimAction,
  type SimState,
  type Suit,
} from '../sim/index'
import {
  clearRun,
  loadDaily,
  loadMeta,
  loadRun,
  saveDaily,
  saveMeta,
  saveRun,
  type SavedRun,
} from './storage'
import { LESSON_COURSE, LESSON_SEED, type LessonStep } from './lesson'
import { applyPrefs, buzz, loadPrefs, savePrefs, type Prefs } from './prefs'
import { playCardTap, playHoled, playLand, playSplash, playThock } from './sound'

function freshSeed(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return `web-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

export interface HoleDone {
  score: number
  par: number
  name: string
  runEnd: RunEndReason | null
  totals: { strokes: number; toPar: number; unlocked: number | null } | null
}

export type GameMode = 'tour' | 'daily' | 'match'

export interface Ghost {
  name: string
  scores: number[]
}

/** UTC date string — the whole world plays the same Daily (GDD §11). */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function dailySeed(date: string): string {
  return `daily-${date}`
}

export function dailyCourse(date: string): CourseId {
  const n = Number(date.replaceAll('-', ''))
  const ids = Object.keys(COURSES) as CourseId[]
  return ids[n % ids.length]!
}

/** Match status vs a ghost: positive = player up. */
export function matchStatus(scores: number[], ghost: Ghost): { up: number; thru: number } {
  let up = 0
  const thru = Math.min(scores.length, ghost.scores.length)
  for (let i = 0; i < thru; i++) {
    if (scores[i]! < ghost.scores[i]!) up++
    else if (scores[i]! > ghost.scores[i]!) up--
  }
  return { up, thru }
}

/** Practice mode sentinel tier. */
export const PRACTICE = 0

const BAG_KEY = 'pokergolf.bag.v1'

export interface BagPrefs {
  bag: ClubId[]
  putter: PutterId
}

export function loadBagPrefs(): BagPrefs {
  try {
    const raw = localStorage.getItem(BAG_KEY)
    if (raw) {
      const p = JSON.parse(raw) as BagPrefs
      if (Array.isArray(p.bag) && p.bag.length === 5 && p.bag.every((id) => id in CLUBS)) return p
    }
  } catch {
    /* default */
  }
  return { bag: [...DEFAULT_BAG], putter: 'blade' }
}

export function saveBagPrefs(prefs: BagPrefs): void {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(prefs))
  } catch {
    /* best effort */
  }
}

const COURSE_KEY = 'pokergolf.course.v1'

export function loadCoursePref(): CourseId {
  try {
    const raw = localStorage.getItem(COURSE_KEY)
    if (raw && raw in COURSES) return raw as CourseId
  } catch {
    /* default */
  }
  return DEFAULT_COURSE
}

export function saveCoursePref(id: CourseId): void {
  try {
    localStorage.setItem(COURSE_KEY, id)
  } catch {
    /* best effort */
  }
}

function courseFor(tier: number): typeof SUNNYVALE_RUN {
  const spec = COURSES[loadCoursePref()]
  return tier === PRACTICE ? spec.front9 : spec.run
}

function configFor(tier: number): RunConfig {
  const base = tier === PRACTICE ? { ...DEFAULT_CONFIG } : tierConfig(tier)
  const prefs = loadBagPrefs()
  return { ...base, bag: [...prefs.bag], putter: prefs.putter }
}

interface UIStore {
  screen: 'title' | 'shop' | 'game'
  pendingTier: number
  prefs: Prefs
  settingsOpen: boolean
  /** Active onboarding step, or null outside the lesson. */
  lesson: LessonStep | null
  mode: GameMode
  ghost: Ghost | null
  sim: SimState
  tier: number
  actions: SimAction[]
  hasSave: boolean
  unlockedTier: number
  /** Snapshot before the last action — the canvas animates on this scene. */
  prevSim: SimState | null
  selected: CardId[]
  aceDecls: Record<CardId, 1 | 14>
  /** Armed club for the next swing (or discard/ground mode). */
  armedClub: ClubId | null
  /** Hybrid wildcard declaration, applied to the first selected card. */
  wildDecl: { rank: number; suit: Suit } | null
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
  setWild(rank: number, suit: Suit): void
  play(): void
  retake(): void
  pickCaddie(pick: CaddieId | null): void
  animationDone(): void
  nextHole(): void
  openShop(tier: number): void
  startRun(tier: number): void
  continueRun(): void
  toTitle(): void
  setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void
  toggleSettings(open: boolean): void
  startLesson(): void
  startDaily(): void
  startMatch(): void
  shareDaily(): void
}

function strokeDurationMs(sim: SimState): number {
  const s = sim.lastStroke
  if (!s) return 400
  if (s.kind === 'putt') return 450 + s.rolledFt * 9
  let ms = 500 + s.struck * 1.4
  if (s.finalPos !== s.landedPos) ms += 550 // splash/OOB return leg
  return Math.min(ms, 2400)
}

const bootMeta = loadMeta()
const bootPrefs = loadPrefs()
if (typeof document !== 'undefined') applyPrefs(bootPrefs)

const LESSON_DONE_KEY = 'pokergolf.lesson.v1'
export function lessonDone(): boolean {
  try {
    return localStorage.getItem(LESSON_DONE_KEY) === '1'
  } catch {
    return true
  }
}
function markLessonDone(): void {
  try {
    localStorage.setItem(LESSON_DONE_KEY, '1')
  } catch {
    /* fine */
  }
}

export const useGame = create<UIStore>((set, get) => {
  /** Apply an action to the sim, log it, autosave. Returns the next state or null. */
  function dispatch(action: SimAction): SimState | null {
    const { sim, tier, actions, mode } = get()
    try {
      const next = reduce(sim, action)
      const log = [...actions, action]
      if (mode === 'daily') {
        // One attempt: progress is recorded, never resumable.
        const done = next.scores.length
        const par = next.holes.slice(0, done).reduce((a, h) => a + h.par, 0)
        const total = next.scores.reduce((a, b) => a + b, 0)
        const rec = loadDaily()
        if (rec) {
          const finished = next.phase === 'runComplete'
          saveDaily({
            ...rec,
            finished,
            holes: done,
            toPar: done > 0 ? total - par : null,
            streak: finished && next.runEnd === 'complete' ? rec.streak + 1 : rec.streak,
          })
        }
      } else if (mode === 'tour') {
        if (next.phase === 'runComplete') {
          clearRun()
          if (next.runEnd === 'complete' && tier !== PRACTICE) {
            const meta = loadMeta()
            if (tier === meta.unlockedTier && tier < 8) {
              saveMeta({ v: 1, unlockedTier: tier + 1 })
              set({ unlockedTier: tier + 1 })
            }
          }
        } else if (tier !== PRACTICE) {
          saveRun({ v: 1, seed: sim.seed, tier, course: loadCoursePref(), actions: log })
        }
      }
      set({ actions: log, hasSave: loadRun() !== null })
      return next
    } catch (e) {
      if (e instanceof SimError) {
        set({ error: e.message })
        return null
      }
      throw e
    }
  }

  return {
    screen: 'title',
    pendingTier: 1,
    prefs: bootPrefs,
    settingsOpen: false,
    lesson: null,
    mode: 'tour' as GameMode,
    ghost: null,
    sim: initRound('title-bg', SUNNYVALE_FRONT_9),
    tier: PRACTICE,
    actions: [],
    hasSave: loadRun() !== null,
    unlockedTier: bootMeta.unlockedTier,
    prevSim: null,
    selected: [],
    aceDecls: {},
    armedClub: null,
    wildDecl: null,
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
      const armedSpec = armedClub ? CLUBS[armedClub] : undefined
      const max =
        armedClub === 'punchIron' || armedSpec?.texasWedge
          ? 2
          : armedSpec?.fixedDistance !== undefined
            ? 1
            : sim.phase === 'putt'
              ? sim.config.puttMaxCards + (sim.config.putter === 'blade' ? 1 : 0)
              : 5
      if (selected.length >= max) return
      if (get().prefs.sound) playCardTap()
      set({ selected: [...selected, id], error: null })
    },

    toggleClub(id) {
      const { armedClub, animating, done } = get()
      if (animating || done) return
      if (armedClub === id) {
        set({ armedClub: null, error: null })
        return
      }
      const spec = CLUBS[id]
      if (spec.kind === 'passive') return
      if (id === 'sevenIron') {
        const prev = get().sim
        const next = dispatch({ type: 'reroll', club: id })
        if (next) {
          set({ sim: next, prevSim: prev, selected: [], aceDecls: {}, armedClub: null, error: null })
        }
        return
      }
      if (spec.peek) {
        const prev = get().sim
        const next = dispatch({ type: 'peek', club: id })
        if (next) set({ sim: next, prevSim: prev, armedClub: null, error: null })
        return
      }
      set({ armedClub: id, selected: [], wildDecl: null, error: null })
    },

    toggleAce(id) {
      const { aceDecls } = get()
      set({ aceDecls: { ...aceDecls, [id]: (aceDecls[id] ?? 1) === 1 ? 14 : 1 } })
    },

    setWild(rank, suit) {
      set({ wildDecl: { rank, suit }, error: null })
    },

    retake() {
      const { sim, animating } = get()
      if (animating || !sim.mulligan) return
      const next = dispatch({ type: 'retake' })
      if (next) set({ sim: next, prevSim: sim, selected: [], armedClub: null, error: null })
    },

    play() {
      const { sim, selected, aceDecls, animating, done, armedClub } = get()
      if (animating || done || selected.length === 0) return

      if (armedClub === 'punchIron') {
        const prev = sim
        const next = dispatch({ type: 'punch', club: 'punchIron', discard: selected })
        if (next) set({ sim: next, prevSim: prev, selected: [], armedClub: null, error: null })
        return
      }

      const armedSpec = armedClub ? CLUBS[armedClub] : undefined
      const isPutt =
        sim.phase === 'putt' || sim.hole?.ball?.lie === 'fringe' || armedSpec?.texasWedge === true
      const { wildDecl } = get()
      const wild =
        armedSpec?.wildcard && wildDecl && selected[0]
          ? { id: selected[0], rank: wildDecl.rank, suit: wildDecl.suit }
          : undefined
      const action: SimAction = isPutt
        ? {
            type: 'putt',
            cards: selected,
            aceValues: Object.fromEntries(
              selected
                .filter((id) => cardFromId(id).rank === 14)
                .map((id) => [id, aceDecls[id] ?? 1]),
            ),
            ...(armedSpec?.texasWedge ? { club: armedClub! } : {}),
          }
        : {
            type: 'swing',
            cards: selected,
            ...(armedClub ? { club: armedClub } : {}),
            ...(wild ? { wild } : {}),
          }
      const prev = sim
      const next = dispatch(action)
      if (next) {
        const { prefs, lesson } = get()
        if (prefs.sound && next.lastStroke?.kind === 'swing') {
          try {
            playThock(previewRankOf(selected, next))
          } catch {
            /* audio is garnish */
          }
        }
        let lessonNext = lesson
        if (lesson === 'swingBig' && next.lastStroke?.kind === 'swing') {
          lessonNext = next.lastStroke.outcome === 'oob' ? 'aim' : 'natural'
        } else if ((lesson === 'aim' || lesson === 'natural') && next.phase === 'putt') {
          lessonNext = 'putt'
        }
        if (lesson && next.scores.length > 0) {
          lessonNext = 'graduate'
          markLessonDone()
        }
        set({
          prevSim: prev,
          sim: next,
          selected: [],
          aceDecls: {},
          armedClub: null,
          wildDecl: null,
          animating: true,
          animSeq: get().animSeq + 1,
          animMs: strokeDurationMs(next),
          error: null,
          lesson: lessonNext,
        })
      }
    },

    pickCaddie(pick) {
      const prev = get().sim
      const next = dispatch({ type: 'caddie', pick })
      if (next) {
        set({ sim: next, prevSim: prev, selected: [], armedClub: null, error: null })
      }
    },

    animationDone() {
      const { sim, prevSim, tier, unlockedTier, prefs } = get()
      const stroke = sim.lastStroke
      if (stroke) {
        const holed = stroke.kind === 'putt' ? stroke.holed : stroke.outcome === 'holed'
        if (holed) {
          if (prefs.sound) playHoled()
          buzz(prefs, 30)
        } else if (stroke.kind === 'swing') {
          if (prefs.sound) {
            if (stroke.outcome === 'water') playSplash()
            else playLand()
          }
          buzz(prefs, 10)
        }
      }
      const holeFinished = prevSim !== null && sim.scores.length > prevSim.scores.length
      const runOver = sim.phase === 'runComplete'
      if (!holeFinished && !runOver) {
        set({ animating: false })
        return
      }
      const idx = Math.max(0, sim.scores.length - 1)
      const spec = (prevSim ?? sim).holes[
        holeFinished ? idx : (prevSim?.hole?.index ?? 0)
      ]!
      const strokes = sim.scores.reduce((a, b) => a + b, 0)
      const parSoFar = sim.holes.slice(0, sim.scores.length).reduce((a, h) => a + h.par, 0)
      set({
        animating: false,
        done: {
          score: holeFinished ? sim.scores[idx]! : 0,
          par: spec.par,
          name: spec.name,
          runEnd: runOver ? sim.runEnd : null,
          totals: runOver
            ? {
                strokes,
                toPar: strokes - parSoFar,
                unlocked:
                  sim.runEnd === 'complete' && tier !== PRACTICE && unlockedTier === tier + 1
                    ? unlockedTier
                    : null,
              }
            : null,
        },
      })
    },

    nextHole() {
      set({ done: null, selected: [], aceDecls: {}, armedClub: null, prevSim: null })
    },

    openShop(tier) {
      set({ screen: 'shop', pendingTier: tier })
    },

    startRun(tier) {
      const seed = freshSeed()
      const sim = initRound(seed, courseFor(tier), configFor(tier))
      if (tier === PRACTICE) clearRun()
      else saveRun({ v: 1, seed, tier, course: loadCoursePref(), actions: [] })
      set({
        screen: 'game',
        sim,
        tier,
        actions: [],
        hasSave: tier !== PRACTICE,
        mode: 'tour',
        ghost: null,
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

    continueRun() {
      const saved: SavedRun | null = loadRun()
      if (!saved) return
      try {
        if (saved.course && saved.course in COURSES) saveCoursePref(saved.course as CourseId)
        const sim = replay(saved.seed, courseFor(saved.tier), saved.actions, configFor(saved.tier))
        if (sim.phase === 'runComplete') throw new Error('finished run')
        set({
          screen: 'game',
          sim,
          tier: saved.tier,
          actions: saved.actions,
          hasSave: true,
          mode: 'tour',
          ghost: null,
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
      } catch {
        clearRun()
        set({ hasSave: false })
      }
    },

    toTitle() {
      set({ screen: 'title', done: null, lesson: null, hasSave: loadRun() !== null })
    },

    setPref(key, value) {
      const prefs = { ...get().prefs, [key]: value }
      savePrefs(prefs)
      set({ prefs })
    },

    toggleSettings(open) {
      set({ settingsOpen: open })
    },

    startLesson() {
      const sim = initRound(LESSON_SEED, LESSON_COURSE, { ...DEFAULT_CONFIG, windStrength: 0 })
      set({
        screen: 'game',
        sim,
        tier: PRACTICE,
        actions: [],
        hasSave: loadRun() !== null,
        mode: 'tour',
        ghost: null,
        prevSim: null,
        selected: [],
        aceDecls: {},
        armedClub: null,
        animating: false,
        animSeq: 0,
        animMs: 400,
        done: null,
        error: null,
        lesson: 'swingBig',
      })
    },

    startDaily() {
      const date = utcToday()
      const rec = loadDaily()
      if (rec?.date === date && rec.started) return // one attempt (GDD §11)
      const course = COURSES[dailyCourse(date)]
      const cfg = {
        ...tierConfig(3),
        bag: [...DEFAULT_BAG],
        putter: 'blade' as const,
      }
      const sim = initRound(dailySeed(date), course.run, cfg)
      // The attempt is burned the moment you tee off.
      const prevStreak = rec?.streak ?? 0
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const streak = rec?.date === yesterday || rec?.date === date ? prevStreak : 0
      saveDaily({ v: 1, date, started: true, finished: false, holes: 0, toPar: null, streak })
      set({
        screen: 'game',
        sim,
        tier: 3,
        actions: [],
        hasSave: loadRun() !== null,
        mode: 'daily',
        ghost: null,
        prevSim: null,
        selected: [],
        aceDecls: {},
        armedClub: null,
        animating: false,
        animSeq: 0,
        animMs: 400,
        done: null,
        error: null,
        lesson: null,
      })
    },

    startMatch() {
      const seed = freshSeed()
      const course = COURSES[loadCoursePref()]
      const cfg = { ...DEFAULT_CONFIG, bag: [...loadBagPrefs().bag], putter: loadBagPrefs().putter }
      // The Club Pro plays the same seed, bare-handed, before you do.
      const ghostCfg = { ...DEFAULT_CONFIG }
      let ghostSim = initRound(seed, course.run, ghostCfg)
      const rng = seedStream(seed, 'ghost-policy')
      let guard = 0
      while (ghostSim.phase !== 'runComplete' && guard++ < 900) {
        ghostSim = reduceInPlace(ghostSim, policyAction(ghostSim, 'optimal', rng))
      }
      const ghost: Ghost = { name: 'The Club Pro', scores: ghostSim.scores }
      const sim = initRound(seed, course.run, cfg)
      set({
        screen: 'game',
        sim,
        tier: PRACTICE,
        actions: [],
        hasSave: loadRun() !== null,
        mode: 'match',
        ghost,
        prevSim: null,
        selected: [],
        aceDecls: {},
        armedClub: null,
        animating: false,
        animSeq: 0,
        animMs: 400,
        done: null,
        error: null,
        lesson: null,
      })
    },

    shareDaily() {
      const rec = loadDaily()
      if (!rec) return
      const score =
        rec.toPar === null ? `out at ${rec.holes}` : rec.toPar === 0 ? 'E' : rec.toPar > 0 ? `+${rec.toPar}` : `${rec.toPar}`
      const text = `POKER GOLF daily ${rec.date}: ${score} thru ${rec.holes} · streak ${rec.streak}`
      try {
        void navigator.clipboard.writeText(text)
      } catch {
        /* clipboard may be unavailable */
      }
    },
  }
})

/** Best-effort hand rank of the just-played swing, for the thock pitch. */
function previewRankOf(
  cards: readonly CardId[],
  next: SimState,
): import('../sim/index').HandRank {
  void cards
  const line = next.lastEvents.find((e) => e.startsWith('Swung'))
  const names: [string, import('../sim/index').HandRank][] = [
    ['Royal Flush', 'royalFlush'],
    ['Straight Flush', 'straightFlush'],
    ['Four of a Kind', 'quads'],
    ['Full House', 'fullHouse'],
    ['Flush', 'flush'],
    ['Straight', 'straight'],
    ['Three of a Kind', 'trips'],
    ['Two Pair', 'twoPair'],
    ['Pair', 'pair'],
  ]
  for (const [label, rank] of names) {
    if (line?.includes(label)) return rank
  }
  return 'highCard'
}
