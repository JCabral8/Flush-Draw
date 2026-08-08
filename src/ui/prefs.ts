/** Player preferences (GDD §18): all accessibility toggles live here. */
export interface Prefs {
  sound: boolean
  haptics: boolean
  reducedMotion: boolean
  fourColor: boolean
  textScale: 1 | 1.15 | 1.3
}

const KEY = 'pokergolf.prefs.v1'

export const DEFAULT_PREFS: Prefs = {
  sound: true,
  haptics: true,
  reducedMotion:
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  fourColor: false,
  textScale: 1,
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) }
  } catch {
    /* defaults */
  }
  return { ...DEFAULT_PREFS }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* best effort */
  }
  applyPrefs(prefs)
}

/** Push prefs into the DOM (text scale + four-color class). */
export function applyPrefs(prefs: Prefs): void {
  const root = document.documentElement
  root.style.setProperty('--text-scale', String(prefs.textScale))
  root.classList.toggle('four-color', prefs.fourColor)
  root.classList.toggle('reduced-motion', prefs.reducedMotion)
}

/** Haptic tap with a visual twin handled by the caller (GDD §18). */
export function buzz(prefs: Prefs, ms: number): void {
  if (prefs.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(ms)
  }
}
