import type { CardId, Suit } from './cards'
import type { RngState } from './rng'

/** Lies a hole layout may author. Green/fringe/OOB are positional, not authored. */
export type LayoutLie = 'tee' | 'fairway' | 'rough' | 'deepRough' | 'bunker' | 'water' | 'cartPath'

/** Lies a ball can actually sit on for a full swing. */
export type SwingLie = Exclude<LayoutLie, 'water'> | 'fringe'

export type Pin = 'front' | 'center' | 'back'

export interface HoleSegment {
  from: number
  to: number // inclusive, yards from tee
  lie: LayoutLie
}

export interface HoleSpec {
  id: string
  name: string
  par: 3 | 4 | 5
  /** Base length in yards; pin shifts it ±12 (GDD §5). */
  length: number
  flavor: string
  /** Must tile [0, length-31] contiguously. Uncovered positions default to fairway. */
  segments: HoleSegment[]
  /** Signature-hole overrides (used sparingly). */
  windBias?: Suit
  pinBias?: Pin
}

export interface RunConfig {
  /** Wind strength, e.g. 0.15 for ±15% (tier-scaled, GDD §12). */
  windStrength: number
  /** Pin roll weights (integers). */
  pinWeights: { front: number; center: number; back: number }
  handSize: number
  /** Max cards on a putt (baseline 2; Blade putter grants 3 in M3). */
  puttMaxCards: number
  /** Holed when within this many feet after a putt / 1 yd on approach. */
  gimmeFt: number
  /** Stroke penalty when the deck reshuffles. */
  reshufflePenalty: number
  /** Pick-up cap: hole scored par + this (GDD §3.7 / D5). */
  capOverPar: number
}

export const DEFAULT_CONFIG: RunConfig = {
  windStrength: 0.15,
  pinWeights: { front: 40, center: 40, back: 20 },
  handSize: 7,
  puttMaxCards: 2,
  gimmeFt: 3,
  reshufflePenalty: 1,
  capOverPar: 4,
}

export interface Wind {
  boost: Suit
  drag: Suit
}

export interface BallState {
  /** Yards to the cup (always ≥ 0). */
  remaining: number
  /** 'long' only ever means the fringe (past-fringe is OOB'd back). */
  side: 'short' | 'long'
  lie: SwingLie
}

export interface GreenState {
  distFt: number
  /** Set by a back pin, by putting from the fringe, or by any blown putt. */
  downhill: boolean
}

export interface HoleLive {
  index: number
  wind: Wind
  pin: Pin
  /** length + pin shift. */
  effLength: number
  strokes: number
  ball: BallState | null // null once on the green
  green: GreenState | null
}

export type Phase = 'swing' | 'putt' | 'roundComplete'

export interface RngStreams {
  deck: RngState
  wind: RngState
  scatter: RngState
  cart: RngState
  caddie: RngState
}

export interface SimState {
  v: 1
  seed: string
  config: RunConfig
  rng: RngStreams
  holes: HoleSpec[]
  deck: CardId[]
  discard: CardId[]
  hand: CardId[]
  hole: HoleLive | null
  /** Strokes per completed hole (absolute, penalties included, capped). */
  scores: number[]
  phase: Phase
  /** Narration of what the last action did (UI/CLI); replaced each action. */
  lastEvents: string[]
}

export type SimAction =
  | { type: 'swing'; cards: CardId[] }
  | { type: 'putt'; cards: CardId[]; aceValues?: Record<CardId, 1 | 14> }

/** Thrown on illegal actions. UI pre-validates; CLI/tests catch. */
export class SimError extends Error {
  override readonly name = 'SimError'
}
