import type { HoleSpec, LayoutLie, Pin } from './types'

/** GDD §5 pin shifts and green slopes. */
export const PIN_SHIFT: Record<Pin, number> = { front: -12, center: 0, back: 12 }

/** GDD §10.1 par bands. */
export const PAR_BANDS: Record<3 | 4 | 5, [number, number]> = {
  3: [120, 260],
  4: [261, 430],
  5: [431, 620],
}

export const GREEN_WINDOW = 30 // yds short of the cup that count as on the green
export const FRINGE_WINDOW = 20 // yds long of the cup before OOB
export const APPROACH_GIMME_YDS = 1 // 3 ft

/**
 * The lie at an absolute position (yards from tee). Positions not covered by
 * an authored segment default to fairway (GDD §10.1) — this also covers the
 * back-pin gap beyond length-31.
 */
export function lieAt(hole: HoleSpec, pos: number): LayoutLie {
  if (pos <= 0) return 'tee'
  for (const seg of hole.segments) {
    if (pos >= seg.from && pos <= seg.to) return seg.lie
  }
  return 'fairway'
}

/**
 * Water drop point: nearest fairway (or tee) position strictly behind the
 * water the ball landed in, on the hole line (GDD §3.5 / D12).
 */
export function waterDropPos(hole: HoleSpec, landedPos: number): number {
  for (let pos = landedPos - 1; pos > 0; pos--) {
    const lie = lieAt(hole, pos)
    if (lie === 'fairway') return pos
  }
  return 0 // all the way back to the tee
}

/** Validate an authored hole. Returns a list of problems (empty = valid). */
export function validateHole(hole: HoleSpec): string[] {
  const problems: string[] = []
  const [lo, hi] = PAR_BANDS[hole.par]
  if (hole.length < lo || hole.length > hi) {
    problems.push(`par ${hole.par} must be ${lo}-${hi} yds, got ${hole.length}`)
  }
  if (!hole.name.trim()) problems.push('hole needs a name')
  if (!hole.flavor.trim()) problems.push('hole needs flavor text')

  const segs = [...hole.segments].sort((a, b) => a.from - b.from)
  let cursor = 0
  for (const seg of segs) {
    if (seg.to < seg.from) problems.push(`segment ${seg.from}-${seg.to} is inverted`)
    if (seg.from > cursor) problems.push(`gap in segments at ${cursor}-${seg.from - 1}`)
    if (seg.from < cursor) problems.push(`overlap at ${seg.from}`)
    cursor = Math.max(cursor, seg.to + 1)
  }
  const coverEnd = hole.length - GREEN_WINDOW - 1
  if (cursor <= coverEnd) problems.push(`segments end at ${cursor - 1}, must cover to ${coverEnd}`)

  // Design lint: the first playable position must not be water (a tee shot
  // must always have somewhere to drop behind the ball).
  if (segs.some((s) => s.lie === 'water' && s.from <= 1)) {
    problems.push('water may not start at the tee')
  }
  return problems
}

export function validateCourse(holes: readonly HoleSpec[]): string[] {
  const problems: string[] = []
  if (holes.length !== 9) problems.push(`a round needs 9 holes, got ${holes.length}`)
  const ids = new Set(holes.map((h) => h.id))
  if (ids.size !== holes.length) problems.push('duplicate hole ids')
  for (const hole of holes) {
    for (const p of validateHole(hole)) problems.push(`${hole.id}: ${p}`)
  }
  return problems
}
