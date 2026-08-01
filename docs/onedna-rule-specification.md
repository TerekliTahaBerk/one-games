# OneDNA — rule specification

Status: **design phase.** This document is the contract between the design and
the implementation. It is precise enough to translate directly into
`lib/dna/rules.ts`, `lib/dna/solver.ts` and their tests.

Companion: [game design](./onedna-game-design.md) · [generator](./onedna-generator-design.md) · [technical plan](./onedna-technical-plan.md) · [roadmap](./onedna-roadmap.md)

---

## 1. Primitives

```
Bases        A T C G
Encoding     A = 0   T = 1   C = 2   G = 3
Complement   complement(b) = b ^ 1        A↔T, C↔G
Pair         pair(b)       = b >> 1       0 = the A–T pair, 1 = the C–G pair
Strand       strand(b)     = b & 1        0 = upper (A, C), 1 = lower (T, G)
```

The encoding is chosen so that both structural questions are single bit
operations, and so `complement` and `pair` can never disagree: complementary
bases are always in the same pair and always on opposite strands.

```
Board        n × n, n even.  n = 4 (tutorial), 6 (Easy, Medium), 8 (Hard)
                             n = 10 is verified to work and is reserved for the
                             post-launch Weekly Lab.
Index        i = row * n + column,  0 ≤ i < n²
Line         a row or a column. There are 2n lines.
Half         h = n / 2
```

---

## 2. The four rules

Presented to the player as four one-line cards, in this order.

### R1 — Balance *(pair composition, per line)*

> **Every row and column is half A–T and half C–G.**

**Formal.** For every line `L` and every pair `p ∈ {0, 1}`:
`| { i ∈ L : pair(value(i)) = p } | = n / 2`.

**Scope.** Horizontal and vertical. Not regional, not global.

**Valid (n = 6).** `A T C G G A` → A/T cells = {A, T, A} = 3, C/G cells = {C, G, G} = 3 ✓
**Invalid.** `A T A G C A` → A/T = 4, C/G = 2 ✗

**Edge cases.** `n` must be even or R1 is unsatisfiable; the generator only
emits even `n`. A line with `n/2` A/T cells placed is *saturated* for that pair
even if no C/G cell is placed yet — saturation is one-sided and fires early.

**Deduction contribution.** The workhorse of the counting layer. Fires ≈13
times per 6×6 solve as `pair-saturation`, plus ≈2 as `pair-completion`.

**Visual.** The chip tint. A saturated pair reads as "this row already looks
half sky".

**Data.** Implicit in `n`. Nothing stored per puzzle.

### R2 — All four *(base presence, per line)*

> **Every row and column uses all four bases.**

**Formal.** For every line `L` and every base `b`:
`| { i ∈ L : value(i) = b } | ≥ 1`.

Combined with R1 this bounds every base above as well: since a pair owns exactly
`n/2` cells and both its bases must appear, each base appears at most
`n/2 − 1` times in a line. At `n = 6` that is 1 or 2; at `n = 8`, 1 to 3; at
`n = 4`, exactly 1 — which is why the 4×4 tutorial board is a Latin square.

**Valid (n = 6).** `A T C G G A` → A×2, T×1, C×1, G×2 ✓
**Invalid.** `A A C G G T` is valid; `A A C G G A` → no T ✗ (and A×3 exceeds the
implied maximum of 2)

**Edge cases.** At `n = 4` R2 forces a permutation, which makes R3 redundant on
any complete board — a property of the rules the tutorial leans on, not a special
case in code. At `n = 6` the implied maximum is 2, which is what makes
`base-saturation` fire so early.

**Deduction contribution.** ≈8 `base-saturation` and ≈0.3 `base-completion` per
6×6 solve. Ablation: removing R2 costs ≈2.8 given clues.

**Visual.** No dedicated affordance; carried by the legend line and by the
per-base remaining counter on the base pad.

**Data.** Implicit in `n`.

### R3 — No twins *(adjacency, global)*

> **Identical bases never touch.**

**Formal.** For every pair of orthogonally adjacent cells `i`, `j`:
`value(i) ≠ value(j)`. Diagonals are unconstrained.

**Scope.** Global, both axes, every interior edge.

