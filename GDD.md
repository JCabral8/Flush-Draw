# POKER GOLF — Game Design Document

**Milestone 0 · Design Lock · v1.0**
**Working title:** Poker Golf (repo: Flush-Draw)
**One-line pitch:** Every golf shot is a poker hand. Better hands hit farther — but the hole doesn't reward power, it rewards *the exact right distance*, so your royal flush is often the worst card in your bag.

This document is the single source of truth for mechanics. Every rule here is specified to the point of implementability: if a question can be asked at the table, the answer is written down. Deviations from the original brief are marked **[CHANGE]** and cross-referenced in `DECISIONS.md`.

---

## 0. Design pillars

1. **Mean but fair.** Every punishment is announced before the swing. The game never rolls dice you couldn't see.
2. **Power is a liability.** The overshoot asymmetry is the game. No system — club, caddie, or tuning pass — may remove the danger of hitting long. Things may *reshape* the danger; nothing may delete it globally.
3. **The deck is the wallet.** 52 cards must survive 9 holes. Every card played on a drive is a card unavailable for a putt. Low cards are gold.
4. **Legible at a glance.** Every number on screen is either exact or an honest range. Distance preview before every commit.
5. **Respect the player's time and money.** 15-minute runs, no timers, no ads, no pay-for-power, full offline.

---

## 1. Structure

| Layer | Unit | Duration |
|---|---|---|
| Stroke | Play 1–5 cards as a poker hand | ~5 s |
| Hole | 3–6 strokes to sink the ball | ~45 s |
| Round | 9 holes | ~7 min |
| Run | 27 holes — Front 9 → cut → Back 9 → cut → Championship 9 | ~15–20 min |
| Meta | Tour tiers, unlocks, Daily, Match Play ladder | Weeks |

A **run** is played on one course (see §10): its front, back, and championship nines are three distinct 9-hole loops of that course's 18 holes plus a 9-hole championship routing (holes are authored, not generated).

---

## 2. Cards, hand, and deck

