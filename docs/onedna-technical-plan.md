# OneDna — technical plan

Status: **MVP shipped in the repository.** The implemented save schema is
`onegames:v1:dna:*`, record version 1. OneDna stats remain isolated for launch;
the proposed shared-stats v2 migration was deliberately deferred to protect
existing Sudoku history. Candidate notes and optional sound feedback are not
exposed in the launch UI. Hints use the structured tier-1/tier-2 taxonomy.

Status: **design phase.** No file below exists yet.

Companion: [game design](./onedna-game-design.md) · [rules](./onedna-rule-specification.md) · [generator](./onedna-generator-design.md) · [roadmap](./onedna-roadmap.md)

---

## 1. File layout

```
app/dna/page.tsx                        access-gated, resolves ?date= like /sudoku
app/dna/archive/page.tsx                28-day local archive

components/dna/DnaGame.tsx              shell: header, difficulty, layout, dialogs
components/dna/DnaBoard.tsx             the grid, cells, keyboard, aria
components/dna/BondLayer.tsx            the SVG arc overlay, absolutely positioned
components/dna/BaseKeypad.tsx           A T C G pad + undo/redo/erase/notes/hint
components/dna/RuleLegend.tsx           the four-rule strip
components/dna/Tutorial.tsx             the seven-beat onboarding
components/dna/HintNote.tsx             nudge / explain / reveal presentation
components/dna/CompletionPanel.tsx      logic score breakdown + share

hooks/useDnaGame.ts                     game state machine

lib/dna/types.ts                        every type in §3
lib/dna/rules.ts                        R1–R4, candidate masks, conflict detection
lib/dna/solver.ts                       logical solver (deductions) + brute verifier
lib/dna/difficulty.ts                   scoring from a solve path
lib/dna/hints.ts                        Deduction -> player-facing copy
lib/dna/puzzles.ts                      bank load, validation, daily selection
lib/dna/puzzle-validation.ts            typed parse + structural checks
lib/dna/puzzle-bank.json                shipped data
lib/dna/persistence.ts                  saves, settings, tutorial flag

lib/stats.ts                            NEW — game-keyed stats shared with Sudoku

scripts/lib/dna-rules.mjs               plain-Node mirror for tooling
scripts/generate-dna-puzzles.mjs
scripts/validate-dna-puzzles.mjs

tests/dna-rules.test.ts
tests/dna-solver.test.ts
tests/dna-generator.test.ts
tests/dna-persistence.test.ts
tests/dna-bank.test.ts
tests/dna-gameplay.spec.ts              Playwright, desktop + mobile
```

`lib/dna/*` imports nothing from `lib/sudoku/*`. The only genuinely shared
runtime code is `lib/date.ts` and the new `lib/stats.ts`.

---

## 2. Module boundaries

```
                    puzzle-bank.json
                           │  parsePuzzleBank (typed, throws on malformed)
                           ▼
types.ts ◄──────────── puzzles.ts ──────────► hooks/useDnaGame.ts
   ▲                       │                         │
   │                       │                         ├─► components/dna/*
   ├── rules.ts ◄──────────┘                         │
   │      ▲                                          │
   ├── solver.ts ──────► difficulty.ts               │
   │      │                                          │
   │      └────────────► hints.ts ───────────────────┘
   └── persistence.ts ◄──────────────────────────────┘
```

- `rules.ts` is pure: no React, no storage, no randomness. Everything about
  candidates, conflicts and legality lives here and nowhere else.
- `solver.ts` depends only on `rules.ts`. It exports the logical solver and the
  brute-force verifier as two separate functions with separate tests.
- `hints.ts` turns a `Deduction` into a sentence. It owns all player-facing rule
  language, so copy changes never touch the solver.
- `useDnaGame.ts` is the only stateful module.

---

## 3. Data model

Strict typing throughout. No `any`, no non-null assertions, no unchecked casts —
`parsePuzzleBank` narrows `unknown` with real guards, exactly as
`lib/sudoku/puzzle-validation.ts` already does.

### 3.1 Primitives