**Valid.** `A T A` ✓ — and vertically, an A directly above a T ✓
**Invalid.** `A A` horizontally ✗; an A directly above an A ✗
**Not invalid.** An A diagonally adjacent to an A ✓

**Edge cases.** At `n = 4`, R1 and R2 already force every line to be a
permutation, so any board satisfying them satisfies R3 too — R3 is *implied*, not
vacuous, and the solver still uses it to eliminate candidates mid-solve. Border cells have 2 or 3 neighbours,
interior cells 4; the constraint is symmetric so the solver evaluates each edge
once.

**Deduction contribution.** The single highest-value rule: ≈40 `neighbour-exclusion`
eliminations per 6×6 solve. Ablation: removing it costs ≈5.1 given clues.

**Visual.** No affordance needed — the rule is legible in the finished board,
which never shows a doubled letter.

**Data.** Implicit.

### R4 — Bonds *(complement, per puzzle)*

> **Linked cells always pair: A–T, C–G.**

**Formal.** A puzzle carries a set of bonds `B`, each an unordered pair of
distinct cells `{u, v}`. For every bond: `value(v) = complement(value(u))`.
Equivalently `pair(u) = pair(v)` and `strand(u) ≠ strand(v)`.

**Invariants the data must satisfy** (enforced by validation, see §7):

- `u ≠ v`, both in range `[0, n²)`.
- **Every cell belongs to at most one bond.** A cell in two bonds would force
  its two partners equal — a valid but unstated deduction, and a second concept
  to teach. Rejected for launch.
- Manhattan distance `≥ 2`. An adjacent bond is legal logically but reads as a
  local hint rather than a strand connector, and duplicates R3's work.
- At most 8 bonds per puzzle.
- Given clues must already satisfy every bond.

**Valid.** Bond between a cell holding C and a cell holding G ✓
**Invalid.** Bond between two cells both holding C ✗; bond between a cell
holding A and a cell holding G ✗ (same strand parity, different pair)

**Edge cases.** A bond with **both endpoints in the same line** is the most
powerful configuration in the game: it consumes one cell of each strand from
that line's budget, and since both endpoints share a pair, it also consumes two
of that pair's `n/2` slots. The generator deliberately includes some. A bond
whose endpoints are in the same line *and* adjacent is excluded by the distance
rule.

**Deduction contribution.** ≈4.5 `bond-complement` placements and ≈5.5
`bond-narrowing` eliminations per 6×6 solve. Ablation: removing bonds costs
≈5.1 given clues — and, more importantly, removes the only long-range deduction
in the system.

**Visual.** A graphite arc at ~35% opacity over the grid, plus a numeral badge
in the corner of both endpoint cells. The badge, not the arc, is the source of
truth on small screens and for assistive technology.

**Data.**

```jsonc
"bonds": [[3, 20], [8, 31]]   // sorted pairs of cell indices, sorted by first
```

---

## 3. Interactions between the rules

The rules are not independent, and the interactions are the game:

- **R1 × R3.** R1 says half a line is A–T. R3 says an A cannot sit beside an A.
  Together they force alternation patterns inside a run of same-pair cells:
  three consecutive A–T cells in a 6-wide line must read A T A or T A T.
- **R1 × R2.** R1 gives a pair `n/2` slots; R2 forces both of its bases into
  them. At `n = 6` this is the tightest interaction in the game — knowing two
  A's in a row means the row's third A/T cell is a T, with no other information.
- **R4 × R1.** A bond fixes both endpoints' pair. If the bond lies in one line,
  it spends two of that pair's slots at once.
- **R4 × R3.** A bond fixes a cell's base exactly; that base then propagates to
  four neighbours as an exclusion. This is the corner-to-corner chain: a
  counting deduction in one region, through a bond, becomes a local exclusion in
  another.

**No rule has an exception in any difficulty.** Easy, Medium and Hard differ
only in board size and how many clues are given.

---

## 4. Puzzle data model

```jsonc
{
  "id": "medium-07",              // positional and stable
  "difficulty": "medium",
  "size": 6,
  "clues": "..C.A..G............A..C..........T.",   // n² chars, '.' = empty
  "solution": "CTACGA...",                            // n² chars, no '.'
  "bonds": [[2, 17], [8, 31], [12, 33], [20, 29], [25, 34]],
  "meta": {
    "score": 139,
    "requiredTier": 2,
    "techniques": { "neighbour-exclusion": 40, "pair-saturation": 12, "...": 0 },
    "generator": { "seed": 20260801, "revision": 1 }
  }
}
```

