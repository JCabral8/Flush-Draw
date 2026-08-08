# DECISIONS.md

Running log of design and technical decisions made without asking, per brief §10. Newest at the bottom. Entries marked ⚠ are the ones I'd call closest to 50/50.

---

**D1 — Selected cards are the hand; no kickers.**
A stroke's hand is exactly the cards selected (1–5). No auto-best-hand from 7, no kickers riding along. Reasoning: makes card spend explicit and keeps the deck economy honest — you always pay exactly what you play. Also simplifies putting hand-off (played cards leave the hand, period).

**D2 — Any selection is legal; junk scores as High Card.**
Rather than rejecting non-hands, a junk selection scores as High Card with all selected pips summed. Reasoning: no invalid-input dead ends, and it quietly creates a "pip dump" fine-control tool that costs deck cards — a real decision, not a trap. The UI warns before a junk swing.

**D3 — Pip yards: +1 yd per rank pip of played cards.** ⚠
Addition to the brief's formula (folded into EffectiveBase). Reasoning: near-continuous distance targeting turns hand choice into aiming, not just tiering; high cards gain drive value exactly where they're a putting liability, sharpening the hoard-or-spend dilemma; the printed base table stays the headline. Retreat path if playtests find it muddy: pips on High Card and Pair only.

**D4 — Accuracy = rank-scaled scatter, previewed as a range.** ⚠
The brief's `± Accuracy` term is specified as: ±0 (High Card/Pair), ±2 (Two Pair/Trips), ±5 (Straight/Flush), ±8 (FH/Quads), ±12 (SF/RF), uniform from a dedicated seeded stream, always shown pre-swing, never on putts. Reasoning: "power is inaccurate" reinforces the central asymmetry; zero scatter on precision hands keeps the short game a pure calculation (pillar 1). Fallback if it reads as unfair in M2: deterministic worst-case scatter.

**D5 — Stroke cap at par + 4 (pick up, score par+4, move on).**
Not in the brief. Reasoning: guarantees no dead-end states (a milestone 3 gate), bounds deck-churn stalling, and caps a disaster hole at a survivable number. Mirrors real golf's net-double-bogey pickup convention.

**D6 — One slope number: green factor F ∈ {2.5, 3, 4}.**
Front pin = uphill F2.5, Center = flat F3, Back / after-overshoot / fringe = downhill F4. Reasoning: the brief specifies ×3 flat and ×4 downhill; extending the same scalar to pin slope expresses the whole green system in one legible number instead of a second mechanic.

**D7 — Fringe = putting mode, always downhill.**
The brief gives fringe "×0.8 next stroke." Interpreted as: full swings from fringe are ×0.8, but the sane play is putting at F4. Reasoning: a 40-yd-minimum chip from 5 yds behind the green would be an unwinnable trap; downhill putting is the intended punishment and reuses D6.

**D8 — Wind applies per-card, proportionally.**
`WindMod = 1 + 0.15 × (nBoost − nDrag) / nPlayed`. Reasoning: makes flushes the full-exposure read the brief asks for while mixed hands dilute naturally; one formula, no special cases; never applies to putts.

**D9 — Business model: free + single $5.99 unlock ("Members Card").** ⚠
Tier 1 + Daily + Practice free forever; one IAP unlocks everything else; cosmetics-only currency. Reasoning: paid charts need a halo we don't have; the free Daily is a self-demonstrating acquisition loop; flipping to premium later is config, not design. No ads/energy/consumables/pay-for-power under either model.

**D10 — Putter baseline vs. Blade.**
Brief lists "Putter: +1 card on putts" as a club and putting as "1–2 cards." Resolved: putting baseline is 1–2 cards; the starting **Blade** variant carries the +1 perk (1–3). Reasoning: keeps the always-in-bag sixth slot meaningful (variants differ) without contradicting §2.5.

**D11 — Marguerite's wording.**
"2s, 3s, 4s never leave your hand when you draw" implemented as: played low cards return to hand after the stroke (still count for the hand). Reasoning: the strongest coherent reading; tiered Rare accordingly.

**D12 — OOB/long-hazard = stroke-and-distance; water = drop behind on the line.**
Long >20 replays from the previous position (+1); water drops at nearest fairway point behind the water segment (+1). Reasoning: two distinct, golf-authentic penalties — water is survivable positioning, long is the wall.

**D13 — Runs are course-scoped; holes are authored, never generated.**
A run picks a course; its three nines are authored routings of that course. Reasoning: the brief's own definition-of-done demands designed holes; generation is reserved for nothing.