```ts
/** 0 = A, 1 = T, 2 = C, 3 = G. See lib/dna/rules.ts for the bit identities. */
export type Base = 0 | 1 | 2 | 3;
export type BaseLetter = "A" | "T" | "C" | "G";
export type Pair = 0 | 1; // 0 = A–T, 1 = C–G
export type Strand = 0 | 1; // 0 = upper (A,C), 1 = lower (T,G)

export type CellIndex = number; // 0 .. size² − 1
export interface Coord {
  row: number;
  column: number;
}

export type BoardSize = 4 | 6 | 8 | 10;
export type Difficulty = "easy" | "medium" | "hard";

/** −1 means empty. Length is always size². */
export type Board = Int8Array;

/** 4-bit candidate mask per cell: bit b set means base b is still possible. */
export type CandidateMask = number;

export type LineKind = "row" | "column";
export interface LineRef {
  kind: LineKind;
  index: number;
}
```

### 3.2 Puzzle definition — immutable, shipped

```ts
export interface Bond {
  /** Stable 1-based id, used in the badge, the aria label and hint copy. */
  id: number;
  a: CellIndex;
  b: CellIndex;
}

export interface DnaPuzzle {
  id: string; // "medium-07", positional and stable
  difficulty: Difficulty;
  size: BoardSize;
  clues: Board; // −1 for empty
  solution: Board; // fully filled
  bonds: Bond[];
  meta: GeneratorMeta;
}

export interface GeneratorMeta {
  score: number;
  requiredTier: 1 | 2;
  techniques: Partial<Record<DeductionTechnique, number>>;
  longestChain: number;
  seed: number;
  revision: number;
}
```

### 3.3 Mutable game state — persisted

```ts
export const DNA_SAVE_VERSION = 1;

export interface DnaSnapshot {
  board: number[]; // −1 for empty; plain array for JSON
  notes: Record<CellIndex, Base[]>;
}

export interface DnaGameSave extends DnaSnapshot {
  version: typeof DNA_SAVE_VERSION;
  puzzleId: string; // ties the save to the definition
  date: string; // YYYY-MM-DD
  difficulty: Difficulty;
  elapsed: number;
  started: boolean;
  completed: boolean;
  completedAt?: string;
  mistakes: number;
  hints: { nudge: number; explain: number; reveal: number };
  history: DnaSnapshot[]; // board + notes only
  future: DnaSnapshot[];
}
```

Undo/redo snapshots carry **board and notes only**. Timer, mistake and hint
counts are monotonic and deliberately not rewound — undoing a move must not
refund a mistake.

### 3.4 Derived state — never persisted

```ts
export interface CellConflict {
  reasons: ConflictReason[];
  bondIds: number[];
}
export type ConflictMap = Map<CellIndex, CellConflict>;

export interface DerivedState {
  candidates: Int8Array; // CandidateMask per cell
  conflicts: ConflictMap;
  remaining: Record<BaseLetter, number>;
  filled: number;
  /** Set when the board can no longer reach any solution. */
  stuck: boolean;
}
```

### 3.5 Solver state and output

```ts
export type DeductionTechnique =
  | "naked-single"
  | "neighbour-exclusion"
  | "bond-complement"
  | "pair-saturation"
  | "base-saturation"
  | "pair-completion"
  | "base-completion"
  | "bond-narrowing";

export interface Deduction {
  technique: DeductionTechnique;
  targetCells: CellIndex[];
  supportingCells: CellIndex[];
  supportingBonds: number[];
  value?: Base;
  eliminated?: Base[];
  line?: LineRef;
  explanation: string;
  difficultyWeight: number;
}

export interface SolveResult {
  status: "solved" | "stalled" | "contradiction";
  board: Board;
  path: Deduction[];
  techniques: Partial<Record<DeductionTechnique, number>>;
  requiredTier: 1 | 2;
  longestChain: number;
}

/** Internal to the solver; never leaves the module. */
interface SolverState {
  candidates: Int8Array;
  value: Int8Array;
  baseCount: Int8Array; // [line * 4 + base]
  pairCount: Int8Array; // [line * 2 + pair]
  partner: Int16Array; // −1 when unbonded
  bondIdOf: Int16Array;
  path: Deduction[];
}
```

### 3.6 Statistics — shared

