import type { CardId, Suit } from './cards'
import type { CaddieId } from './caddies'
import { DEFAULT_BAG, type ClubId, type PutterId } from './clubs'
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
  /** The bag: up to 5 clubs (GDD §7). */
  bag: ClubId[]
  /** Putter variant in the free sixth slot. */
  putter: PutterId
  /** Yards past the cup that are fringe rather than OOB (tier-tightened). */
  fringeWindow: number
  /** Cut lines: cumulative-to-par ceilings checked after these hole counts. */
  cuts: { afterHole: number; maxToPar: number }[]
  /** Caddie roster for this run; empty = no caddies (practice/tests). */
  caddiePool: CaddieId[]
  /** Caddies offered per ceremony. */
  caddieOfferCount: number
}

export const DEFAULT_CONFIG: RunConfig = {
  windStrength: 0.15,
  pinWeights: { front: 40, center: 40, back: 20 },
  handSize: 7,
  puttMaxCards: 2,
  gimmeFt: 3,
  reshufflePenalty: 1,
  capOverPar: 4,
  bag: [...DEFAULT_BAG],
  putter: 'blade',
  fringeWindow: 20,
  cuts: [],
  caddiePool: [],
  caddieOfferCount: 3,
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

export type Phase = 'swing' | 'putt' | 'ceremony' | 'runComplete'

export type RunEndReason = 'complete' | 'missedCut' | 'deckDead'

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
  /** Physics of the last action, for animation. Replaced each action. */
  lastStroke: StrokeResult | null
  /** Remaining round charges for finite-charge clubs in the bag. */
  clubCharges: Partial<Record<ClubId, number>>
  /** Per-hole club uses (Driver); reset at each tee. */
  clubUsedThisHole: Partial<Record<ClubId, number>>
  /** Caddies on the bag (max 4). */
  caddies: CaddieId[]
  /** Current ceremony offer (phase === 'ceremony'). */
  offers: CaddieId[]
  /** Why the run ended (phase === 'runComplete'). */
  runEnd: RunEndReason | null
  /** Reshuffles taken this round (Lucky Penny forgives the first). */
  reshufflesThisRound: number
  /** Persimmon: pre-stroke snapshot; a 'retake' action restores it. */
  mulligan: MulliganSnapshot | null
  /** Mashie: deck cards revealed by the last peek (top of deck last). */
  peeked: CardId[]
}

export interface MulliganSnapshot {
  deck: CardId[]
  discard: CardId[]
  hand: CardId[]
  hole: HoleLive
  phase: Phase
  reshufflesThisRound: number
}

export interface WildDecl {
  /** The selected card being declared. */
  id: CardId
  rank: number
  suit: Suit
}

export type SimAction =
  | { type: 'swing'; cards: CardId[]; club?: ClubId; wild?: WildDecl }
  | { type: 'putt'; cards: CardId[]; aceValues?: Record<CardId, 1 | 14>; club?: ClubId }
  | { type: 'reroll'; club: ClubId }
  | { type: 'punch'; club: ClubId; discard: CardId[] }
  | { type: 'peek'; club: ClubId }
  | { type: 'retake' }
  | { type: 'caddie'; pick: CaddieId | null }

/**
 * What the last action physically did — part of state so the UI animates the
 * truth (positions in yards from the tee; past-cup positions exceed effLength).
 */
export interface SwingResult {
  kind: 'swing'
  struck: number
  fromPos: number
  /** Where the ball first came down. */
  landedPos: number
  /** Where it ended up after any drop/replay. */
  finalPos: number
  outcome: 'holed' | 'green' | 'land' | 'fringe' | 'water' | 'oob'
}

export interface PuttResult {
  kind: 'putt'
  fromFt: number
  rolledFt: number
  endFt: number
  holed: boolean
  blewPast: boolean
}

export type StrokeResult = SwingResult | PuttResult

/** Thrown on illegal actions. UI pre-validates; CLI/tests catch. */
export class SimError extends Error {
  override readonly name = 'SimError'
}
