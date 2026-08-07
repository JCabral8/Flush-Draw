import type { HoleSpec } from '../types'

/**
 * Sunnyvale Municipal ("The Muni") — front 9. The starter course: flat,
 * brown at the edges, forgiving — with one honest ditch. Par 36.
 * Hand-authored per GDD §10.2; full 18 + championship routing land in M5.
 */
export const SUNNYVALE_FRONT_9: HoleSpec[] = [
  {
    id: 'muni-01',
    name: 'The Handshake',
    par: 4,
    length: 310,
    flavor: 'Wide, flat, and friendly. The Muni says hello before it says anything else.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 250, lie: 'fairway' },
      { from: 251, to: 279, lie: 'rough' },
    ],
  },
  {
    id: 'muni-02',
    name: 'The Card Table',
    par: 3,
    length: 150,
    flavor: 'One green, one bunker, one decision. Felt would be an upgrade.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 95, lie: 'fairway' },
      { from: 96, to: 119, lie: 'bunker' },
    ],
  },
  {
    id: 'muni-03',
    name: "Wren's Corner",
    par: 4,
    length: 365,
    flavor: 'Old Man Wren feeds the crows here. The rough is where balls go to be found by him.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 170, lie: 'fairway' },
      { from: 171, to: 215, lie: 'rough' },
      { from: 216, to: 300, lie: 'fairway' },
      { from: 301, to: 334, lie: 'rough' },
    ],
  },
  {
    id: 'muni-04',
    name: 'The Ditch',
    par: 4,
    length: 355,
    flavor: 'The ditch has a name. The ditch has a memory. Lay up.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 179, lie: 'fairway' },
      { from: 180, to: 205, lie: 'water' },
      { from: 206, to: 254, lie: 'fairway' },
      { from: 255, to: 289, lie: 'rough' },
      { from: 290, to: 324, lie: 'fairway' },
    ],
  },
  {
    id: 'muni-05',
    name: 'The Long Walk',
    par: 5,
    length: 480,
    flavor: 'Nothing out here but distance and your own opinions about it.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 320, lie: 'fairway' },
      { from: 321, to: 369, lie: 'rough' },
      { from: 370, to: 405, lie: 'deepRough' },
      { from: 406, to: 449, lie: 'fairway' },
    ],
  },
  {
    id: 'muni-06',
    name: 'Cart Path Charlie',
    par: 4,
    length: 340,
    flavor: "Charlie paved it himself in '91. Nobody asked him to. Nobody asks him anything anymore.",
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 199, lie: 'fairway' },
      { from: 200, to: 240, lie: 'cartPath' },
      { from: 241, to: 309, lie: 'fairway' },
    ],
  },
  {
    id: 'muni-07',
    name: 'The Postage Stamp',
    par: 3,
    length: 130,
    flavor: 'Small green, big feelings.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 84, lie: 'fairway' },
      { from: 85, to: 99, lie: 'bunker' },
    ],
  },
  {
    id: 'muni-08',
    name: 'The Dogleg',
    par: 4,
    length: 400,
    flavor: 'It bends. You will too.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 189, lie: 'fairway' },
      { from: 190, to: 234, lie: 'rough' },
      { from: 235, to: 329, lie: 'fairway' },
      { from: 330, to: 354, lie: 'bunker' },
      { from: 355, to: 369, lie: 'fairway' },
    ],
  },
  {
    id: 'muni-09',
    name: 'Homecoming',
    par: 5,
    length: 520,
    flavor: 'The clubhouse is in sight. So is the pond. The pond has seen your kind before.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 299, lie: 'fairway' },
      { from: 300, to: 330, lie: 'water' },
      { from: 331, to: 449, lie: 'fairway' },
      { from: 450, to: 489, lie: 'rough' },
    ],
  },
]
