import * as Tone from 'tone'
import { HAND_ORDER, type HandRank } from '../sim/index'

/**
 * Audio (GDD §17): synthesized with Tone.js — zero audio files. Wood-block
 * card taps, a pitched "thock" that rises with hand rank, a landing puff,
 * and the cup rattle that arrives after 300 ms of respectful silence.
 */
let started = false
let membrane: Tone.MembraneSynth | null = null
let block: Tone.MembraneSynth | null = null
let noise: Tone.NoiseSynth | null = null
let metal: Tone.MetalSynth | null = null

async function ensure(): Promise<boolean> {
  try {
    if (!started) {
      await Tone.start()
      started = true
      membrane = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.25, sustain: 0 },
      }).toDestination()
      membrane.volume.value = -8
      block = new Tone.MembraneSynth({
        pitchDecay: 0.002,
        octaves: 1.2,
        envelope: { attack: 0.001, decay: 0.06, sustain: 0 },
      }).toDestination()
      block.volume.value = -14
      noise = new Tone.NoiseSynth({
        noise: { type: 'brown' },
        envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
      }).toDestination()
      noise.volume.value = -18
      metal = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.3, release: 0.1 },
        harmonicity: 4.1,
        resonance: 3000,
      }).toDestination()
      metal.volume.value = -16
    }
    return true
  } catch {
    return false
  }
}

function safe(fn: () => void): void {
  try {
    fn()
  } catch {
    // Audio is garnish: scheduling collisions and autoplay refusals are
    // never allowed to interrupt play.
  }
}

/** Wood-block tap for card selection. */
export function playCardTap(): void {
  void ensure().then((ok) => {
    if (ok) safe(() => block?.triggerAttackRelease('G5', 0.05, Tone.now() + 0.001))
  })
}

/** The swing thock: pitch maps to hand rank (GDD §17). */
export function playThock(rank: HandRank): void {
  void ensure().then((ok) => {
    if (!ok) return
    const idx = HAND_ORDER.indexOf(rank)
    const midi = 45 + idx * 3 // A2 up to roughly A5 for a royal
    safe(() =>
      membrane?.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), 0.2, Tone.now() + 0.001),
    )
  })
}

/** Landing dust puff. */
export function playLand(): void {
  void ensure().then((ok) => {
    if (ok) safe(() => noise?.triggerAttackRelease(0.1, Tone.now() + 0.001))
  })
}

/** Splash: a darker puff. */
export function playSplash(): void {
  void ensure().then((ok) => {
    if (!ok) return
    safe(() => noise?.triggerAttackRelease(0.25, Tone.now() + 0.001))
    safe(() => membrane?.triggerAttackRelease('C2', 0.3, Tone.now() + 0.002))
  })
}

/** The cup: 300 ms of silence, then the rattle (GDD §17). */
export function playHoled(): void {
  void ensure().then((ok) => {
    if (!ok) return
    const now = Tone.now() + 0.3
    safe(() => metal?.triggerAttackRelease('C5', 0.08, now))
    safe(() => metal?.triggerAttackRelease('G4', 0.08, now + 0.07))
    safe(() => block?.triggerAttackRelease('C6', 0.05, now + 0.15))
  })
}
