import { SUNNYVALE_FRONT_9 } from '../sim/index'
import type { HoleSpec } from '../sim/index'

/**
 * The 90-Yard Lesson (GDD §15): teach the overshoot rule by letting the
 * player overshoot, never by a text wall. Seed `lesson-1107` deals a clubs
 * flush (~330 off the tee) and a disjoint pair of 8s (96 — pin high) on a
 * 120-yard par 3 with the pin up front. The parking lot does the teaching.
 */
export const LESSON_SEED = 'lesson-1107'

const LESSON_HOLE: HoleSpec = {
  id: 'lesson-01',
  name: 'The Parking Lot',
  par: 3,
  length: 120,
  flavor: 'Ninety yards of grass, then asphalt. Choose accordingly.',
  pinBias: 'front',
  segments: [
    { from: 0, to: 0, lie: 'tee' },
    { from: 1, to: 89, lie: 'fairway' },
  ],
}

export const LESSON_COURSE: HoleSpec[] = [LESSON_HOLE, ...SUNNYVALE_FRONT_9.slice(1)]

export type LessonStep = 'swingBig' | 'aim' | 'putt' | 'graduate' | 'natural'

export const LESSON_LINES: Record<LessonStep, string> = {
  swingBig: 'Big hand in the window there. Let the flush rip.',
  aim: 'Beautiful swing. Wrong sport. The hole wants ninety — try the pair of eights.',
  putt: 'On the dance floor. Now it’s arithmetic: cards × 3 feet.',
  graduate: 'That’s the whole game: the right distance beats the big one. Off you go.',
  natural: 'You’ve played this game before.',
}
