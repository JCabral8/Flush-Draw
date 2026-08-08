import type { HoleSpec } from '../types'
import {
  SUNNYVALE_FRONT_9,
  SUNNYVALE_RUN,
} from './sunnyvale'
import { IRONWOOD_FRONT_9, IRONWOOD_RUN } from './ironwood'

/**
 * The course registry (GDD §10.2). Two ship now; Salt Flats Links, Cypress
 * Bog, High Desert Mesa and The Old Grounds are authored post-launch content
 * on this exact schema (DECISIONS D34).
 */
export type CourseId = 'sunnyvale' | 'ironwood'

export interface CourseSpec {
  id: CourseId
  name: string
  tagline: string
  /** Practice nine. */
  front9: HoleSpec[]
  /** Full 27-hole tour run: front → back → championship routing. */
  run: HoleSpec[]
}

export const COURSES: Record<CourseId, CourseSpec> = {
  sunnyvale: {
    id: 'sunnyvale',
    name: 'Sunnyvale Municipal',
    tagline: 'Flat, brown at the edges, forgiving — with one honest ditch.',
    front9: SUNNYVALE_FRONT_9,
    run: SUNNYVALE_RUN,
  },
  ironwood: {
    id: 'ironwood',
    name: 'Ironwood Pines',
    tagline: 'Tree corridors and rationed lies. The card-cap course.',
    front9: IRONWOOD_FRONT_9,
    run: IRONWOOD_RUN,
  },
}

export const DEFAULT_COURSE: CourseId = 'sunnyvale'
