import type { HoleSpec, Pin } from '../types'

/**
 * Ironwood Pines — the second course (GDD §10.2). Tree corridors read as
 * rough and deep-rough walls: the card-cap course. Where Sunnyvale forgives,
 * Ironwood narrows: big hands need clean lies, and clean lies are rationed.
 */
export const IRONWOOD_FRONT_9: HoleSpec[] = [
  {
    id: 'iron-01', name: 'The Gatehouse', par: 4, length: 340,
    flavor: 'The pines open just wide enough to let you in. Closing time is unposted.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 200, lie: 'fairway' },
      { from: 201, to: 245, lie: 'rough' },
      { from: 246, to: 309, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-02', name: 'Needle Bed', par: 3, length: 165,
    flavor: 'Everything short of the green is brown needles and regret.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 60, lie: 'fairway' },
      { from: 61, to: 110, lie: 'rough' },
      { from: 111, to: 134, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-03', name: 'The Chute', par: 5, length: 510,
    flavor: 'Three walls of trees, one honest lane. Thread it or pay the toll.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 170, lie: 'fairway' },
      { from: 171, to: 210, lie: 'deepRough' },
      { from: 211, to: 330, lie: 'fairway' },
      { from: 331, to: 375, lie: 'deepRough' },
      { from: 376, to: 479, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-04', name: 'Widowmaker', par: 4, length: 400,
    flavor: 'The widow in question kept the house. The tree kept the ball.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 180, lie: 'fairway' },
      { from: 181, to: 240, lie: 'rough' },
      { from: 241, to: 290, lie: 'deepRough' },
      { from: 291, to: 369, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-05', name: 'Sap Run', par: 4, length: 355,
    flavor: 'Park it under the wrong pine and the ball comes back sticky.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 130, lie: 'rough' },
      { from: 131, to: 280, lie: 'fairway' },
      { from: 281, to: 324, lie: 'rough' },
    ],
  },
  {
    id: 'iron-06', name: 'The Clearing', par: 3, length: 145,
    flavor: 'One open look at the sky. The bunker is where the sky ends.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 85, lie: 'fairway' },
      { from: 86, to: 114, lie: 'bunker' },
    ],
  },
  {
    id: 'iron-07', name: 'Deadfall', par: 4, length: 380,
    flavor: 'The storm of ’09 never really left.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 150, lie: 'fairway' },
      { from: 151, to: 200, lie: 'deepRough' },
      { from: 201, to: 300, lie: 'fairway' },
      { from: 301, to: 349, lie: 'rough' },
    ],
  },
  {
    id: 'iron-08', name: 'Resin Alley', par: 5, length: 545,
    flavor: 'Long, narrow, and it smells like a lumberyard with a grudge.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 240, lie: 'fairway' },
      { from: 241, to: 285, lie: 'rough' },
      { from: 286, to: 420, lie: 'fairway' },
      { from: 421, to: 470, lie: 'deepRough' },
      { from: 471, to: 514, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-09', name: 'Bark & Bite', par: 4, length: 365,
    flavor: 'The clubhouse dog is buried by the green. He still collects.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 210, lie: 'fairway' },
      { from: 211, to: 260, lie: 'rough' },
      { from: 261, to: 300, lie: 'bunker' },
      { from: 301, to: 334, lie: 'fairway' },
    ],
  },
]

export const IRONWOOD_BACK_9: HoleSpec[] = [
  {
    id: 'iron-10', name: 'Second Growth', par: 4, length: 330,
    flavor: 'They replanted after the fire. The saplings hold grudges young.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 190, lie: 'fairway' },
      { from: 191, to: 250, lie: 'rough' },
      { from: 251, to: 299, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-11', name: 'The Flagpole', par: 4, length: 420,
    flavor: 'Tallest pine on the property. Aim at it, then apologize to it.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 260, lie: 'fairway' },
      { from: 261, to: 320, lie: 'deepRough' },
      { from: 321, to: 389, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-12', name: 'Pinecone Postage', par: 3, length: 130,
    flavor: 'Short enough to throw. The trees call that hubris.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 70, lie: 'rough' },
      { from: 71, to: 99, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-13', name: 'The Portage', par: 5, length: 490,
    flavor: 'A creek used to run here. The trees drank it. They’re still thirsty.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 195, lie: 'fairway' },
      { from: 196, to: 225, lie: 'water' },
      { from: 226, to: 360, lie: 'fairway' },
      { from: 361, to: 410, lie: 'rough' },
      { from: 411, to: 459, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-14', name: 'Knot Hole', par: 4, length: 345,
    flavor: 'There is exactly one way through. The members won’t tell you it.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 140, lie: 'deepRough' },
      { from: 141, to: 250, lie: 'fairway' },
      { from: 251, to: 314, lie: 'rough' },
    ],
  },
  {
    id: 'iron-15', name: 'Whisper Pines', par: 3, length: 185,
    flavor: 'They talk about you after you leave the tee. Everyone hears it.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 100, lie: 'fairway' },
      { from: 101, to: 135, lie: 'bunker' },
      { from: 136, to: 154, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-16', name: 'The Woodpile', par: 4, length: 405,
    flavor: 'Everything they cut down ended up beside this fairway. On purpose.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 175, lie: 'fairway' },
      { from: 176, to: 230, lie: 'cartPath' },
      { from: 231, to: 330, lie: 'fairway' },
      { from: 331, to: 374, lie: 'rough' },
    ],
  },
  {
    id: 'iron-17', name: 'Tall Shadows', par: 5, length: 560,
    flavor: 'By late afternoon the whole hole is in the dark. So are you.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 250, lie: 'fairway' },
      { from: 251, to: 305, lie: 'deepRough' },
      { from: 306, to: 450, lie: 'fairway' },
      { from: 451, to: 500, lie: 'rough' },
      { from: 501, to: 529, lie: 'fairway' },
    ],
  },
  {
    id: 'iron-18', name: 'The Last Board', par: 4, length: 375,
    flavor: 'The clubhouse porch is one plank short. It’s waiting on your round.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 220, lie: 'fairway' },
      { from: 221, to: 270, lie: 'rough' },
      { from: 271, to: 310, lie: 'bunker' },
      { from: 311, to: 344, lie: 'fairway' },
    ],
  },
]

function champ(base: HoleSpec, n: number, pinBias?: Pin): HoleSpec {
  return {
    ...structuredClone(base),
    id: `${base.id}-c${n}`,
    ...(pinBias ? { pinBias } : {}),
  }
}

const ALL = [...IRONWOOD_FRONT_9, ...IRONWOOD_BACK_9]
const byId = (id: string): HoleSpec => ALL.find((h) => h.id === id)!

/** The Timberline Nine — Ironwood's championship routing, par 36. */
export const IRONWOOD_CHAMPIONSHIP: HoleSpec[] = [
  champ(byId('iron-10'), 1),
  champ(byId('iron-05'), 2),
  champ(byId('iron-04'), 3),
  champ(byId('iron-13'), 4),
  champ(byId('iron-12'), 5, 'back'),
  champ(byId('iron-14'), 6, 'back'),
  champ(byId('iron-07'), 7),
  champ(byId('iron-15'), 8, 'back'),
  champ(byId('iron-17'), 9),
]

export const IRONWOOD_RUN: HoleSpec[] = [
  ...IRONWOOD_FRONT_9,
  ...IRONWOOD_BACK_9,
  ...IRONWOOD_CHAMPIONSHIP,
]
