import type { HoleSpec, Pin } from '../types'

/**
 * Sunnyvale Municipal ("The Muni"). The starter course: flat, brown at the
 * edges, forgiving — with one honest ditch. Front 9 + back 9 (par 36 each),
 * plus "The Reckoning Nine": the championship routing of its meanest holes,
 * three of them pinned at the back. Hand-authored per GDD §10.2.
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

export const SUNNYVALE_BACK_9: HoleSpec[] = [
  {
    id: 'muni-10',
    name: 'The Turn',
    par: 4,
    length: 330,
    flavor: 'Halfway home. The hard half.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 240, lie: 'fairway' },
      { from: 241, to: 299, lie: 'rough' },
    ],
  },
  {
    id: 'muni-11',
    name: "Wren's Revenge",
    par: 3,
    length: 175,
    flavor: 'He asked for a bench here. They gave him a bunker. He remembers.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 90, lie: 'fairway' },
      { from: 91, to: 120, lie: 'bunker' },
      { from: 121, to: 144, lie: 'fairway' },
    ],
  },
  {
    id: 'muni-12',
    name: 'The Causeway',
    par: 5,
    length: 500,
    flavor: 'Two ponds, one narrow promise between them.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 190, lie: 'fairway' },
      { from: 191, to: 215, lie: 'water' },
      { from: 216, to: 350, lie: 'fairway' },
      { from: 351, to: 380, lie: 'water' },
      { from: 381, to: 469, lie: 'fairway' },
    ],
  },
  {
    id: 'muni-13',
    name: 'Patchwork',
    par: 4,
    length: 370,
    flavor: 'The sprinklers only reach where they reach. Aim for the green stripes.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 120, lie: 'fairway' },
      { from: 121, to: 160, lie: 'rough' },
      { from: 161, to: 240, lie: 'fairway' },
      { from: 241, to: 280, lie: 'rough' },
      { from: 281, to: 339, lie: 'fairway' },
    ],
  },
  {
    id: 'muni-14',
    name: 'The Clothesline',
    par: 4,
    length: 415,
    flavor: 'Long, straight, and mean. Hang your big hand out to dry.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 300, lie: 'fairway' },
      { from: 301, to: 345, lie: 'rough' },
      { from: 346, to: 384, lie: 'deepRough' },
    ],
  },
  {
    id: 'muni-15',
    name: 'Short Change',
    par: 3,
    length: 125,
    flavor: 'Barely a hole. Loses more balls than any of them.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 70, lie: 'fairway' },
      { from: 71, to: 94, lie: 'bunker' },
    ],
  },
  {
    id: 'muni-16',
    name: 'The Gauntlet',
    par: 4,
    length: 390,
    flavor: "Charlie's path, then the sand. Nobody walks it clean.",
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 180, lie: 'fairway' },
      { from: 181, to: 230, lie: 'cartPath' },
      { from: 231, to: 320, lie: 'fairway' },
      { from: 321, to: 359, lie: 'bunker' },
    ],
  },
  {
    id: 'muni-17',
    name: 'Second Pond',
    par: 5,
    length: 545,
    flavor: 'The first pond has a name. This one just has your golf balls.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 260, lie: 'fairway' },
      { from: 261, to: 300, lie: 'water' },
      { from: 301, to: 450, lie: 'fairway' },
      { from: 451, to: 514, lie: 'rough' },
    ],
  },
  {
    id: 'muni-18',
    name: 'Last Call',
    par: 4,
    length: 350,
    flavor: 'The bar closes at nine. The bunker never does.',
    segments: [
      { from: 0, to: 0, lie: 'tee' },
      { from: 1, to: 270, lie: 'fairway' },
      { from: 271, to: 295, lie: 'bunker' },
      { from: 296, to: 319, lie: 'fairway' },
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

const ALL_18 = [...SUNNYVALE_FRONT_9, ...SUNNYVALE_BACK_9]
const byId = (id: string): HoleSpec => ALL_18.find((h) => h.id === id)!

/** The Reckoning Nine — championship routing, par 36, three back pins. */
export const SUNNYVALE_CHAMPIONSHIP: HoleSpec[] = [
  champ(byId('muni-10'), 1),
  champ(byId('muni-07'), 2, 'back'),
  champ(byId('muni-13'), 3),
  champ(byId('muni-12'), 4),
  champ(byId('muni-15'), 5, 'back'),
  champ(byId('muni-14'), 6),
  champ(byId('muni-04'), 7),
  champ(byId('muni-08'), 8, 'back'),
  champ(byId('muni-09'), 9),
]

/** The full 27-hole tour run: front → cut → back → cut → championship. */
export const SUNNYVALE_RUN: HoleSpec[] = [
  ...SUNNYVALE_FRONT_9,
  ...SUNNYVALE_BACK_9,
  ...SUNNYVALE_CHAMPIONSHIP,
]