**D14 — Named RNG streams: deck, wind(+pin), scatter, cart, caddie.**
Reasoning: decisions in one system must never perturb another's rolls, or ghosts/dailies diverge under identical seeds with different play styles… they don't diverge (actions are logged), but *counterfactual fairness* holds: rerolling your hand can't change the wind. Cheap to do now, impossible to retrofit.

**D15 — Tier difficulty only ever tightens long-side/resources, never loosens short-side.**
Encoded in §12 table. Reasoning: pillar 2 ("the asymmetry is the whole game") must survive difficulty tuning in both directions.

**D16 — The reshuffle penalty attaches to the stroke that caused it, even a holing stroke.**
Draw-back-to-7 happens as part of every stroke; if that draw exhausts the deck, the +1 lands on the hole just played — including the edge case where the ball is already in the cup. Reasoning: the cost belongs to the cards you spent, keeps "every stroke = play, resolve, draw" a single atomic rule, and avoids a weird deferred penalty appearing on the next tee. The scorecard event names the reshuffle so it never reads as a phantom stroke. (Sim, M1.)

**D17 — Junk-selection scatter is zero.**
Multi-card non-hands score as High Card, and High Card has no scatter, so pip dumps are exact. Reasoning: junk selections are a precision tool by design (D2); giving them scatter would punish the only reason to use them. (Sim, M1.)

**D18 — The sim reports stroke physics (`lastStroke`); UI animates the truth.**
Rather than the UI re-deriving or guessing ball flight, the reducer records struck/landed/final positions per stroke as part of state. Reasoning: honest animation with zero duplicated logic, and it's replay-safe. Debt logged: sim narration strings (`lastEvents`) are shown verbatim in the M2 UI; they become localization keys in M5.

**D19 — M2 ships the full front 9 behind the one-hole gate.**
The milestone asks for one hole; the engine already plays nine, so "next hole" simply continues the round and a scorecard appears at the end. Reasoning: it costs nothing, playtesting the deck economy requires multi-hole play (the 52-card deck across 9 holes IS the game), and M3 remains about clubs/hazards/run structure — not about unlocking holes 2–9.

**D20 — Text sizes are still px in M2.**
GDD demands full text scaling with no hardcoded font sizes; the M2 layout uses px/clamp. Accepted as scoped debt until the M7 accessibility pass, where type moves to rem with a scale setting.