- Deck: standard 52 cards + any **modifier cards** (§9) added during the run. Deck state persists across all 9 holes of a round and across rounds within a run; it is freshly shuffled at run start and at each reshuffle.
- Hand size: **7**. After every stroke, draw back up to 7.
- Rank pips: 2–10 face value, J=11, Q=12, K=13, A=14 on full swings. On **putts only**, each Ace is declared 1 or 14 by the player at play time (§6).
- **Reshuffle:** if the deck is empty when a draw is owed, the discard pile is shuffled into a new deck and the player takes a **+1 stroke penalty** (added to the current hole's score). Cards currently in hand are unaffected. There is no limit on reshuffles (except Silent Sam, §8).
- Deck math for tuning: at ~3.5 cards/stroke and ~4 strokes/hole, an unmanaged player burns ~14 cards/hole and reshuffles roughly twice per 9 — a +2 tax. Managing hand size *is* the economy.
- There are **no free discards** in the base rules. Discarding is a club/caddie/modifier privilege (Punch Iron, 7-Iron, etc.).

### 2.1 Hand legality

- A stroke plays **1–5 cards** forming their best poker hand; the selected cards *are* the hand (no kickers ride along — if you select 3 cards you have played a 3-card hand).
- Any selection is legal (a non-hand selection like 2♠ 9♦ counts as High Card of its highest card — but only the pips of the selected cards count, so junk selections waste pips; the UI warns).
- Lie restrictions (§4.3) cap card count or ban hand types; the ban is on the *scored* hand type (a bunker selection that forms a flush is illegal to swing).
- **No dead ends, guaranteed:** a 1-card High Card is legal from every playable lie, so a legal stroke always exists.

---

## 3. The swing

### 3.1 Distance formula

```
struck = round( EffectiveBase(hand) × ClubMod × LieMod × WindMod ) ± Scatter(hand)
EffectiveBase(hand) = BaseYardage(handRank) + PipYards(hand)
PipYards(hand) = 1 yd × Σ(rank pips of played cards)      // [CHANGE — D3]
```

All modifiers are shown pre-swing as a single honest preview: **"236–248 yds"** (exact number when scatter is zero).

### 3.2 Base yardage table (locked for Milestone 1; Monte Carlo may retune in M6)

| Hand | Base yds | Pip range | Total range | Design intent |
|---|---:|---:|---:|---|
| High Card (1 card) | 40 | 2–14 | 42–54 | Chip / layup / bail-out |
| Pair | 80 | 4–28 | 84–108 | Workhorse approach |
| Two Pair | 130 | 10–54 | 140–184 | Approach |
| Three of a Kind | 180 | 6–42 | 186–222 | Mid-iron |
| Straight | 230 | 15–60 | 245–290 | Long approach |
| Flush | 270 | 15–60 | 285–330 | Fairway wood |
| Full House | 310 | 16–68 | 326–378 | Big |
| Four of a Kind | 360 | 8–56 | 368–416 | Bomb |
| Straight Flush | 420 | 15–60 | 435–480 | Par-4 albatross attempt |
| Royal Flush | 500 | 60 | 560 | Par-5 reachable in one |

**[CHANGE — D3] Pip yards.** Each pip of played rank adds 1 yard. Why: (a) it gives near-continuous distance control — a pair of 6s is 92, a pair of 8s is 96 — which turns "which pair do I spend?" into a *targeting* decision, not just an economy one; (b) it makes high cards pull double duty: they add drive distance but are exactly the cards you must not be holding on the green, so the drive/putt tension sharpens rather than softens; (c) it keeps the printed table legible — the base column is still the headline.

- High Card is defined as playing exactly 1 card. Playing 2+ unmatched cards is still scored High Card but sums all selected pips (a deliberate "pip dump" tool for fine distance — and a deliberate way to bleed your deck).
- 3-card and 4-card straights/flushes do **not** exist; 5 cards or it's High Card/Pair/etc.

### 3.3 Scatter (the ± Accuracy term) **[CHANGE — D4]**

Power is inaccurate; precision is honest. Scatter is a uniform integer roll from the seeded scatter stream, applied after all multipliers:

| Hand rank | Scatter |
|---|---|
| High Card, Pair | ±0 (exact) |
| Two Pair, Three of a Kind | ±2 yds |
| Straight, Flush | ±5 yds |
| Full House, Four of a Kind | ±8 yds |
| Straight Flush, Royal Flush | ±12 yds |

Rules: the full range is always shown pre-swing; putting has **zero** scatter; scatter is the only hidden roll in the swing (wind and lie are known multipliers). This reinforces pillar 2 — the bomb hands carry risk on both ends — while keeping the short game a pure calculation.

### 3.4 Wind

Each hole rolls (wind stream) two distinct suits shown on the tee card: one **boost** suit (+15%) and one **drag** suit (−15%).

```
WindMod = 1 + 0.15 × (nBoost − nDrag) / nPlayed
```

where nBoost/nDrag count played cards of each wind suit. A 5-card flush in the boost suit gets the full +15%; a mixed hand dilutes toward ×1.00. Wind applies to full swings only, never putts. Tier winds scale the ±15% (§12).

### 3.5 Lies

| Lie | Distance mult | Restriction |
|---|---:|---|
| Tee | ×1.10 | — |
| Fairway | ×1.00 | — |
| Rough | ×0.80 | Max 4 cards |
| Deep rough | ×0.65 | Max 3 cards |
| Bunker | ×0.60 | Flushes (incl. straight/royal flush) disallowed |
| Fringe | ×0.80 on full swings | Putting allowed but downhill (§6.3) |
| Cart path | ×1.30 | 50% chance (cart stream) of ±25 yd skid, sign 50/50, revealed after the swing but included in the preview as a warning |
| Water | not playable | +1 stroke, drop at nearest fairway point behind the water on the hole line |
| Out of bounds | not playable | +1 stroke, re-play from the previous ball position (stroke-and-distance) |

### 3.6 Ball resolution

The hole is a 1-D line from tee (0) to cup (L), with authored lie segments (§10.1). After a swing, the ball advances `struck` yards. Resolution, in priority order, with `Δ = L − ballPosition` (positive = short):

| Result vs. cup | Outcome |
|---|---|
| Within 3 ft (1 yd) either side | **Holed** (approach gimme — chip-ins are real) |
| 0 ≤ Δ ≤ 30 (pin-high to 30 short) | **On the green** → putting mode, distance converts at 1 yd = 3 ft (max 90 ft) |
| Δ > 30 (more than 30 short) | Lie read from the hole's authored layout at the ball position (fairway, rough, bunker, water, path…) |
| 0–20 yds long | **Fringe** — awkward downhill spot behind the green |
| > 20 yds long | **Hazard/OOB** → +1 stroke, re-play from previous position |

**The asymmetry is sacred.** 30 yards of grace short; 20 nervous yards long; then a wall. A Royal Flush on a 90-yard approach is a two-stroke catastrophe, and that's correct. Nothing in tuning may widen the long side beyond the short side.

### 3.7 Stroke cap (no-dead-end rule) **[CHANGE — D5]**

Max strokes on a hole = **par + 4**. Reaching the cap picks the ball up: hole scored par + 4, play moves on. This bounds worst-case hole length, prevents deck-grinding stalls, and caps run-destroying spirals at a survivable (usually cut-fatal, but *finite*) number.

---

## 4. Putting

Entered when the ball is on the green. Remaining distance reads in **feet (0–90)**. No wind, no scatter, no lie multipliers — putting is pure arithmetic and pure card economy.

### 4.1 The putt

- Play **1–2 cards** (putter variants modify, §7.4). Cards played on putts are just ranks — hand types don't exist on the green.
- Distance = `Σ(rank) × F ft`, where **F** is the green factor (§4.3). Each Ace is declared **1 or 14** at play time — the marquee putting decision.
- After the putt: if the ball is within **3 ft** of the cup (either side), it's **holed** ("gimme"). Otherwise:
  - **Short:** putt again from the remaining distance.
  - **Long:** ball rolls to `|overshoot|` ft past; all subsequent putts on this green are **downhill: F = 4** (§4.3). Yes, you can lip-race it back and forth; the stroke cap ends the misery.

### 4.2 Consequences (by design)

Low cards are precious. A player who dumped their 2s and 3s into an early Two Pair will three-putt, and should. A single deuce (6 ft flat) is the best putter in the game.

### 4.3 Green factor F (slope) **[CHANGE — D6]**

Pin position sets slope; slope sets F:

| Green state | F (ft per rank) |
|---|---:|
| Uphill (Front pin) | 2.5 (round result to nearest ft) |
| Flat (Center pin) | 3 |
| Downhill (Back pin, or any green after you've overshot a putt, or any putt from the fringe) | 4 |

One number expresses the whole slope system: Back pins are dangerous *before* you even mis-putt, and blowing a putt past the hole converts any green into the dangerous kind. Fringe (§3.6) putts are always downhill.

### 4.4 Putting from off the green

Not allowed in base rules (fringe excepted). The **Texas Wedge** club (§7.3) unlocks fairway putting as a build choice.

---

## 5. Pin positions

Rolled per-hole (wind stream, second draw), shown on the tee card:

| Pin | Effective hole length | Green slope |
|---|---|---|
| Front | −12 yds | Uphill (F 2.5) |
| Center | ±0 | Flat (F 3) |
| Back | +12 yds | Downhill (F 4) |

Higher tour tiers bias the roll toward Back pins (§12).

---

## 6. Scoring

Standard stroke play, subtractive and legible:

| Score vs. par | Name |
|---|---|
| −3 | Albatross |
| −2 | Eagle |
| −1 | Birdie |
| 0 | Par |
| +1 | Bogey |
| +2 | Double bogey |
| +3 | Triple bogey |
| +4 | Cap (picked up) |

Penalties (+1 stroke each): reshuffle, water, OOB/long-hazard re-play. The score card shows cumulative-to-par at all times, with the next cut line pinned beside it.

---

## 7. Clubs — the bag is the build

- Carry **5 clubs**, chosen in the Pro Shop before a run, from the unlocked collection. The **Putter** occupies a free sixth slot, always present; putter *variants* are what you swap.
- **One club is committed per stroke** (selecting "no club" swings clean — clubs are optional per stroke). Charges are per-round unless stated; per-hole effects reset at each tee. Charges refresh at each 9-hole round boundary.
- Club effects apply to the stroke they're committed to and stack multiplicatively with lie/wind.

### 7.1 Design rule

Every club is a *verb*, not a stat stick: more distance, less distance, better information, card economy, or a bent rule. No two clubs share a verb at the same slot cost. **The bag composition is the build** — a Wedge/Chipper/Texas Wedge bag plays a completely different game than a Driver/Big Bertha/Long Iron bag.

### 7.2 Launch bag (default 5 for a new player)

Driver, 3-Wood, 7-Iron, Pitching Wedge, Punch Iron + Blade putter.

### 7.3 Full club list (24)

| # | Club | Effect | Charges | Unlock (achievement-gated, §14) |
|---|---|---|---|---|
| 1 | **Driver** | ×1.25 distance. Tee only | 1 / hole | Start |
| 2 | **3-Wood** | +40 yds flat | 3 / round | Start |
| 3 | **5-Wood** | +25 yds flat and scatter halved (round down) | 3 / round | Hit 5 greens in regulation in one round |
| 4 | **Big Bertha** | ×1.50 distance, scatter doubled. Tee only | 1 / round | Hole out from 400+ yds |
| 5 | **2-Iron (Stinger)** | Wind ignored this stroke (×0.95 distance) | 3 / round | Finish a round played entirely into drag wind ≤ +2 |
| 6 | **4-Iron** | Lie multiplier becomes ×1.00 (restrictions still apply) | 2 / round | Escape deep rough onto the green in one stroke |
| 7 | **7-Iron** | Reroll: discard entire hand, draw 7, then swing | 3 / round | Start |
| 8 | **8-Iron** | Return one played card to hand after this stroke | 2 / round | Play the same pair twice on one hole |
| 9 | **9-Iron** | Scatter = 0 this stroke | 3 / round | Land pin-high (Δ = 0) three times in one round |
| 10 | **Pitching Wedge** | Halve final distance (round down); if the result lands anywhere in [30 short, 20 long], it counts as **on the green** | 4 / round | Start |
| 11 | **Gap Wedge** | −30 yds flat (min 5) | 4 / round | Score par or better on 3 consecutive holes using only Pairs and High Cards |
| 12 | **Lob Wedge** | This stroke, a long result ≤ 20 yds becomes on-green at that distance (fringe becomes green; the wall past 20 remains) | 2 / round | Save par from the fringe 5 times (lifetime) |
| 13 | **Sand Wedge** | From bunker: ×1.00 and flushes allowed | passive when carried | Escape 10 bunkers (lifetime) |
| 14 | **Hybrid** | One selected card becomes a wildcard (declare rank + suit before scoring) | 2 / round | Swing a Straight using cards of all four suits |
| 15 | **Punch Iron** | Discard 2, draw 3 (hand grows to 8 until next stroke) | 4 / round | Start |
| 16 | **Long Iron** | Straights score one rank tier higher (Straight→Flush yardage, Straight Flush→Royal) | 3 / round | Swing 3 Straights in one round |
| 17 | **Chipper** | High Card strokes score as Pair (base 80) | 3 / round | Birdie a hole using only High Card strokes |
| 18 | **Cleek** | +1 card above the lie's cap this stroke (rough 5, deep rough 4; bunker unaffected) | 3 / round | Birdie from the rough twice in one round |
| 19 | **Mashie** | Peek the top 3 deck cards before choosing your hand | 3 / round | Win a Daily Course top-50% finish |
| 20 | **Niblick** | This stroke, overshoot resolves symmetrically: a long result maps to the same lie a ball that far *short* would find | 1 / round | Go OOB long 25 times (lifetime — the game notices your pain) |
| 21 | **Persimmon** | Mulligan: after seeing the result, re-take this stroke once; second result stands; no extra stroke | 1 / round | Card-cap a hole (par + 4) then birdie the next |
| 22 | **Baffing Spoon** | Layup governor: struck distance is capped at exactly green-front (30 yds short); overshoot impossible | 2 / round | Lay up short then hole the approach 3 times (lifetime) |
| 23 | **One-Iron** | Play any single card: struck = exactly 200 yds, no modifiers ("even God can't hit a 1-iron — you can") | 1 / round | Complete a run with zero OOB penalties |
| 24 | **Texas Wedge** | Putt from fairway/rough within 40 yds of the cup (putting mode, F 4, max 2 cards) | 2 / round | Hole a 90 ft putt |

### 7.4 Putter variants (sixth slot, always in bag)

| Putter | Effect | Unlock |
|---|---|---|
| **Blade** | +1 card allowed on putts (1–3 cards) | Start |
| **Mallet** | Putt distance rounds to nearest 5 ft | Sink a putt with a single Ace |
| **Belly** | Gimme radius 6 ft instead of 3 | Three-putt 15 greens (lifetime — the game is merciful eventually) |
| **Broomstick** | Downhill F capped at 3 (slope can't beat you) | Hole out downhill from 60+ ft |

---

## 8. Caddies — the Joker slot

- Pick **1 of 3** offered at run start (caddie stream). After each cut ceremony, recruit **1 of 3** more — up to **4 caddies** by the Championship 9. Offers are rarity-weighted: Common 60%, Uncommon 25%, Rare 12%, Legendary 3%.
- Caddies are passive rules-benders, always on, no charges unless stated. Duplicates are never offered.
- One reroll of an offer per ceremony is available for 30 Green Fees (cosmetic currency is never *required* — skipping is always free).

### 8.1 Full caddie roster (45)

**Common (16)**

| Caddie | Effect |
|---|---|
| **The Statistician** | The top card of the deck is always visible. *Knows the deck like his own bathtub.* |
| **Old Man Wren** | Hands using only red cards get +20% distance. *Hates the color black. Won't say why.* |
| **Cormac** | Hands using only black cards have zero scatter. *Measures twice. Cuts once. Ever.* |
| **Bag-of-Tees Bobby** | Tee lie is ×1.15 instead of ×1.10. *Sells them out of his coat, too.* |
| **Junior** | Draw to 8 cards for the tee stroke of every hole. *Runs ahead. Runs back. Runs ahead again.* |
| **The Greenskeeper** | Fringe putts are flat (F 3), not downhill. *It's his fringe. He'll mow it how he likes.* |
| **Weatherbeaten Wanda** | Wind boost is +20% (drag stays −15%). *Licks a finger. Points. Always right.* |
| **The Nephew** | All per-round club charges +1. *Somebody owed the caddie master a favor.* |
| **Lucky Penny** | First reshuffle each round costs no stroke. *Found it heads-up in the parking lot in '86.* |
| **The Rules Lawyer** | Cart path skids: you choose the direction. *Cites subsection 4(c). Nobody checks.* |
| **Sunday Bag Sue** | Carry only 4 clubs; all their charges are doubled. *Travels light. Hits heavy.* |
| **The Line Reader** | Exact putt outcome preview before committing any putt. *Sees the grain. Smells the dew.* |
| **Two-Glove Tony** | Pairs get +15 yds. *Twice the grip, twice the rip.* |
| **The Beverage Cart** | After each birdie, your next tee stroke gets +10%. *Nothing motivates like a cold one coming.* |
| **Flat Cap Fred** | High Card strokes get double pip yards. *One card. All wrist.* |
| **The Ballhawk** | Once per round, a ball headed OOB long is found in the fringe instead. *Knows every gap in every fence.* |

**Uncommon (12)**

| Caddie | Effect |
|---|---|
| **The Hustler** | First bogey each round is scored as par; second is scored as double. *The house always collects.* |
| **The Bookie** | Declare your score on the tee: hit it exactly for a free caddie-offer reroll; miss for +1 stroke. *Pays out in favors.* |
| **Doc Sands** | Bunkers are ×0.85 and flushes allowed. *Semi-retired. From what, he won't say.* |
| **The Yardage Book** | Top 3 deck cards always visible. *Every course. Every blade. Annotated.* |
| **Iron Mike** | Once per hole, set your lie multiplier to ×1.00. *Doesn't believe in rough. Rough believes in him.* |
| **The Superstitious** | Odd-card hands (1, 3, or 5 cards) get +12%. *Never on an even. Never.* |
| **The Pro's Ex** | Straight and Royal Flushes have zero scatter. *Learned the swing. Kept the house.* |
| **Night Owl** | Championship 9 strokes +10%; Front 9 strokes −5%. *Doesn't really wake up until it matters.* |
| **The Accountant** | Every cut line is +1 more forgiving for you. *Found an exemption. There's always an exemption.* |
| **Whispering Jim** | One card per putt may count as one rank lower. *Talks the ball down. Literally.* |
| **The Chameleon** | Cards of the wind-boost suit count as any suit for flushes. *Blends in. Cashes out.* |
| **Penny-Ante Pete** | Modifier cards are offered twice as often; start each run with a Joker in the deck. *Everything's a side bet.* |

**Rare (10)**

| Caddie | Effect |
|---|---|
| **Marguerite** | Played 2s, 3s, and 4s return to your hand after the stroke instead of discarding. *Keeps the little ones close.* |
| **Silent Sam** | No wind, ever. But your deck never reshuffles: run it dry and the run ends. *…* |
| **Mrs. Chen** | Straights may skip one rank (4-5-7-8-9 is a straight). *Sees connections other people miss.* |
| **Gallery Favorite** | Eagles count as −3. *The crowd noise is worth a stroke on its own.* |
| **The Grip Coach** | Scatter rolls twice; you get whichever lands nearer the cup. *Small adjustments. Large consequences.* |
| **The Mule** | Carry 7 clubs. *Doesn't complain. Doesn't sweat. Doesn't stop.* |
| **Vegas** | On putts, face cards count as 5. *Everything's a 5 if you're brave enough.* |
| **The Architect** | You choose the pin position on every hole. *Designed half this course. Regrets the back nine.* |
| **Doubling Cube** | Once per round, declare a hole double-or-nothing: its score counts twice (birdie −2, bogey +2). *Borrowed from a different hustle entirely.* |
| **The Forecaster** | See wind and pin for the next hole while playing this one. *Tomorrow's weather, today.* |

**Legendary (7) — each breaks a rule outright**

| Caddie | Effect |
|---|---|
| **Calamity Jane** | Putts never roll past the cup: a long putt stops on the lip (3 ft) instead. *Named after the sweetest putter ever made.* |
| **The Monk** | Your deck loses all face cards and gains a second copy of every 2, 3, 4, and 5 (44 cards). *Renounced power. Found the short game.* |
| **Big Earl** | All base yardages doubled. Greens are the same size they always were. *Absolutely certain this is a good idea.* |
| **The Membership** | One missed cut per run is forgiven. *It's not what you shoot. It's who you know.* |
| **Ace Bandage** | Aces are wild in swing hands (declare rank; suit stays). *Held the team together for years. Now it holds yours.* |
| **The Do-Over** | Once per hole, fully rewind your last stroke — cards, deck, stroke count, everything. *Insists that one didn't count.* |
| **The Ghost** | Water is fairway to you; your ball skips across. *Drowned on hole 12 in 1974. Plays through.* |

---

## 9. Modifier cards

Non-standard cards added to your deck mid-run (deck dilution is the cost — every modifier you take pushes your reshuffle closer). Offered 1-of-3 (or skip) at each cut ceremony; some caddies/challenges grant them. They shuffle in and draw like any card.

| Card | Rule |
|---|---|
| **Joker** | Wild: declare rank and suit when played (swings and putts; on putts counts as declared rank) |
| **The Ringer** | Counts as any rank of its printed suit (4 suit versions exist) |
| **Feather** | A swing hand containing it ignores wind |
| **Anchor** | A swing hand containing it cannot go long past the fringe: any result > 20 long becomes exactly 20 long |
| **Lucky 7** | A 7 of its printed suit; when played, draw 2 extra cards |
| **Lead Card** | Rank 10, no suit (never in flushes); hands containing it get +10% distance |
| **Glass Ace** | An Ace, any declared suit per play; shatters (leaves the deck) after its 3rd play |
| **The Marker** | Rank 0, no suit: adds a card to hand-type counting rules? No — it is a **blank**: legal in any selection, adds 0 pips, and satisfies one card of a Straight (a 4-card straight + Marker scores as Straight) |
| **Scorecard Pencil** | When drawn (auto-reveals): peek the top 5 cards, then discard the Pencil. Returns at reshuffle |
| **The Gimme** | When played as a lone putt: the putt travels exactly the remaining distance. Shatters after 1 use |

---

## 10. Holes & courses

### 10.1 Hole anatomy (data schema)

Holes are hand-authored JSON. The sim consumes exactly this:

```json
{
  "id": "muni-04",
  "name": "The Ditch",
  "par": 4,
  "length": 355,
  "flavor": "The ditch has a name. The ditch has a memory. Lay up.",
  "segments": [
    { "from": 0,   "to": 0,   "lie": "tee" },
    { "from": 1,   "to": 179, "lie": "fairway" },
    { "from": 180, "to": 205, "lie": "water" },
    { "from": 206, "to": 254, "lie": "fairway" },
    { "from": 255, "to": 289, "lie": "rough" },
    { "from": 290, "to": 325, "lie": "fairway" }
  ],
  "windBias": null,
  "pinBias": null
}
```

- Segments cover [0, L−31]; [L−30, L] is implicitly the green, (L, L+20] the fringe, beyond is OOB. `windBias`/`pinBias` let authored holes force or weight a wind suit or pin (used sparingly for signature holes).
- Par bands: **Par 3:** 120–260 yds · **Par 4:** 261–430 · **Par 5:** 431–620. Every course's 18 = four par 3s, ten par 4s, four par 5s (total par 72; championship 9 is an authored par-36 routing of its meanest holes).

### 10.2 The six courses

Every hole on every course is authored: named, themed, placed with intent (M5 deliverable; identities locked here).

| Course | Theme | Signature cruelty | Signature hole |
|---|---|---|---|
| **Sunnyvale Municipal** ("The Muni") | Starter. Flat, brown-at-the-edges, forgiving | Wide fairways, one honest ditch | #4 "The Ditch" — par 4, water band exactly where a Straight lands |
| **Ironwood Pines** | Tree corridors = deep rough walls | Deep rough flanks; card-cap pressure | #7 "The Chute" — par 5 threading three deep-rough bands |
| **Salt Flats Links** | Treeless, windblasted | Tier wind ×1.5 on this course, pot bunkers at green fronts | #11 "The Kettle" — par 3, bunker ring, back pin |
| **Cypress Bog** | Water everywhere | Water crossings punish exactly the workhorse yardages | #12 "Baptism" — par 3 fully over water, 145 yds, the meanest possible spot for it |
| **High Desert Mesa** | Cart paths and hardpan | Path skids; long holes reward (dangerous) bombs | #16 "The Runway" — par 5, cart path down the whole left band |
| **The Old Grounds** | Championship blend | Back pins weighted 60%; every hazard type appears | #18 "The Reckoning" — par 4, water short, bunker long, 20-yd landing pocket |

---

## 11. Modes

| Mode | Description | Purpose |
|---|---|---|
| **The Tour** (core) | Roguelite run: pick course tier, pick caddie, survive two cuts, post a Championship score. 8 difficulty tiers ("Tour Cards") | Retention spine |
| **Daily Course** | One shared seed worldwide (UTC date → SHA-256 → seed): same holes, winds, pins, deck order, caddie offers for everyone; **one attempt**; global leaderboard | Daily hook + streak |
| **Match Play** | Async ghost duel: play the same seeded course as another player's recorded action-list; hole-by-hole win/lose/halve; weekly ladder | Social with zero live infra |
| **Practice Green** | Any unlocked hole, free, unscored, all clubs available | Onboarding + sandbox |
| **Course Editor** *(post-launch)* | Author a 9-hole course; share as a seed string | UGC longtail |

Determinism (§16) is what makes Daily and Match Play free: a "ghost" is `(seed, actions[])`, a few KB.

---

## 12. Tour tiers ("Tour Cards")

Cut lines are **cumulative score at or under** the threshold, checked after holes 9 and 18. Miss → run ends, Green Fees banked pro-rata (§13.2).

| Tier | Card | Cut 1 (after 9) | Cut 2 (after 18) | Wind | Pin weights F/C/B | Modifiers |
|---|---|---:|---:|---|---|---|
| 1 | Municipal | +6 | +9 | ±15% | 40/40/20 | — |
| 2 | Public | +4 | +7 | ±15% | 35/40/25 | — |
| 3 | Club | +3 | +5 | ±18% | 30/40/30 | — |
| 4 | Amateur | +2 | +3 | ±18% | 25/40/35 | Deep rough widens |
| 5 | Q-School | +1 | +2 | ±20% | 20/40/40 | Reshuffle costs +2 |
| 6 | Tour | 0 | 0 | ±20% | 20/35/45 | Fringe window shrinks to 15 yds |
| 7 | Major | −1 | −2 | ±22% | 15/35/50 | Gimme radius 2 ft |
| 8 | Immortal | −2 | −4 | ±25% | 10/30/60 | Caddie offers 2, not 3 |

Tier N+1 unlocks by completing (all 27 holes of) Tier N. Note tier modifiers make *long* worse or *resources* scarcer — never make short more forgiving (pillar 2 holds in both directions).

---

## 13. Economy & liveops

### 13.1 Business model — recommendation **[D9]**

**Free download + single $5.99 IAP ("The Members Card").** Free forever: full Tier 1 Tour, Daily Course, Practice Green. Members Card unlocks: Tiers 2–8, Match Play, Course Editor (when shipped), and the cosmetic shop.

Reasoning: the paid charts are only winnable with an existing halo (Balatro arrived with PC/console heat). A free Daily Course is the acquisition loop — a shareable one-attempt leaderboard run costs us nothing and demos the exact core tension — and a single unlock converts better than a $5.99 paywall at install. Revenue mechanics are identical to premium; the *discovery tax* is not. No ads, no energy, no consumables, no pay-for-power, ever. If store policy or featuring opportunities favor premium at launch, flipping to paid-up-front is a config change, not a design change.

### 13.2 Green Fees (cosmetic currency)

- Earned only: per hole cleared (5), per birdie-or-better (10), cut made (50), run completed (150), Daily played (25), challenges (25–200).
- Spent only on cosmetics: card backs, ball trails, clubhouse skins, scorecard fonts — and the optional caddie-offer reroll (§8). Nothing purchasable gates or boosts play.

### 13.3 Seasons (free, monthly)

A new 9-hole signature course + 2 caddies + 1 modifier card monthly. Daily streak calendar, weekly Match Play ladder reset. All season content permanent once released.

---

## 14. Meta progression & challenges

- **Unlocks are achievements, not grind** (club unlock conditions in §7.3; putters §7.4). Caddies unlock in themed batches by playing (each course completed unlocks its "resident" caddies).
- **60+ named challenges** at launch, each worth Green Fees and many gating an unlock. Full authored list ships in M5; taxonomy + 24 canonical examples:

**Precision:** Pin-Seeker (land pin-high 3× in a round) · Gimme King (10 approach gimmes) · The Surveyor (hole a 90 ft putt) · Deadweight (sink a putt with a single 2) · Snowman Melter (recover from +4 on a hole to make a cut)
**Economy:** Tightwad (finish a round with zero reshuffles) · Rag-and-Bone (birdie using only cards ranked 6 or lower) · The Grinder (complete a run with 15+ cards left un-reshuffled) · Empty Pockets (win a hole with 3 cards in hand)
**Power:** Moonshot (hole out from 400+) · The Full Boat (birdie with a Full House) · Royalty (swing a Royal Flush — anywhere) · Icarus (go OOB long by 100+ yds; reward: sympathy and 25 Fees)
**Discipline:** Lay-Up Larry (par a par 5 without ever swinging 200+) · No Driver November (complete a run with no Driver in bag) · The Pacifist (complete a round using nothing above Two Pair)
**Suits & hands:** Seeing Red (birdie with an all-red hand) · Blackout (birdie with an all-black hand) · Four Corners (birdie with a 4-suit straight) · The Boat Race (two Full Houses on one hole)
**Tour:** Cut Above (make both cuts in one run) · Cardholder (complete Tier 4) · The Immortal (complete Tier 8) · Streaker (7-day Daily streak)

---

## 15. Onboarding — teach by overshooting

**The 90-Yard Lesson** — a scripted, unscored par 3, 90 yds, played before the first run (skippable, replayable from Practice Green):

1. Deal a scripted hand containing a made Flush and small pairs. The UI gently highlights the Flush — the biggest number. Most players swing it.
2. The ball sails ~200 yards past into the parking lot. The caddie: *"Beautiful swing. Wrong sport."* No stroke penalty — scripted re-drop, framed as a practice swing.
3. Prompt: "the hole wants **90**." Player plays a pair (~90). On the green.
4. One putt with an obvious two-card sum; the Ace 1-or-14 choice is surfaced if they hold one.
5. Done. Total text on screen: under 40 words. The parking lot did the teaching.

Players who lay up correctly on step 1 get the caddie line *"You've played this game before"* and skip straight to putting. Never punish good instincts with a forced tutorial.

---

## 16. Technical architecture (summary — full detail lives in README.md at M1)

- **Stack:** TypeScript strict + React 18 + PixiJS (WebGL) + Zustand + Vite + Capacitor (iOS/Android) + Tone.js (synthesized audio, zero audio files). As specified; no deviation. Single codebase, deterministic sim, headless testability.
- **Architecture:** `sim/` is a pure, headless TS module — zero rendering imports, zero DOM, zero Tone. It exposes `reduce(state, action) → state` and `derive(seed) → initialState`. UI subscribes via Zustand; the CLI, Monte Carlo runner, and test suite drive the same module.
- **Determinism:** entire game state ≡ `fold(reduce, derive(seed), actions[])`. Same inputs → identical run on every device. This is load-bearing for saves, Daily, ghosts, replays, and balance testing.
- **RNG:** xorshift128+, seeded; **no `Math.random()` anywhere** (lint rule enforces). Independent named streams: `deck`, `wind` (wind + pin), `scatter`, `cart`, `caddie` (offers + modifier offers) — so playing differently never perturbs an unrelated system's rolls.
- **Save:** append-only action log + seed, autosaved every action; versioned envelope `{v, seed, tier, course, actions}` with explicit migrations. Crash mid-stroke resumes exactly (the log is the state).
- **Performance targets (non-negotiable):** 60 fps locked on iPhone 11 / Pixel 5a; cold start < 2.0 s; installed < 60 MB (procedural art/audio makes this comfortable); 100% offline; portrait-only, one-handed, all touch targets ≥ 44 pt within the bottom 60% of the screen.

---

## 17. Art & audio direction (resolved specifics)

**"Dusk at a municipal course."** Flat vector, high-contrast, slightly grubby. Deep teal→amber turf gradients; cream card faces, heavy black pips; **signal orange reserved exclusively for the cup and the currently-selected hand** — nothing else, ever, including UI chrome and marketing shots inside the app. Condensed grotesk for numerals, humanist sans for body. Zero raster placeholders: all assets are SVG components, PixiJS Graphics, or shaders; any asset that can't be procedural gets redesigned until it can.

- Cards legible at 44×62 pt on a 5.4" screen — verified by an automated screenshot test at that exact size, not by eyeballing.
- Stroke juice chain: card lift → hand-rank stamp → arc tween (easing duration maps to distance) → landing dust puff → distance counter tick-down (the counter tick is the dopamine; its curve gets its own tuning pass).
- Sinking a putt: **300 ms of dead silence, then the cup rattle.**
- Audio: Tone.js synthesis only. Wood-block card flips; pitched "thock" mapped to hand rank; wind bed filtered by wind suit; adaptive music that thins when the player is over par.

---

## 18. Accessibility & localization

- Colorblind mode: suits get distinct glyphs **and** shapes, not just color; wind suits shown by glyph.
- Full dynamic text scaling; no hardcoded font sizes anywhere.
- Reduced-motion toggle: kills shake/particles, preserves all timings.
- Haptics toggle; every haptic has a visual twin.
- Screen-reader labels on every card, lie, distance readout, and wind card.
- All strings in `locales/en.json` from the first commit; keys only in components (lint-enforced); scaffolded for 12 locales, shipping EN.

---

## 19. UX screens & required states

Screens: Title → Clubhouse (hub) → Pro Shop (bag) → Caddie Select → In-Round (swing / putt / scorecard overlay) → Cut Ceremony → Run Summary → Daily → Match Play → Settings → Cosmetics.

Every screen must handle: first-launch empty state, loading, error, offline, and mid-run resume. Back/swipe-back never destroys progress without confirmation; mid-run "quit" is always "save and exit," never "abandon" (abandoning a Daily counts the attempt — stated up front on the Daily card).

---

## 20. Balance targets (Monte Carlo gate, Milestone 6)

`tools/simulate.ts` runs three policies — **Greedy** (max yardage always), **Optimal-ish** (2-ply expected-strokes minimizer), **Naive** (random legal hand) — 100,000 runs × 8 tiers × 3 policies. Ship gate:

| Metric | Healthy target |
|---|---|
| Optimal-ish win rate, Tier 1 | 55–65% |
| Optimal-ish win rate, Tier 8 | 8–15% |
| Greedy vs Optimal-ish gap | ≥ 20 pts |
| Naive win rate, Tier 1 | < 15% |
| Median run length | 12–18 min |
| Per-hole score distribution | Par modal; birdies ~18%; doubles+ ~12% |
| Caddie pick rate | 3–25% at equal rarity |
| Club inclusion rate | 8–60% |

Outliers get **redesigned, not renumbered**. Before/after tables ship with the M6 report.

---

## 21. Known tensions & flagged risks (per brief §10 — honest list)

1. **Scatter vs. fairness.** Any hidden roll near the overshoot wall risks feeling cheated. Mitigation: scatter is zero below Two Pair, always previewed as a range, and absent on the green. If M2 playtests still read it as unfair, the fallback (logged in D4) is deterministic scatter — worst-case shown becomes actual — at some cost to drama. I believe the current design is right; flagging because it touches pillar 1.
2. **Reshuffle stalling.** A player could theoretically fish for putting cards by churning strokes. The stroke cap (D5) bounds it; Monte Carlo will confirm churning is always score-negative.
3. **Pip yards (D3)** is my one real addition to the swing formula. If it muddies the yardage table's legibility in playtests, the retreat is pips-on-High-Card-and-Pair-only. I don't expect to need it.
4. **Royal Flush reachable-par-5 promise:** RF 560 + Driver tee (×1.25 → 700) covers any par 5; even bare RF at 560 covers the 431–560 band. Promise holds; noted so tuning doesn't silently break it.
