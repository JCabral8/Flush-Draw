/**
 * Caddies (GDD §8): passive rules-benders, the "Joker" slot. Forty on the
 * roster. Interactive-declaration caddies from the GDD examples (The Bookie,
 * Doubling Cube, The Forecaster, The Mule, Sunday Bag Sue) are deferred —
 * they need mid-run declarations or shop access; see DECISIONS D34. Caddies
 * whose GDD effect needed a choice are shipped with deterministic "auto"
 * readings noted in their text.
 */
export type CaddieId =
  // commons
  | 'statistician'
  | 'wren'
  | 'cormac'
  | 'bobby'
  | 'junior'
  | 'greenskeeper'
  | 'wanda'
  | 'nephew'
  | 'penny'
  | 'rulesLawyer'
  | 'tony'
  | 'beverageCart'
  | 'flatCapFred'
  | 'ballhawk'
  | 'milkman'
  | 'groundhog'
  // uncommons
  | 'hustler'
  | 'docSands'
  | 'yardageBook'
  | 'ironMike'
  | 'superstitious'
  | 'prosEx'
  | 'nightOwl'
  | 'accountant'
  | 'chameleon'
  | 'bartender'
  | 'bagpiper'
  // rares
  | 'marguerite'
  | 'silentSam'
  | 'mrsChen'
  | 'galleryFavorite'
  | 'gripCoach'
  | 'vegas'
  | 'architect'
  // legendaries
  | 'calamityJane'
  | 'monk'
  | 'bigEarl'
  | 'membership'
  | 'doOver'
  | 'ghost'

export type CaddieRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface CaddieSpec {
  id: CaddieId
  name: string
  rarity: CaddieRarity
  effect: string
  flavor: string
}

const C = (spec: CaddieSpec): CaddieSpec => spec

