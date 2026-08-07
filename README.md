# POKER GOLF

Every golf shot is a poker hand. Better hands hit farther — but the hole doesn't reward power, it rewards *the exact right distance*.

- **`GDD.md`** — the design lock. Every mechanic, table, and number.
- **`DECISIONS.md`** — running log of decisions made and why.

## Status

| Milestone | State |
|---|---|
| 0 — Design lock | ✅ |
| 1 — Headless sim core | ✅ |
| 2 — Playable core (phone browser, real feel) | ✅ this commit |
| 3 — Full round (clubs, hazards, run structure) | next |

## Architecture

```
src/sim/          The game. Pure, headless TypeScript — the non-negotiable core.
  rng.ts          xorshift128+ on 32-bit lanes; named streams (deck/wind/scatter/cart/caddie)
  cards.ts        52-card deck, ids, shuffling
  hands.ts        Hand typing (strict structure: the selected cards ARE the hand), pips, yardage/scatter tables
  swing.ts        Distance formula, lie rules, per-card wind, honest previews
  holes.ts        Hole schema validation, layout lie lookup, water drops, par bands
  putting.ts      Green factor (slope), putt planning/resolution — fully deterministic
  engine.ts       The reducer: initRound / reduce / replay. State ≡ fold(seed, actions)
  data/           Hand-authored courses (Sunnyvale Municipal front 9)
tools/cli.ts      Plays a full 9-hole round with random legal inputs (dead-end canary)
tests/            325 tests incl. mechanical purity lint (no ambient randomness, no rendering imports)
```

**The rule that makes everything else work:** the sim has zero rendering imports, zero I/O, and zero ambient randomness. Entire game state derives from `(seed, playerActions[])` — same inputs, identical run, on any device. Saves are action logs. Dailies are a shared seed. Match Play ghosts are a few KB of actions. The balance harness (M6) is just this module in a loop. A purity test suite enforces all of it mechanically.

The UI (M2+: React 18 + PixiJS + Zustand, wrapped in Capacitor) subscribes to the sim and renders it; it never computes game logic.

## Commands

```bash
npm install
npm run dev           # play in a browser (phone viewport recommended)
npm test              # 330 tests
npm run coverage      # sim/ coverage (gate: ≥85%, currently >96% on every metric)
npm run typecheck     # TS strict, zero any
npm run sim           # watch a full random 9-hole round in the terminal
npm run build         # single-file dist/index.html (694 KB, fully offline)
npm run artifact      # + dist/artifact.html fragment for claude.ai publishing
npx tsx tools/smoke.ts       # headless phone-viewport screenshot smoke test
npx tsx tools/smoke-putt.ts  # drives a hole to the green and putts out
```

UI structure (`src/ui/`): a Zustand store wraps `initRound/reduce`; React renders
HUD/hand/action bar from sim state; `canvas/PixiCourse.ts` (PixiJS, flat vector,
zero raster assets) draws the course strip and green close-up and animates the
`lastStroke` physics the sim reports. Signal orange appears on exactly two
things: the cup and the selected hand.
