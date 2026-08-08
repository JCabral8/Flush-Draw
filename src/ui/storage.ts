import type { SimAction } from '../sim/index'

/**
 * Persistence (GDD §16): a run IS (seed, tier, actions[]). Autosaved after
 * every action; resuming replays the log through the reducer — the game
 * resumes at the exact stroke, always.
 */
export interface SavedRun {
  v: 1
  seed: string
  tier: number
  actions: SimAction[]
}

export interface SavedMeta {
  v: 1
  unlockedTier: number
}

const RUN_KEY = 'pokergolf.run.v1'
const META_KEY = 'pokergolf.meta.v1'

export function saveRun(run: SavedRun): void {
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(run))
  } catch {
    // Storage full/blocked: play continues, resume just won't survive.
  }
}

export function loadRun(): SavedRun | null {
  try {
    const raw = localStorage.getItem(RUN_KEY)
    if (!raw) return null
    const run = JSON.parse(raw) as SavedRun
    if (run.v !== 1 || typeof run.seed !== 'string' || !Array.isArray(run.actions)) return null
    return run
  } catch {
    return null
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(RUN_KEY)
  } catch {
    /* nothing to clear */
  }
}

export function loadMeta(): SavedMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) {
      const meta = JSON.parse(raw) as SavedMeta
      if (meta.v === 1 && typeof meta.unlockedTier === 'number') return meta
    }
  } catch {
    /* fall through to default */
  }
  return { v: 1, unlockedTier: 1 }
}

export function saveMeta(meta: SavedMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    /* best effort */
  }
}