**D21 — M3 ships the club *system* with 6 clubs + Blade; the 24-club collection is M5 content.**
The launch set (Driver, 3-Wood, 7-Iron, Pitching Wedge, Punch Iron, Sand Wedge, Blade) deliberately covers every hook type a club can need: distance mult, flat add, post-scatter shaping (halve), lie bending (bunker passive), resolution bending (PW's long-side green window), instant card actions (reroll / discard-draw), and putter variants. M5 clubs are data + small handlers on these hooks, not new architecture. Also resolved: the 7-Iron reroll is swing-phase only ("before swinging" per GDD), and PW's stuck long-side balls putt downhill (consistent with every other above-the-hole rule).

**D23 — Caddie picks are actions in the replay log.**
Ceremony offers roll from the dedicated caddie stream and the pick is a `{type:'caddie'}` action, so a saved run — including who you hired and when — rebuilds from `(seed, tier, actions[])` alone. Save files stay a few KB and the Daily/ghost format (M8) is already settled.

**D24 — M4 ships 10 caddies covering every hook type; the 45-roster is M5 content.**
Swing mult/flat (Wren, Tony), lie bending (Bobby), asymmetric wind (Wanda), no-wind + no-reshuffle rule break (Silent Sam), deck economy (Penny, Marguerite), green factor (Greenskeeper), club charges (Nephew), pure info (Statistician). Interpretations resolved: Marguerite only returns *played* lows — Punch Iron discards really leave; Silent Sam's deck-death ends the run even if the fatal draw follows a holed ball (the draw is part of the stroke, D16); the Greenskeeper makes fringe putts use the pin's own factor (front pins putt at 2.5 — slightly generous, and fine).

**D25 — Run failure states are one phase with a reason.**
`phase: 'runComplete'` + `runEnd: 'complete' | 'missedCut' | 'deckDead'`. One terminal phase keeps every guard simple; the reason drives UI copy and meta rewards later.

**D26 — Tier progression: complete tier N to unlock N+1; stored locally.**
localStorage meta `{unlockedTier}`; a completed run at your frontier tier unlocks the next. Practice mode (front 9, no cuts/caddies/wind tiers) is tier 0 and never touches the save slot.

**D22 — Club UX: arm-then-swing; instants fire on tap.**
Swing clubs (Driver/3W/PW) arm a chip and modify the previewed swing; the 7-Iron rerolls immediately on tap; the Punch Iron arms a discard mode where the main button becomes DISCARD 2. One armed club max; arming clears on any action. Charges shown as dots on the chip.

**D27 — Milestone order: balance harness (M6) before content (M5).**
Monte Carlo validates the yardage table, cut lines, and tier curve before 40+ caddies and 18 more clubs are authored on top of them. Retuning one table now is cheap; retuning it under a content mountain is not.

**D28 — `reduceInPlace` fast path for the harness.**
The pure `reduce` clones state defensively (right for the UI). The Monte Carlo driver owns its states, so the engine exports the same reducer without the clone — identical semantics, ~40× throughput. The purity tests and replay tests pin the equivalence.

**D29 — M6 policies don't use clubs yet.**
Naive/Greedy/Optimal play bare hands; club- and caddie-inclusion metrics only become meaningful with the full M5 roster, so those columns of the §20 table land when the content does. The harness caught a real engine bug on its first run (previews didn't enforce lie restrictions), which is exactly why it exists.

**D30 — Cut lines retuned from +6/+9…−2/−4 to +1/+2…−2/−4.** ⚠
First sweep: optimal-ish passed the original tier-1 cuts 96% of the time (Sam-noise excluded) — the +6/+9 lines were decoration. Probes put tier 1 at +1/+2 → 65% (top of the 55–65% band; the entry tier errs friendly) and the ladder interpolates to tier 8's unchanged −2/−4 → ~8–9%. Flagged ⚠ because the texture finding underneath it (D31) deserves a director's eye.

**D31 — Finding: precise play is birdie-rich (~44% birdies), and I'm keeping it.** ⚠
The GDD §20 target says par should be modal with ~18% birdies for the optimal policy. Measured: optimal birdies 44% of holes — because pip-yards + exact previews + integer putt sums make greens genuinely solvable for a calculator (and for a sharp human doing the same arithmetic — the UI shows exact putt rolls on purpose, pillar 1). I considered making putts only sink on the short side (thematic, mirrors the course asymmetry) but it creates unsinkable sub-8-ft downhill putts — a degenerate spiral. Rather than nerf legibility to protect a golf-shaped statistic, I re-read the distribution target as applying to *mid-skill* play (naive/greedy remain bogey-heavy; par is modal for them) and made the cut lines own the difficulty. This changes the flavor of "good scores" — winning runs sit well under par, more Balatro than Augusta. Flagged ⚠ prominently: if you want par-modal-for-optimal instead, the honest levers are a smaller green window or coarser putt sums, both spec-table changes.

**D32 — Optimal values caddies; Silent Sam is priced as a trap.**
The rarity-greedy ceremony pick hired Silent Sam ~25% of runs and died deck-dead. Optimal now carries a value table (Marguerite top, Sam negative) and walks on rather than hiring him. Sam remains a fine card for *players* with a low-card discipline — the policy just isn't one.


**D33 — Persimmon/Do-Over snapshots are taken after the charge is spent, before the stroke resolves.**
A retake restores deck/hand/ball/strokes but never the charge, and the scatter stream has advanced — the retake is a genuine re-roll, deterministic in the action log (`retake` is an action). The window closes on any other action.

**D34 — The post-launch content ledger (the honest list).** ⚠
Shipped: 24 clubs + 4 putters (all mechanical), 40 caddies (all mechanical), 2 full courses (54 authored holes), tour/practice/daily/match/lesson modes, save-resume, balance harness. Deferred to post-launch content patches, all on existing hooks: the four interactive-declaration caddies (Bookie, Doubling Cube, Forecaster, Mule) which need mid-run declaration UI; modifier cards (need a non-standard card-id scheme); the remaining four courses (schema + validator ready); the Green Fees cosmetic economy and achievement-gated unlocks (clubs currently all unlocked; the GDD's achievement table stands as the design). Ace Bandage was cut for The Do-Over (wild-ace search is combinatorially hostile to the balance policies); The Monk ships as "no face cards" because duplicate card ids don't exist yet. The Line Reader was cut as redundant — pillar 1 gives every player exact putt previews.

**D35 — Daily and Match Play are serverless by construction.**
Daily: seed = `daily-<UTC date>`, course rotates by date, tier-3 rules, standard bag for fairness, one attempt burned at the first tee (restart-scouting the deck order was the exploit), local streaks, clipboard share. Match Play: the ghost is the optimal policy playing the same seed bare-handed (~150 ms to generate); a ghost is just (seed, scores), which is also the wire format if real async duels get a backend later.
