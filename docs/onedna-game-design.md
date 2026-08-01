# OneDna — game design

Status: **design phase, pre-implementation.** Nothing in this document has shipped.
The production MVP is implemented at `/dna` with a 28-day archive at
`/dna/archive`. The rationale below is retained as the record of the approved design.

Companion documents:

- [Rule specification](./onedna-rule-specification.md) — formal rules, deduction library, worked puzzles
- [Generator design](./onedna-generator-design.md) — pipeline, difficulty model, validation
- [Technical plan](./onedna-technical-plan.md) — architecture, data models, tests
- [Roadmap](./onedna-roadmap.md) — MVP, phases, risks, go/no-go

Every quantitative claim below comes from
`scripts/prototypes/onedna-feasibility.mjs`, a throwaway prototype written to
test this design before committing to it. Its results are reproduced in the
[generator design](./onedna-generator-design.md#prototype-results).

---

## 1. The one-paragraph game

**OneDna is a 6×6 grid of four bases — A, T, C and G — that you complete by
balancing pairs and following bonds** (8×8 at Hard). A and T belong to one pair; C and G to
the other. Every row and column is half A–T and half C–G, uses all four bases,
and never lets two identical bases touch. A handful of cells are joined by
curved _bonds_ that reach across the board; bonded cells always hold a
complementary pair — A with T, C with G. Four one-line rules, no exceptions, no
guessing. The bonds are what makes it OneDna rather than another balance grid:
a deduction in the top-left corner lands, through a bond, in the bottom-right.

---

## 2. Phase 1 — what the repository already gives us

### 2.1 Reusable as-is

| System                                  | Where                                                                                                 | Notes                                                                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page shell                              | `components/SiteHeader.tsx`, `SiteFooter.tsx`, `BrandLogo.tsx`                                        | Fixed-size centred wordmark, back arrow, trailing slot. `tests/shell.spec.ts` asserts every route matches; OneDna must join `PAGES` there.           |
| Access gate                             | `lib/access/*`, `app/play/page.tsx`                                                                   | `getAccessState()` already gates `/sudoku`; `/dna` does the same with two lines. The `onegames_test` cookie path works unchanged.                    |
| Design tokens                           | `app/globals.css` `:root`                                                                             | Surfaces, ink ramp, hairlines, `--region-*` colour families, Fraunces/Inter, page padding. OneDna needs one new game accent and zero new primitives. |
| Date + daily selection                  | `lib/date.ts`, the `hashDate` pattern in `lib/sudoku/puzzles.ts`                                      | A stable string hash over `${date}-${difficulty}` indexing a curated bank. Port the pattern, not the module.                                         |
| Archive shape                           | `app/sudoku/archive/page.tsx`                                                                         | 28-day list reading local saves. Structurally identical for OneDna.                                                                                  |
| Puzzle-bank tooling convention          | `scripts/generate-puzzles.mjs`, `scripts/validate-sudoku-puzzles.mjs`, `scripts/lib/sudoku-rules.mjs` | JSON bank + a plain-Node rules mirror for build tooling + a `validate:*` package script. Proven; copy the shape.                                     |
| Control-surface CSS                     | `.control-surface`, `.tool-row`, `.number-row`, `.number-key`, `.game-header`, `.difficulty-tabs`     | Already generic in everything but the class names. See §2.3.                                                                                         |
| Modal, settings and completion patterns | `components/sudoku/SettingsPanel.tsx`, `CompletionPanel.tsx`                                          | Toggle rows, danger zone, stats grid, share flow — all game-agnostic in behaviour.                                                                   |
| Accessibility patterns                  | `SudokuBoard.tsx`                                                                                     | `role="grid"`/`gridcell`, roving `tabIndex`, composed `aria-label`, `aria-live` announcer, `.reduce-motion` class. This is the template.             |
| Test organisation                       | `tests/*.test.ts` (vitest, node env), `tests/*.spec.ts` (Playwright, desktop + mobile projects)       | Unchanged.                                                                                                                                           |

### 2.2 Sudoku-specific — do **not** reuse

- `lib/sudoku/constraints.ts` — the peer model is row/column/box/colored-group.
  OneDna's constraint units are _lines with a composition budget_, _orthogonal
  adjacency_, and _bonds_. Sharing this type would be a false abstraction.
- `lib/sudoku/solver.ts` — a min-remaining-values backtracker over 9 symbols.
  OneDna's production solver is a **human-technique engine first** and a
  brute-force verifier second; different shape, different output.
- `lib/sudoku/types.ts` — `Board = number[]` of 0–9, `Notes`, `GameSave` with a
  Sudoku `puzzleId`. OneDna gets its own types under `lib/dna/`.
- `hooks/useSudokuGame.ts` — the state machine is close but not identical
  (bases instead of digits, bonds, a different hint model). Copy the _shape_,
  not the file.
- The `--region-*` colour system belongs to Sudoku's colored groups. OneDna
  borrows two of the same hues for its pair families but under its own names.

### 2.3 Shared components that need generalising

Three things are currently Sudoku-shaped only by naming, and should be lifted
**when OneDna needs them, not before**:

1. **`components/GameLogo.tsx`** must gain a `"dna"` key: the `GameKey` union,
   `GAME_PALETTE`, `GAME_LABEL`, a `DnaMark`, and the mirror in
   `scripts/build-og.mjs`. `components/GameFamily.tsx` currently lists OneWord,
   OneMatch and OneNumbers as "Coming soon" — OneDna takes one of those slots.
   **This is a product decision, not a technical one, and needs a call before
   implementation** (see [roadmap](./onedna-roadmap.md#open-product-questions)).
2. **CSS class names.** `.number-row`/`.number-key` are a 3×3 or 9-across key
   pad; OneDna wants a 4-across base pad with identical ergonomics. Rename the
   shared block to `.key-pad`/`.key`, keep `.number-*` as the Sudoku-specific
   modifier. Low risk, one commit, done before OneDna CSS lands.
3. **Stats and streaks.** `lib/sudoku/persistence.ts` owns `Stats` with
   `completedDates`/`currentStreak`. A player finishing OneDna should extend
   the same OneGames streak. Extract `lib/stats.ts` with a game-keyed schema —
   see [technical plan](./onedna-technical-plan.md#persistence).

### 2.4 Constraints the application imposes

- **Next 16 App Router, RSC.** The board is a client component; the puzzle bank
  is a static JSON import, so the daily puzzle can render without a request.
- **Two build targets** — `vinext build` (Cloudflare Worker) and `next build`
  (Vercel). No Node-only APIs in anything the client imports.
- **JSON imports need `with { type: "json" }`** — learned the hard way in
  `lib/sudoku/puzzles.ts`; Playwright's esbuild loader rejects a bare import.
- **`localStorage` only.** No server-side game state exists. Anything that must
  survive a device change (a global leaderboard) needs infrastructure that does
  not exist today.
- **Fixed light theme**, `color-scheme: light`. No dark mode to design for.
- **Existing e2e shell tests** will fail unless `/dna` and `/dna/archive` are
  added to `PAGES` in `tests/shell.spec.ts` and `app/sitemap.ts`.
- **Lint forbids `setState` directly inside an effect** (`react-hooks/set-state-in-effect`);
  the codebase's workaround is `queueMicrotask`.

---

## 3. Phase 2 — critique of the raw proposal

### 3.1 The finding that reframes everything

The proposal's four bases are not four independent symbols. They are **two
binary questions wearing one letter**:

```
pair        A,T = the A–T pair        C,G = the C–G pair       (1 bit)
strand      A,C = upper strand        T,G = lower strand       (1 bit)
```

With `0=A 1=T 2=C 3=G`, `complement(b) = b ^ 1` and `pair(b) = b >> 1`. That is
elegant to implement — and dangerous to design around, because **any rule
phrased as a relation between two cells decomposes into two independent binary
rules.** "Bonded cells are complementary" means _same pair, opposite strand_: a
constraint on the pair layer and a separate constraint on the strand layer. So
does "balanced rows". So does "unique rows".

A rule set built only from such rules is **two Binairo puzzles stacked in one
grid**. It looks like a four-symbol game and plays like two two-symbol games.
Strong solvers find the decomposition within a few sessions, and the theme
collapses into a costume.

Only rules that treat the four symbols **jointly** resist this. There are two
in the proposal's vicinity:

- _no three identical in a line_ / _identical bases may not touch_ — a
  conjunction across both layers;
- _every base must appear_ / _exact per-base counts_ — a constraint on the
  joint distribution, not on either margin.

**Every mechanic below is judged first on whether it couples the two layers.**

### 3.2 Rule-by-rule verdicts

| Mechanic                                                   | Verdict                                       | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Complementary connections (bonds)**                      | **Core — promoted to the signature mechanic** | The only proposed rule that moves information _across_ the board rather than along a line. Trivial to explain ("linked cells pair up"), trivial to render, one line in the data model, and it produces the deduction chain — corner to corner — that no other grid puzzle has. Prototype: bonds are worth ≈5 given clues at 6×6, so they also let the board show fewer letters and look calmer. It decomposes per layer, but it is the _reach_ that earns it, not the coupling. |
| **Balanced rows/columns (`#A=#T`, `#C=#G`)**               | **Needs redesign → replaced**                 | As stated it is weak: at 6 wide it permits a row of `CCCGGG` with no A or T at all, so deductions are mushy. Replaced by the two-clause composition rule in §4: _half of every line is A–T, half is C–G_, **and** _all four bases appear_. The second clause is the joint constraint that keeps the layers coupled; ablation shows it is worth ≈3 clues.                                                                                                                        |
| **No triples (`AAA`)**                                     | **Needs redesign → strengthened**             | Correct instinct, wrong threshold. "No three in a row" almost never binds at 6 wide with four symbols. **Identical bases may not touch orthogonally** is simpler to say, easier to see, works in both axes at once, and is the single highest-value rule in the system: removing it costs ≈5 clues and it fires ~40 times per solve.                                                                                                                                            |
| **Unique rows / unique columns**                           | **Save for future expansion**                 | A lovely late-game rule in binary puzzles, where rows collide often. With four symbols at 6 wide, accidental duplicate rows are rare, so the rule almost never fires — it is a fifth line of tutorial copy that buys nothing. Revisit only if a 4×4 or binary-pair variant ships.                                                                                                                                                                                               |
| **Mutation cells ("may break one rule")**                  | **Reject**                                    | Exception-based rules are the enemy of a hint engine. "This cell is allowed to be wrong" makes every deduction conditional, forces the solver to branch on which rule is suspended, and makes the explanation copy ("this must be T, unless…") unwritable. It is also the opposite of calm. The proposal's own instruction is right: if a mutation ships, it must be a _positive_ constraint. See §3.3.                                                                         |
| **Enzyme cells ("neighbours must include ≥1 A and ≥1 T")** | **Reject**                                    | An at-least-one constraint over an overlapping 4-cell neighbourhood is the weakest useful form of deduction: it rarely forces anything alone, and when it does the player has to hold four overlapping neighbourhoods in working memory. Poor deduction quality, high cognitive load, hard iconography, hard hints.                                                                                                                                                             |
| **PCR regions (`A+T > C+G` inside a region`)**             | **Reject**                                    | Inequalities over irregular regions give soft eliminations — you can seldom conclude a specific base, only "not all of these". Combined with irregular region borders on a 6×6 mobile board, the visual cost is high and the logical yield is low. If regions ever ship they must carry an _exact_ composition ("this region holds one of each base"), which is crisp — see [roadmap phase 3](./onedna-roadmap.md).                                                             |
| **Restriction sites (forbidden sequence `ATCGAT`)**        | **Reject**                                    | A six-long forbidden motif is invisible to a human until it has almost happened, so it functions as a trap rather than a tool. It also overlaps the no-touching rule, is near-impossible to hint gracefully, and makes generation slower for no measured benefit.                                                                                                                                                                                                               |
| **Four symbols entered directly**                          | **Core — keep, with a caveat**                | Keep the four letters as the primary, colour-independent signal. But present the _pair_ as a visible property of every chip (tint + strand marker), so the player can read the pair layer at a glance without doing the mapping in their head. The four symbols are the surface; the two questions are the strategy.                                                                                                                                                            |
| **6×6 / 8×8 / 10×10 difficulty ladder**                    | **Optional — partially kept**                 | Verified: 6×6 is the right daily size (≈25 cells to fill ≈ Tango's session length), 8×8 is the right Hard (≈42 fills), 10×10 works for a weekly but not a daily. The first prototype used a tighter 8×8 rule and produced 51 forced-but-obvious fills — long and dull. Board size is a session-length dial, not a difficulty dial; both matter and they are not the same.                                                                                                       |

### 3.3 If a "mutation" mechanic ever ships

Rewritten as a positive constraint, the interesting version is a **repeat
bond**: a bond drawn with a doubled stroke means the two cells hold the _same_
base rather than complementary ones. It is precise, it needs no exception to
any existing rule, it reuses the entire bond data model and renderer, it doubles
the bond vocabulary without doubling the tutorial, and it is thematically honest
(a tandem repeat). **This is the first post-launch mechanic.** Everything else
in the proposal's advanced list stays rejected.

---

## 4. Phases 3 and 4 — directions explored, and the choice

Four systems were designed far enough to judge. Full rules for the winner are in
the [rule specification](./onedna-rule-specification.md).

### Direction A — four-base balance (the raw proposal)

Bases placed directly; `#A=#T`, `#C=#G`; no triples; unique rows and columns;
complementary connections.

_Sample turn:_ a row holds two A and one T with three cells open, so one of the
open cells is T and the others are C/G.
_Main deductions:_ count saturation, triple prevention, row uniqueness.
_Advantages:_ familiar, easy to generate.
_Risks:_ **decomposes into two independent binary puzzles** (§3.1); unique-rows
almost never fires; `#A=#T` permits pair-starved lines, so deductions are soft.
_Similarity:_ Binairo/Takuzu with extra letters.
_Generator:_ fine. _Mobile:_ fine. _Depth:_ shallow once the decomposition is seen.

### Direction B — double strand

The board is two linked strands; strand 2 is the reverse complement of strand 1.

_Sample turn:_ fill a cell on the top strand and the mirrored bottom cell fills
itself.
_Main deductions:_ palindromic tension between a row and its own reverse.
_Advantages:_ the most thematically literal; beautiful symmetry motifs.
_Risks:_ **half the board carries no decision.** Every derived cell is
free information, so the effective puzzle is n×n/2 with an awkward mirror
constraint layered on. Players experience the bottom half as decoration, and the
completion moment happens twice.
_Similarity:_ symmetry variants of Nonogram/Kakuro.
_Generator:_ constrained but workable. _Mobile:_ fine. _Depth:_ low; the mirror
is the only idea and it is fully understood in one game.

### Direction C — base-pair tiles

Each logical unit is a domino: A–T or C–G, placed with an orientation.

_Sample turn:_ drop a C–G tile horizontally, choosing which end is C.
_Main deductions:_ packing plus orientation.
_Advantages:_ makes the pair concept literal; four visible letters, two logical
objects.
_Risks:_ the packing sub-problem dominates the logic — the player spends their
attention on tiling geometry rather than deduction, which is a _different game_
(closer to Dominosa). It also doubles the input model (choose tile, choose
orientation, choose position) on the exact device where taps are expensive, and
tile boundaries fight the grid lines visually.
_Similarity:_ Dominosa, Fillomino.
_Generator:_ harder — tilings and uniqueness interact badly. _Mobile:_ poor.
_Depth:_ real, but it is packing depth, not reading depth.

### Direction D — **Strand Balance** (recommended)

Bases placed directly. Four rules: pair balance per line, all four bases per
line, identical bases may not touch, and long-range complement bonds.

_Sample turn:_ row 3 already shows three C/G cells, so every remaining cell in
row 3 is A or T; the cell at r3c3 is bonded to r3c6, so those two are A and T in
some order; r3c3 sits beside a T, so r3c3 is A and r3c6 is T.
_Main deductions:_ neighbour exclusion, pair saturation, base saturation, bond
propagation, bond narrowing, line completion — see the
[deduction library](./onedna-rule-specification.md#6-deduction-library).
_Advantages:_ four one-line rules; every rule measurably earns its place;
bonds give long-range chains that no binary grid puzzle has; generation is
trivially reliable (300/300 unique and logic-only, ~1400 puzzles/second).
_Risks:_ the required-technique ceiling is tier 2 — see §7.
_Similarity:_ shares the balance skeleton with Binairo and the relational-hint
idea with Tango, but neither is a four-symbol game and neither has long-range
constraints.
_Generator:_ excellent. _Mobile:_ excellent — 6×6, 4-key pad. _Depth:_ good, with
a clear expansion path.

### Scoring

| Criterion                           | A four-base balance | B double strand | C pair tiles | **D Strand Balance** |
| ----------------------------------- | ------------------- | --------------- | ------------ | -------------------- |
| Learnability                        | 6                   | 7               | 5            | **9**                |
| Logical depth                       | 4                   | 3               | 6            | **7**                |
| Originality                         | 4                   | 7               | 6            | **8**                |
| Visual identity                     | 6                   | 8               | 7            | **9**                |
| Generator reliability               | 6                   | 5               | 4            | **10**               |
| Daily replayability                 | 5                   | 3               | 5            | **8**                |
| Accessibility                       | 6                   | 5               | 4            | **8**                |
| Implementation risk _(10 = safest)_ | 6                   | 5               | 3            | **8**                |
| **Total**                           | 43                  | 43              | 40           | **67**               |

**Direction D is recommended.** It is the only direction where every rule was
individually ablated and shown to pay for itself, where generation was proven at
scale before committing, and where the mechanic that carries the identity —
bonds — is also the cheapest to build, render and explain. A and C were rejected
on measured weakness; B was rejected because half its board is not a puzzle.

---

## 5. Phase 10 — UX and interaction

### 5.1 Layout

Identical skeleton to the redesigned OneSudoku screen, so the two games feel
like one product:

```
SiteHeader   [back]        OneGames wordmark        [settings]
game-header  logo + "OneDna" + date            timer + pause chip
difficulty   ( Easy | Medium | Hard )              fill counter
play-layout  ┌ board (hero, square, bonds drawn over it) ┐ ┌ control surface ┐
             │ 6×6 or 8×8                               │ │ tools           │
             └ rule legend strip                        ┘ │ base pad A T C G │
                                                          └ keyboard note    ┘
SiteFooter
```

Desktop is the existing two-column `play-layout`; mobile stacks board then
controls, board full width. Reuse `.board-frame`, `.control-surface`,
`.game-header`, `.difficulty-tabs` verbatim.

### 5.2 The cell

Four cues per filled cell, so colour is never load-bearing:

| Cue              | Encodes          | A             | T                 | C             | G                 |
| ---------------- | ---------------- | ------------- | ----------------- | ------------- | ----------------- |
| Letter (primary) | the base         | A             | T                 | C             | G                 |
| Chip tint        | the **pair**     | sky wash      | sky wash          | coral wash    | coral wash        |
| Strand marker    | upper/lower      | top-left tick | bottom-right tick | top-left tick | bottom-right tick |
| Letter weight    | given vs entered | 600 ink       | 500 accent        | 600 ink       | 500 accent        |

The strand marker is the quiet payoff: a bond always joins one top-tick cell to
one bottom-tick cell of the same tint, so a correct bond is visible as a shape
relationship before you read the letters.

Empty cells show up to four candidate letters in a 2×2 mini-grid — far simpler
than Sudoku's 3×3 and legible at 6×6 on a 320px screen.

### 5.3 Bonds

- Drawn as a soft graphite arc at ~35% opacity, routed **over** the grid with a
  1.5px stroke, endpoints capped with a small ring.
- Every bond also carries a **numeral badge (1–8)** in the corner of both
  endpoint cells. This is not decoration: it is how the bond is read on a small
  screen, how it is read by anyone who cannot trace a thin curve, and how it is
  named in the accessibility label and in hint copy.
- Cap at 8 bonds. Generator prefers Manhattan distance ≥ 2 and penalises
  crossings — see [generator aesthetics](./onedna-generator-design.md#7-aesthetic-filter).
- On `prefers-reduced-motion` or the in-game reduce-motion toggle, bonds never
  animate; they simply exist.

### 5.4 Input

| Gesture                         | Action                          | Rationale                                                      |
| ------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| Tap an unselected cell          | select it                       | matches OneSudoku                                              |
| Tap the **selected** cell again | cycle A → T → C → G → empty     | one-handed play with no reach to the pad; the Tango affordance |
| Tap a base on the pad           | write it into the selected cell | 4 keys at ~72×64px on a 375px screen                           |
| Long-press a pad key            | write it as a candidate note    | avoids a mode switch for a single note                         |
| Notes toggle                    | persistent notes mode           | unmistakable active state, as in the Sudoku redesign           |
| `A` `T` `C` `G`                 | write                           | keyboard                                                       |
| Arrows                          | move selection, wrapping        | keyboard                                                       |
| `Backspace` / `Delete`          | erase                           | keyboard                                                       |
| `N`                             | notes                           | keyboard                                                       |
| `H`                             | nudge hint                      | keyboard                                                       |
| `Escape`                        | resume from pause               | keyboard                                                       |

**Decision: both direct entry and cycling ship.** The pad is discoverable and
fast for two-handed play; cycling is what makes the game usable one-handed on a
phone, which is where a daily game is actually played. They do not conflict
because cycling requires the cell to already be selected.

### 5.5 Feedback and states

- **Correct entry:** the one-off `cell-settle` flash already in `globals.css`.
- **Rule conflict:** the offending cells take an alert ring. Because OneDna has
  four rules, the conflict record carries _which_ rule broke — the same
  precedence system as Sudoku's colored groups, and the same "no banner" policy.
  A bond conflict additionally tints the bond arc and its badges.
- **Mistake vs conflict:** with "check mistakes" on, a value that contradicts the
  stored solution is a _mistake_ (counted once, however many rules it breaks). A
  value that breaks a rule against the current board is a _conflict_ (shown, not
  counted). Same distinction OneSudoku draws.
- **Pause:** full-board overlay, blurred, "Take your time." — reused.
- **Completion:** the board settles, then the completion panel. Both flourishes
  are pure CSS keyframes so the global reduce-motion rules flatten them.

### 5.6 Rule legend

A permanent strip under the board carrying four glyph-and-phrase chips. On
screens under 480px it collapses to four glyphs plus an info button that opens
the same explainer the tutorial uses. Identical pattern to
`ColoredRuleLegend.tsx`.

---

## 6. Phase 11 — onboarding

Beats 2 to 5 teach on a **single 6-cell strip** — one row, lifted out of a real
board — so each rule can be demonstrated in isolation with no other rule able to
explain the same move. Beat 6 is a full **4×4 board**, which under OneDna's rules
is exactly "one of each base in every row and column". That is worth knowing:
at 4×4 the no-twins rule is _implied_ by the other two composition rules, so a
player who has just met it cannot get the tiny puzzle wrong by forgetting it.
The safety net is a property of the rule set, not a special case in the code.

Seven beats, each a single interaction, target 30 seconds:

| #   | Board | Copy                                                               | Interaction                                                                                                                  |
| --- | ----- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | —     | "Four bases. **A** pairs with **T**. **C** pairs with **G**."      | Two chips drift together into a pair. Tap to continue.                                                                       |
| 2   | strip | "Every row is half A–T, half C–G."                                 | The strip's three A/T and three C/G cells pulse once.                                                                        |
| 3   | strip | "This row already has its three C–G cells. So this one is A or T." | Player taps the cell; only A and T are offered. **First real deduction, ~12 seconds in.**                                    |
| 4   | strip | "And identical bases never touch."                                 | The strip is arranged so the row rule alone leaves both A and T open; the neighbouring T is what rules T out. Player taps A. |
| 5   | strip | "Linked cells always pair: A–T, C–G."                              | A bond arc draws to a cell at the far end; the partner fills itself.                                                         |
| 6   | 4×4   | "Your turn."                                                       | 3 clues, 2 bonds, 12 cells, all tier-1.                                                                                      |
| 7   | —     | "That's the whole game. Today's sample is ready."                  | Primary button → today's Easy.                                                                                               |

Beat 4 is the one that has to be constructed carefully: on a board where a base
can only appear once per line, base saturation would explain the same move, and
the player would learn the wrong lesson. The strip is 6 wide precisely so a base
_can_ appear twice, which makes the neighbour the only possible reason.

Rules:

- **No wall of text before the first interaction.** Beat 3 is a tap.
- **Skip** is always visible, top-right, and jumps to beat 7.
- **Replay** lives in Settings → "Replay the tutorial", and in the rule legend's
  info button.
- **Persistence:** `onegames:v1:dna:tutorial-seen`. Same namespace, same
  never-wiped-by-migration guarantee as the Sudoku colored-rule intro.
- **Accessibility:** every beat is a focusable region with a heading and a live
  region announcing the state change; the demonstration boards are real
  `role="grid"` boards, not images.
- The tutorial never blocks: a returning player who clears storage sees it
  once and can dismiss it in one tap.

---

## 7. Phase 12 — the hint engine

The logical solver _is_ the hint engine. It records a `Deduction` for every
elimination and every placement, so a hint is "run the solver from the player's
current board, take the first deduction, describe it".

Three levels, escalating cost:

| Level | Player-facing label | Shows                                                                               | Score cost |
| ----- | ------------------- | ----------------------------------------------------------------------------------- | ---------- |
| 1     | **Nudge**           | Highlights the target cell and the supporting cells. No value, no reason.           | −3         |
| 2     | **Explain**         | The sentence for the technique. Still no value unless the technique is a placement. | −6         |
| 3     | **Reveal**          | Writes the base.                                                                    | −12        |

Level 2 is the product. Example sentences, keyed by technique:

- `bond-complement` — "Bond 3 links this to r5c2, which is C. Bonded cells pair up, so this is G."
- `pair-saturation` — "Row 4 already has its three C–G cells. This one has to be A or T."
- `base-saturation` — "Column 2 has used both of its A's. Not another one here."
- `neighbour-exclusion` — "The cell above is T, and identical bases never touch."
- `base-completion` — "Row 6 still owes a G, and this is the only cell that can hold one."
- `pair-completion` — "Three cells left in column 5 and all three must be A–T."
- `bond-narrowing` — "Its partner can only be A or C, so this can only be T or G."

Copy rules: name the line, name the rule in the player's words, never say "put G
here" without the reason, never use a technique name in the UI.

**Honest limitation, measured:** across 128 generated puzzles spanning every
configuration, **no puzzle ever required a tier-3 technique.** Naked subsets and
spacing squeezes were implemented in the prototype and never fired as
_necessary_ steps. The consequence is a deliberate cut: **ship a two-tier
technique library.** Building subset machinery for the hint engine would be
dead code with a maintenance cost. This also means OneDna's difficulty is
carried by chain length and board size rather than by exotic techniques — the
same as Tango and Queens, and stated plainly rather than dressed up.

---

## 8. Phase 13 — scoring and completion

### 8.1 Is a score worth having?

Yes, but only if it is legible. An opaque score is worse than none. OneDna's
Logic Score is a published formula the player can reason about, shown with its
own deductions itemised on the completion panel.

```
par(difficulty)  = Easy 150s | Medium 300s | Hard 510s

timePenalty      = clamp(0, 20, round(20 × (elapsed − par) / par))

LogicScore       = clamp(0, 100,
                     100
                     − 6  × mistakes
                     − 3  × nudges
                     − 6  × explains
                     − 12 × reveals
                     − timePenalty)
```

- A clean solve at or under par scores **100**. This is reachable, and reaching
  it should feel like the game noticing.
- Slow but flawless bottoms out at 80 — pace matters, but never dominates.
- **Accessibility and comfort settings never affect the score.** Reduce motion,
  high contrast, notes, candidate auto-fill, related highlighting and matching
  highlights are all free. Only mistakes, hints and pace count. This is stated
  in the settings panel next to the toggles.
- Pause does not count. Stopping to think is the point of the game.

### 8.2 Completion panel

```
Sample sequenced.

Time      04:51
Mistakes  1
Hints     0
Bonds     5
Streak    12 days
                      Logic Score  94
                      100 − 6 (one mistake)
```

Reuses `.completion-panel`, `.completion-stats` and the share/return actions. The
one addition is the itemised score line, because an unexplained 94 is exactly
the opaque score this design rejects.

### 8.3 Spoiler-free share

The share payload contains **no board data at all** — not even pair families,
which would leak half the solution.

```
OneDna · Aug 1, 2026
Medium · 04:51 · 5 bonds
Mistakes 1 · Hints 0
Logic Score 94
onegames.app
```

---

## 9. Visual direction

OneDna inherits the OneGames shell unchanged: white paper, graphite ink,
Fraunces headings, Inter interface type, hairline rules, black pill buttons, one
quiet centred footer.

- **New game accent: teal `#2F7D95`** with pale `#DCEBF1` and wash `#EFF6F9`,
  slotting into `GAME_PALETTE` beside Sudoku's blue, OneWord's violet, OneMatch's
  rose and OneNumbers' green.
- **Pair tints** reuse two existing region hues: A–T on `--region-sky`, C–G on
  `--region-coral`. They are already tuned to carry ink text.
- **Logo concept** (to be drawn in `GameLogo.tsx`'s shared 64×64 geometry, same
  3.2/2 strokes, same 9-unit radius): a rounded panel holding a short ladder —
  two vertical strands and three rungs, the middle rung solid in the accent, the
  outer two pale. It reads as DNA at 104px and as a rhythm at 20px, and it
  matches the family's "pale rhythm plus one solid accent moment" grammar.
- **Motion**: the completion flourish is a single settle; a solved bond gives a
  120ms arc brighten. Nothing loops, nothing glows.

Explicitly avoided: neon, laboratory dashboards, glow, molecule illustrations,
cartoon science, dense technical labels, gamified clutter. The theme lives in
the _language_ — bases, pairs, bonds, strand, sample, sequenced, Lab — and in
the bond arcs. The grid stays the hero.

---

## 10. Phase 16 — accessibility

Parity with the OneSudoku board is the floor, plus everything bonds add.

**Cell labels** compose from position, value, state, pair and bond:

```
"Row 3, column 4, empty, candidates A and T, bond 2 to row 6 column 1"
"Row 1, column 2, T, A–T pair, given"
"Row 5, column 5, C, C–G pair, bond 4 to row 2 column 3, conflicts with the cell above"
```

The bond partner is named by **coordinates, never by "the connected cell"** —
the arc is a visual convenience, not the source of truth.

- **Keyboard**: roving `tabIndex` across the grid, arrows wrap, `A/T/C/G` write,
  `Backspace` erases, `N` notes, `H` nudge, `Escape` resumes. The base pad and
  every tool are in the tab order. Bonds are reachable by moving to either
  endpoint.
- **Base pad labels**: `"Enter A, pairs with T, 4 left"`.
- **Bond list**: a visually hidden `<ul>` after the grid enumerating every bond
  as "Bond 2 links row 3 column 4 to row 6 column 1", so a screen-reader user
  can survey the annotations without walking 36 cells.
- **Focus management**: the tutorial and completion dialogs take focus on open
  and restore it on close; the first-run explainer is an inline callout, not a
  modal, so it never traps.
- **Announcements** (`aria-live="polite"`): entries, erases, conflicts, hints,
  pause/resume, completion. Errors are announced once, not per rule broken.
- **Reduced motion**: both the OS preference and the in-game toggle, via the
  existing `.reduce-motion` class.
- **Non-colour identification**: letter, strand marker and bond numeral all work
  with colour fully removed. This is testable — render at `filter: grayscale(1)`
  in a Playwright check.
- **Touch targets**: cells ≥ 44px at 6×6 down to 320px viewport width (54px at
  375px); base pad keys ≥ 64px tall; every tool ≥ 44×44.
- **Contrast**: given letters ink `#1A1A1A` on pair washes ≥ 12:1; entered
  letters accent teal on wash ≥ 4.6:1; candidate notes slate on wash ≥ 4.5:1.
  To be verified with the `design:accessibility-review` pass before launch.
- **Zoom**: the board is `aspect-ratio: 1` in a `min(100%, 34rem)` column; no
  horizontal scroll at 320px, asserted by the existing shell test.

---

## 11. What this design deliberately does not do

- No mutation cells, enzymes, PCR regions or restriction sites.
- No unique-row rule.
- No exceptions of any kind in any difficulty.
- No tier-3 technique machinery.
- No leaderboard, season, or unlockable.
- No second board size beyond 6×6 and 8×8 at launch.
- No biology. The theme is a naming convention over a constraint system, and the
  tutorial never mentions a cell, a gene or a helix.