```ts
export type GameKey = "sudoku" | "dna";

export interface GameStats {
  gamesCompleted: number;
  bestTimes: Partial<Record<Difficulty, number>>;
  bestScores: Partial<Record<Difficulty, number>>;
  completedByDifficulty: Record<Difficulty, number>;
  totalTime: number;
  totalHints: number;
}

export interface OneGamesStats {
  version: 2;
  /** Any completed game on a date counts toward the one OneGames streak. */
  completedDates: string[];
  currentStreak: number;
  longestStreak: number;
  perGame: Record<GameKey, GameStats>;
}
```

### 3.7 Difficulty breakdown

```ts
export interface DifficultyBreakdown {
  weightedTechniques: number;
  cellsToFill: number;
  longestChain: number;
  tierPenalty: number;
  candidateBreadth: number;
  bondCredit: number;
  score: number;
  band: Difficulty | "tutorial" | "lab";
}
```

---

## 4. Persistence

```
onegames:v1:dna:game:<date>:<difficulty>    DnaGameSave
onegames:v1:dna:settings                    DnaSettings
onegames:v1:dna:tutorial-seen               "1"
onegames:v1:stats                           OneGamesStats  (shared, v2)
```

- The `onegames:v1` prefix stays. It is the _storage namespace_, not a schema
  version; per-record `version` fields carry migration. This is the arrangement
  the Sudoku v1→v2 migration proved out.
- `loadDnaGame(date, difficulty, puzzleId)` discards — and only discards — a
  save it cannot vouch for: wrong `version`, malformed board, or a `puzzleId`
  that no longer matches the puzzle served for that date. Settings, the tutorial
  flag and stats live under their own keys and are never touched.
- **The stats migration is the one risky edit.** `onegames:v1:stats` is
  currently Sudoku's flat `Stats`. Migrating to `OneGamesStats` v2 must:
  fold the existing flat fields into `perGame.sudoku`, preserve
  `completedDates`, `currentStreak` and `longestStreak` verbatim, and be
  idempotent. It needs its own test with a real v1 payload, and it must ship
  _before or with_ OneDna, never after.
- Settings are per game. OneDna's set: `checkMistakes`, `highlightRelated`,
  `highlightMatching`, `showBondBadges`, `autoRemoveNotes`, `sound`,
  `reducedMotion`. `showBondBadges` defaults **on** — it is an accessibility
  affordance, not a power-user toggle, and the setting exists only to let people
  who find the numerals noisy turn them off.

---

## 5. Routing and integration

| Change            | File                                              | Note                                                                            |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Game route        | `app/dna/page.tsx`                                | `getAccessState()` → redirect `/play`; `?date=` validated `^\d{4}-\d{2}-\d{2}$` |
| Archive           | `app/dna/archive/page.tsx`                        | mirrors the Sudoku archive                                                      |
| Sitemap           | `app/sitemap.ts`                                  | add `/dna` (`daily`) and `/dna/archive`                                         |
| Shell test        | `tests/shell.spec.ts`                             | add both paths to `PAGES` — **this test fails until you do**                    |
| Family lineup     | `components/GameFamily.tsx`                       | OneDna takes an active slot                                                     |
| Logo              | `components/GameLogo.tsx`, `scripts/build-og.mjs` | new `"dna"` key, mark, palette entry; regenerate `public/og.png`                |
| Access copy       | `components/AccessGate.tsx`, `app/play/page.tsx`  | currently says "OneSudoku"; becomes game-aware                                  |
| Shared keypad CSS | `app/globals.css`                                 | rename `.number-row`/`.number-key` → `.key-pad`/`.key`, keep Sudoku modifiers   |

---

## 6. Rendering notes

**The board** is a CSS grid of `<button role="gridcell">`, identical in
structure to `SudokuBoard.tsx`: roving `tabIndex`, composed `aria-label`,
`aria-invalid` on conflict, `data-cell` for tests.

**The bond layer** is one absolutely positioned `<svg>` over the grid,
`pointer-events: none`, `aria-hidden`, sized by a `ResizeObserver` on the board.
Arcs are quadratic Béziers whose control point is offset perpendicular to the
chord, so parallel bonds bow apart instead of overlapping. Endpoint badges are
**DOM elements inside their cells**, not SVG — they must scale with the cell,
inherit its conflict state, and be readable by assistive technology through the
cell's own label.