- `clues` and `solution` are strings for compact, diffable, round-trippable
  storage — the same choice `lib/sudoku/puzzle-bank.json` makes.
- `solution` **is shipped**. It is needed for the "check mistakes" setting, and
  it is already derivable by anyone who wants it. Shipping it saves a solve on
  every page load. It is never sent to the share payload.
- `meta` is generator provenance: it drives archive labelling and difficulty
  regression tests, and is ignored by gameplay.

---

## 5. Candidate calculation

A cell's candidate set is a 4-bit mask. The rules map onto masks directly:

```ts
const ALL = 0b1111;
const PAIR_MASK = [0b0011, 0b1100];      // A|T , C|G
const COMPLEMENT_MASK: number[];          // precomputed, 16 entries
```

For an unsolved cell `i`, starting from `ALL`, remove:

1. every base held by an orthogonal neighbour *(R3)*;
2. every base whose count in either of `i`'s lines has reached `n/2 − 1` *(R2 upper bound)*;
3. all bases of a pair whose count in either line has reached `n/2` *(R1)*;
4. anything outside `COMPLEMENT_MASK[candidates(partner)]` when `i` is bonded *(R4)*.

A mask of one base is a placement. A mask of zero is a contradiction.

---

## 6. Deduction library

The hint engine and the difficulty model are both built from this library. It is
deliberately **two tiers**: across 128 generated puzzles spanning every tested
configuration, no puzzle required anything beyond tier 2
(see [prototype results](./onedna-generator-design.md#prototype-results)).

### Tier 1 — taught by the tutorial, needed by every puzzle

| Technique | Player-facing explanation | Prerequisites | Example | Cognitive load | Weight |
| --- | --- | --- | --- | --- | --- |
| `naked-single` | "Only one base can still go here." | none | A cell whose mask has collapsed to `{G}` | trivial | 1 |
| `neighbour-exclusion` | "The cell above is T, and identical bases never touch." | R3 | r2c3 is T ⟹ r3c3 ≠ T | trivial | 1 |
| `bond-complement` | "Bond 3 links this to r5c2, which is C. Bonded cells pair up, so this is G." | R4 | one endpoint solved | trivial | 1 |
| `pair-saturation` | "Row 4 already has its three C–G cells, so this one is A or T." | R1 | 3 of 3 C/G placed in a 6-line | low | 2 |
| `base-saturation` | "Column 2 has used both of its A's." | R1+R2 | 2 of max 2 A placed in a 6-line | low | 2 |

### Tier 2 — needed by Medium and Hard

| Technique | Player-facing explanation | Prerequisites | Example | Cognitive load | Weight |
| --- | --- | --- | --- | --- | --- |
| `pair-completion` | "Three cells left in column 5, and all three must be A–T." | R1 | open cells that can hold a pair = the pair's remaining budget | medium | 3 |
| `base-completion` | "Row 6 still owes a G, and this is the only cell that can hold one." | R2 | candidate cells for `b` = `b`'s remaining minimum | medium | 3 |
| `bond-narrowing` | "Its partner can only be A or C, so this can only be T or G." | R4 | two-way mask intersection, neither endpoint solved | medium | 4 |

`bond-narrowing` is the technique that makes bonds feel clever rather than
mechanical: it works before *either* endpoint is known, and it is the move that
most often unlocks a stalled Medium board.

### Tier 3 — implemented in the prototype, **not shipping**

`naked-subset` (generalised for multiplicity) and `spacing-squeeze` (a base
needing `r` non-touching homes in a line where only `r` independent positions
remain) were both built and measured. **Neither was ever required.** They are
documented here so the decision is not re-litigated, and so a future variant
with a looser rule set knows where to look.

### Chain depth

A *chain* is a maximal run of deductions where each one's supporting cells
include a cell placed by the previous one. Chain length is a difficulty input
(see [difficulty model](./onedna-generator-design.md#8-difficulty-model)), and is
the honest source of OneDNA's difficulty: Hard is not a harder technique, it is a
longer thread.

### The `Deduction` record

```ts
interface Deduction {
  technique: DeductionTechnique;
  /** Cells this deduction resolves or narrows. */
  targetCells: number[];
  /** Cells (and bonds) a player would point at to justify it. */
  supportingCells: number[];
  supportingBonds: number[];
  /** Present when the deduction places a value rather than only eliminating. */
  value?: Base;
  /** Bases removed from the targets, when it is an elimination. */
  eliminated?: Base[];
  line?: LineRef;
  explanation: string;
  difficultyWeight: number;
}
```

---

## 7. Puzzle validation

Development-time and CI checks, in order of cost. Anything failing is a hard
error, not a warning.

**Structural**

1. `size` is even and in `{4, 6, 8}`; `clues` and `solution` are `size²` chars.
2. `clues` uses only `A T C G .`; `solution` uses only `A T C G`.
3. Every non-`.` clue matches `solution` at the same index.
4. `id` is unique across the bank and prefixed with its difficulty.

**Bonds**

5. Every endpoint is an integer in `[0, size²)`; `u ≠ v`.
6. No cell appears in two bonds.
7. Manhattan distance ≥ 2.
8. At most 8 bonds.
9. Each bond's two solution values are complementary.

**Rules**

10. `solution` satisfies R1, R2 and R3.
11. `clues` violate no rule (a partial board cannot satisfy R1/R2, but it must
    not *break* them: no pair over budget, no base over its maximum, no touching
    twins, no bond contradiction).

**Solvability** *(expensive; run in the generator and in tests, not at import)*

12. An independent brute-force search finds **exactly one** solution.
13. The human-style solver reaches that solution using tier ≤ 2 only.
14. The recorded `meta.requiredTier` matches the cheapest tier that succeeds.
15. `meta.score` recomputes to the stored value.

---

## 8. Worked puzzles

All four below were produced and verified by
`scripts/prototypes/onedna-feasibility.mjs` (seed `20260801`). For each, the
brute-force verifier confirmed exactly one solution **and** the human-technique
solver reached it with no guessing. Reproduce with:

```bash
node scripts/prototypes/onedna-feasibility.mjs 20260801 0 --teach
```

Notation: `·` is empty; a trailing letter is the bond id shared by both endpoints.

### 8.1 Tutorial — 4×4, 3 clues, 2 bonds

```
givens                     solution
·  ·a ·  G                 A  Ta C  G
Gb ·  ·  ·b                Gb A  T  Cb
·  ·  A  ·                 C  G  A  T
·  ·  ·  ·a                T  C  G  Aa

bonds:  a  r1c2 ↔ r4c4        b  r2c1 ↔ r2c4
```

At `n = 4`, R1 and R2 force one of each base per line, so every line is a
permutation and any valid board satisfies R3 automatically. A player who has
just met the no-twins rule cannot fail this board by forgetting it — which is
why it is the tutorial's final beat rather than where the rule is taught.

Intended path (first six placements, machine-verified):

| # | Cell | Value | Because |
| --- | --- | --- | --- |
| 1 | r2c4 | C | bond **b** partner r2c1 is G |
| 2 | r2c3 | T | row 2's C–G half is full, and the neighbour is C |
| 3 | r2c2 | A | row 2 has used its T; C–G half full |
| 4 | r1c3 | C | column 3's A–T half is full; neighbour above is G |
| 5 | r4c3 | G | column 3 has used its C; A–T half full |
| 6 | r3c4 | T | column 4's C–G half is full; neighbour is G |

Techniques used: `bond-complement`, `pair-saturation`, `base-saturation`,
`neighbour-exclusion`, `naked-single`. **Tier 1 only. No guessing.**

### 8.2 Easy — 6×6, 18 clues, 5 bonds

```
givens                              solution
C  T  ·c A  ·  G                    C  T  Cc A  T  G
A  ·e ·  Gb ·  ·                    A  Ge A  Gb C  T
·d A  Ta ·d ·  ·a                   Gd A  Ta Cd G  Aa
·  T  A  ·  ·  Gc                   C  T  A  T  C  Gc
·  ·  ·  C  T  A                    A  C  G  C  T  A
T  G  ·e T  A  ·b                   T  G  Ce T  A  Cb

bonds:  a r3c3↔r3c6   b r2c4↔r6c6   c r1c3↔r4c6   d r3c1↔r3c4   e r2c2↔r6c3
```

Intended path (first six placements):

| # | Cell | Value | Because |
| --- | --- | --- | --- |
| 1 | r3c6 | A | bond **a** partner r3c3 is T |
| 2 | r6c6 | C | bond **b** partner r2c4 is G |
| 3 | r1c3 | C | bond **c** partner r4c6 is G |
| 4 | r1c5 | T | row 1's C–G half is full; neighbour r1c4 is A |
| 5 | r3c4 | C | bond **d** partner r3c1 plus row 3's A–T half being full |
| 6 | r6c3 | C | row 6's A–T half is full; neighbours exclude G |

**Why it is Easy:** half the board is given, three of the first three moves are
single-step bond reads, and the whole solve stays in tier 1 (22 of 24 sampled
Easy puzzles need nothing above tier 1). Bonds **a**, **b** and **c** each have
one endpoint already given, so they resolve immediately — the generator seeds
this deliberately.

Note bond **d**: both endpoints are in row 3. That is the same-line
configuration described in §2/R4 — it spends two of row 3's C–G slots at once.

### 8.3 Medium — 6×6, 9 clues, 5 bonds

```
givens                              solution
A  ·a ·  ·  ·  A                    A  Ca T  C  G  A
·b ·  G  A  ·d ·                    Tb A  G  A  Cd G
·e ·d ·  Ge ·  ·                    Ce Gd A  Ge A  T
·  ·  G  Ac ·  ·                    G  C  G  Ac T  A
·  ·c C  ·  ·  ·                    C  Tc C  T  A  G
·  ·b ·  ·  ·a C                    T  Ab T  C  Ga C

bonds:  a r1c2↔r6c5   b r2c1↔r6c2   c r4c4↔r5c2   d r2c5↔r3c2   e r3c1↔r3c4
```

Intended path (first seven placements):

| # | Cell | Value | Because |
| --- | --- | --- | --- |
| 1 | r5c2 | T | bond **c** partner r4c4 is A |
| 2 | r3c1 | C | bond **e** partner r3c4 is G |
| 3 | r1c3 | T | row 1 has used both its A's; C–G half full; neighbour excludes |
| 4 | r1c2 | C | **bond narrowing** — partner r6c5 is limited to A or G, so r1c2 is T or C; the neighbour r1c1 is A, and r1c3 is T |
| 5 | r6c5 | G | bond **a**, now that r1c2 is C |
| 6 | r3c2 | G | bond **d** narrowing, plus row 3 still owing a G |
| 7 | r2c5 | C | bond **d** complement |

**Why it is Medium:** only 9 of 36 cells are given, no bond has a given endpoint,
and step 4 requires `bond-narrowing` — a tier-2 technique that reasons about two
*unsolved* cells at once. 23 of 24 sampled Medium puzzles need tier 2.

### 8.4 Hard — 8×8 concept

Same four rules, 64 cells, ~22 given, 7 bonds, ~42 cells to fill. Sampled Hard
puzzles score 219 on the [difficulty model](./onedna-generator-design.md#8-difficulty-model)
against Medium's 139, and **all 24 sampled required tier 2**.

Hard's difficulty is honestly characterised: it is not a harder technique, it is
a longer chain over a larger board, with fewer given anchors and bonds spanning
greater distances. A full 8×8 worked example is omitted here because it is 42
rows of table; the generator emits `meta.techniques` and the solve path for
every shipped puzzle, and the regression test asserts the tier distribution.

---

## 9. Conflict model

```ts
type ConflictReason =
  | "pair-over-budget"    // R1
  | "base-over-budget"    // R2's implied maximum
  | "twins-touching"      // R3
  | "bond-mismatch";      // R4
```

- A cell may carry several reasons at once.
- **One player action is at most one mistake**, no matter how many rules it
  breaks. Mistake counting compares against `solution`; conflict marking
  compares against the current board. They are separate systems and the
  completion panel reports only mistakes.
- A `bond-mismatch` marks **both endpoints and the bond arc**, and names the
  bond in the accessibility label — the same "identify the group, don't shout"
  policy the Sudoku colored-group conflict uses.
- Conflicts are never blocking. The player can leave a broken board and keep
  working.