export const CADDIES: Record<CaddieId, CaddieSpec> = {
  // ---- commons ----
  statistician: C({
    id: 'statistician', name: 'The Statistician', rarity: 'common',
    effect: 'The top card of the deck is always visible.',
    flavor: 'Knows the deck like his own bathtub.',
  }),
  wren: C({
    id: 'wren', name: 'Old Man Wren', rarity: 'common',
    effect: 'Hands using only red cards get +20% distance.',
    flavor: "Hates the color black. Won't say why.",
  }),
  cormac: C({
    id: 'cormac', name: 'Cormac', rarity: 'common',
    effect: 'Hands using only black cards have zero scatter.',
    flavor: 'Measures twice. Cuts once. Ever.',
  }),
  bobby: C({
    id: 'bobby', name: 'Bag-of-Tees Bobby', rarity: 'common',
    effect: 'Tee shots play ×1.15 instead of ×1.10.',
    flavor: 'Sells them out of his coat, too.',
  }),
  junior: C({
    id: 'junior', name: 'Junior', rarity: 'common',
    effect: 'Draw an 8th card for the tee stroke of every hole.',
    flavor: 'Runs ahead. Runs back. Runs ahead again.',
  }),
  greenskeeper: C({
    id: 'greenskeeper', name: 'The Greenskeeper', rarity: 'common',
    effect: 'Fringe putts are flat, not downhill.',
    flavor: "It's his fringe. He'll mow it how he likes.",
  }),
  wanda: C({
    id: 'wanda', name: 'Weatherbeaten Wanda', rarity: 'common',
    effect: 'Wind boost is +20% (drag stays as posted).',
    flavor: 'Licks a finger. Points. Always right.',
  }),
  nephew: C({
    id: 'nephew', name: 'The Nephew', rarity: 'common',
    effect: 'All per-round club charges +1.',
    flavor: 'Somebody owed the caddie master a favor.',
  }),
  penny: C({
    id: 'penny', name: 'Lucky Penny', rarity: 'common',
    effect: 'The first reshuffle each round costs no stroke.',
    flavor: "Found it heads-up in the parking lot in '86.",
  }),
  rulesLawyer: C({
    id: 'rulesLawyer', name: 'The Rules Lawyer', rarity: 'common',
    effect: 'Cart path skids always break your way.',
    flavor: 'Cites subsection 4(c). Nobody checks.',
  }),
  tony: C({
    id: 'tony', name: 'Two-Glove Tony', rarity: 'common',
    effect: 'Pairs get +15 yards.',
    flavor: 'Twice the grip, twice the rip.',
  }),
  beverageCart: C({
    id: 'beverageCart', name: 'The Beverage Cart', rarity: 'common',
    effect: 'After a birdie or better, your next tee stroke gets +10%.',
    flavor: 'Nothing motivates like a cold one coming.',
  }),
  flatCapFred: C({
    id: 'flatCapFred', name: 'Flat Cap Fred', rarity: 'common',
    effect: 'High Card strokes count their pips twice.',
    flavor: 'One card. All wrist.',
  }),
  ballhawk: C({
    id: 'ballhawk', name: 'The Ballhawk', rarity: 'common',
    effect: 'Once per round, a ball headed out of bounds is found in the fringe.',
    flavor: 'Knows every gap in every fence.',
  }),
  milkman: C({
    id: 'milkman', name: 'The Milkman', rarity: 'common',
    effect: 'Holes 1–3 of each round: +10% distance.',
    flavor: 'Been up since four. The grass is still his.',
  }),
  groundhog: C({
    id: 'groundhog', name: 'The Groundhog', rarity: 'common',
    effect: 'Rough plays ×0.85 and deep rough ×0.70.',
    flavor: 'Lives down there. Tramples you a lie.',
  }),
  // ---- uncommons ----
  hustler: C({
    id: 'hustler', name: 'The Hustler', rarity: 'uncommon',
    effect: 'First bogey each round scores as par; the second scores as double.',
    flavor: 'The house always collects.',
  }),
  docSands: C({
    id: 'docSands', name: 'Doc Sands', rarity: 'uncommon',
    effect: 'Bunkers play ×0.85 and allow flushes.',
    flavor: "Semi-retired. From what, he won't say.",
  }),
  yardageBook: C({
    id: 'yardageBook', name: 'The Yardage Book', rarity: 'uncommon',
    effect: 'The top three deck cards are always visible.',
    flavor: 'Every course. Every blade. Annotated.',
  }),
  ironMike: C({
    id: 'ironMike', name: 'Iron Mike', rarity: 'uncommon',
    effect: 'Once per hole, a bad lie plays at ×1.00 (applied automatically).',
    flavor: "Doesn't believe in rough. Rough believes in him.",
  }),
  superstitious: C({
    id: 'superstitious', name: 'The Superstitious', rarity: 'uncommon',
    effect: 'Odd-card hands (1, 3, or 5 cards) get +12%.',
    flavor: 'Never on an even. Never.',
  }),
  prosEx: C({
    id: 'prosEx', name: "The Pro's Ex", rarity: 'uncommon',
    effect: 'Straight and Royal Flushes have zero scatter.',
    flavor: 'Learned the swing. Kept the house.',
  }),
  nightOwl: C({
    id: 'nightOwl', name: 'Night Owl', rarity: 'uncommon',
    effect: 'Championship 9 strokes +10%; Front 9 strokes −5%.',
    flavor: "Doesn't really wake up until it matters.",
  }),
  accountant: C({
    id: 'accountant', name: 'The Accountant', rarity: 'uncommon',
    effect: 'Every cut line is one stroke more forgiving.',
    flavor: "Found an exemption. There's always an exemption.",
  }),
  chameleon: C({
    id: 'chameleon', name: 'The Chameleon', rarity: 'uncommon',
    effect: 'Wind-boost suit cards count as any suit for flushes.',
    flavor: 'Blends in. Cashes out.',
  }),
  bartender: C({
    id: 'bartender', name: 'The Bartender', rarity: 'uncommon',
    effect: 'Face cards are worth +2 pips on swings.',
    flavor: 'Pours heavy for the regulars.',
  }),
  bagpiper: C({
    id: 'bagpiper', name: 'The Bagpiper', rarity: 'uncommon',
    effect: 'After a bogey or worse, your next tee stroke gets +15%.',
    flavor: 'Grief, converted to wind.',
  }),
  // ---- rares ----
  marguerite: C({
    id: 'marguerite', name: 'Marguerite', rarity: 'rare',
    effect: 'Played 2s, 3s and 4s return to your hand.',
    flavor: 'Keeps the little ones close.',
  }),
  silentSam: C({
    id: 'silentSam', name: 'Silent Sam', rarity: 'rare',
    effect: 'No wind, ever. But the deck never reshuffles: run it dry and the run ends.',
    flavor: '…',
  }),
  mrsChen: C({
    id: 'mrsChen', name: 'Mrs. Chen', rarity: 'rare',
    effect: 'Straights may skip one rank.',
    flavor: 'Sees connections other people miss.',
  }),
  galleryFavorite: C({
    id: 'galleryFavorite', name: 'Gallery Favorite', rarity: 'rare',
    effect: 'Eagles count as −3.',
    flavor: 'The crowd noise is worth a stroke on its own.',
  }),
  gripCoach: C({
    id: 'gripCoach', name: 'The Grip Coach', rarity: 'rare',
    effect: 'Scatter rolls twice; you get the roll that lands nearer the cup.',
    flavor: 'Small adjustments. Large consequences.',
  }),
  vegas: C({
    id: 'vegas', name: 'Vegas', rarity: 'rare',
    effect: 'On putts, face cards count as 5.',
    flavor: "Everything's a 5 if you're brave enough.",
  }),
  architect: C({
    id: 'architect', name: 'The Architect', rarity: 'rare',
    effect: 'Every pin is cut at the front for you.',
    flavor: 'Designed half this course. Regrets the back nine.',
  }),
  // ---- legendaries ----
  calamityJane: C({
    id: 'calamityJane', name: 'Calamity Jane', rarity: 'legendary',
    effect: 'Putts never roll past: a hot putt dies on the lip instead.',
    flavor: 'Named after the sweetest putter ever made.',
  }),
  monk: C({
    id: 'monk', name: 'The Monk', rarity: 'legendary',
    effect: 'All face cards leave your deck the day he joins (40 cards).',
    flavor: 'Renounced power. Found the short game.',
  }),
  bigEarl: C({
    id: 'bigEarl', name: 'Big Earl', rarity: 'legendary',
    effect: 'Every swing is doubled. The greens are the same size they always were.',
    flavor: 'Absolutely certain this is a good idea.',
  }),
  membership: C({
    id: 'membership', name: 'The Membership', rarity: 'legendary',
    effect: 'One missed cut per run is forgiven.',
    flavor: "It's not what you shoot. It's who you know.",
  }),
  doOver: C({
    id: 'doOver', name: 'The Do-Over', rarity: 'legendary',
    effect: 'Once per hole, rewind your last stroke entirely.',
    flavor: "Insists that one didn't count.",
  }),
  ghost: C({
    id: 'ghost', name: 'The Ghost', rarity: 'legendary',
    effect: 'Water is fairway to you. Your ball skips across.',
    flavor: 'Drowned on hole 12 in 1974. Plays through.',
  }),
}

export const DEFAULT_CADDIE_POOL: readonly CaddieId[] = Object.keys(CADDIES) as CaddieId[]

/** GDD §8 rarity weights. */
export const RARITY_WEIGHT: Record<CaddieRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  legendary: 3,
}