A visually hidden `<ul>` after the grid enumerates every bond, so the annotation
layer is fully available without seeing the arcs.

**Reduced motion** flattens every transition through the existing
`.reduce-motion` class and the global `prefers-reduced-motion` block.

---

## 7. Build-time validation

1. `npm run validate:dna` — the CLI oracle, run in CI.
2. `lib/dna/puzzles.ts` runs structural validation at import in non-production
   builds and throws on malformed data, matching `lib/sudoku/puzzles.ts`.
3. `tests/dna-bank.test.ts` re-validates the whole shipped bank with the real
   TypeScript solver, which is what keeps the `.mjs` tooling mirror honest.

---

## 8. Testing strategy

### Rule tests — `tests/dna-rules.test.ts`

- `complement`, `pair`, `strand` identities, including `complement(complement(b)) === b`.
- R1: valid and invalid lines at n = 4, 6, 8; the one-sided saturation edge case.
- R2: presence, the implied maximum `n/2 − 1`, and the n = 4 Latin-square consequence.
- R3: horizontal, vertical, corner and edge cells; diagonals explicitly allowed.
- R4: complementarity, disjointness, distance, same-line bonds.
- Candidate masks: each rule's contribution in isolation, then combined.
- Conflict detection: every `ConflictReason`, cells carrying several at once,
  and both endpoints of a bond mismatch being reported.

### Solver tests — `tests/dna-solver.test.ts`

- Solves each worked puzzle from the [rule spec §8](./onedna-rule-specification.md#8-worked-puzzles).
- Rejects an over-constrained board with `status: "contradiction"`.
- Returns `"stalled"`, never a guess, on an under-clued board.
- The brute verifier reports 0, 1 and ≥2 solutions on hand-built cases.
- **Solver and verifier agree** on a corpus of generated puzzles.
- Every `Deduction` is well-formed: non-empty targets, supporting cells that
  actually justify it, a weight matching the technique table.
- A puzzle solvable at tier 1 reports `requiredTier: 1`.

### Generator tests — `tests/dna-generator.test.ts`

- Generated puzzles: valid, exactly one solution, correct size, score inside the
  target band, tier ≤ 2.
- **Determinism**: the same seed produces a byte-identical bank.
- Serialization round-trips (`parse(serialize(p))` deep-equals `p`).
- No malformed bonds: disjoint, in range, distance ≥ 2, complementary.
- Aesthetic filters actually reject — feed a known-ugly layout and assert it.

### Persistence tests — `tests/dna-persistence.test.ts`

- Round-trip a current save.
- A save with a stale `puzzleId` is discarded; settings, tutorial flag and stats
  survive.
- Corrupt JSON, truncated boards and `null` all fail safely.
- **The stats v1 → v2 migration** with a real Sudoku v1 payload: streak and
  dates preserved, Sudoku totals folded into `perGame.sudoku`, idempotent on a
  second run.

### UI tests — `tests/dna-gameplay.spec.ts` (desktop + mobile)

Keyboard entry, arrow movement with wrap, cycle-on-tap, pad entry, notes,
undo/redo/erase, all three hint levels, pause/resume, difficulty switching,
reload persistence, completion and share, archive navigation, tutorial shown
once then remembered, bond badge and arc presence, accessibility labels naming
the bond partner by coordinates, reduced-motion toggle persisting, and no
horizontal scroll at 320px.

### Property-based tests

`vitest` has no built-in property runner and the project has no
`fast-check` dependency. **Recommendation: add `fast-check` as a devDependency**
— it is small, has no runtime cost, and these five properties are exactly where
example-based tests are weakest:

1. `complement(complement(b)) === b` and `pair(complement(b)) === pair(b)` for all `b`.
2. Every generated solution satisfies R1, R2 and R3 — for any seed.
3. Every generated puzzle's clues are a subset of its solution.
4. `parse(serialize(puzzle))` deep-equals `puzzle` for any generated puzzle.
5. Generation is deterministic: same seed, same bytes.

If adding a dependency is unwelcome, items 2–5 are still worth running as
seeded loops over 200 random seeds inside ordinary vitest tests. That captures
most of the value; only the shrinking is lost.
