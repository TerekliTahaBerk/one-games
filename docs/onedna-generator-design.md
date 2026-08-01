# OneDna — generator, solver and difficulty design

Status: **implemented.** `npm run generate:dna` deterministically creates the
shipped 400-puzzle bank per difficulty; `npm run validate:dna` independently
checks structure, rules, uniqueness, logical solvability, metadata, and duplicates.

Status: **design phase.** A working prototype of everything below exists at
`scripts/prototypes/onedna-feasibility.mjs` and its measured results are in §9.
The production version is a TypeScript port, not a copy.

Companion: [game design](./onedna-game-design.md) · [rules](./onedna-rule-specification.md) · [technical plan](./onedna-technical-plan.md) · [roadmap](./onedna-roadmap.md)

---

## 1. Four programs, not one

The single most important architectural decision here is that these are
**separate, independently testable components with different jobs**. Conflating
them is how puzzle generators end up rating difficulty by recursion depth.

| Component                           | Question it answers                                         | Technique                                                                     | Must not                               |
| ----------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| **Verifier** `countSolutions`       | "How many solutions does this have — 0, 1, or more than 1?" | MRV backtracking with forward checking                                        | know anything about human techniques   |
| **Logical solver** `solveLogically` | "Can a person crack this with no guessing, and how?"        | cheapest-technique-first constraint propagation, emitting `Deduction` records | ever branch or guess                   |
| **Difficulty evaluator** `rate`     | "How hard is this for a person?"                            | weighted sum over the solver's recorded path                                  | look at the verifier                   |
| **Generator** `generate`            | "Produce a puzzle matching this spec."                      | solution synthesis → bond placement → clue removal                            | accept a puzzle the other three reject |

The verifier and the logical solver are deliberately written from different
primitives so that a bug in one cannot hide behind the other. Every generated
puzzle is checked by **both**: the logical solver must reach the intended
solution, and the verifier must independently agree that no second solution
exists. In the prototype this cross-check passed 300/300.

---

## 2. Stage 1 — solution synthesis

Randomised row-by-row backtracking with live budget tracking.

```
for each row r:
  for each column c, in order:
    for each base b in shuffle(A T C G):
      reject if row r already holds n/2−1 of b            (R2 upper bound)
      reject if column c already holds n/2−1 of b
      reject if row r's pair(b) budget is full            (R1)
      reject if column c's pair(b) budget is full
      reject if the cell left of, or above, (r,c) holds b (R3)
      place, recurse
  on completing a row, reject if any base is missing from it (R2 lower bound)
on completing the grid, reject if any column is missing a base
```

Notes:

- Row minima are checked at end-of-row; column minima at end-of-grid. Checking
  column minima earlier would need a look-ahead that costs more than the rare
  restart it saves. Measured: 0 generation failures in 300 attempts at 6×6.
- A step budget (600 000 placements) guards against pathological seeds; on
  exhaustion the caller retries with the next seed rather than hanging.
- **Not used:** exact cover / Dancing Links, or a SAT/SMT encoding. Both are
  correct and both are overkill — the constraint graph here is sparse and the
  naive search finds a grid in well under a millisecond. Revisit only if a
  future mechanic makes synthesis a bottleneck.
- **Not used:** generating one grid and permuting it (row/column swaps, base
  relabelling). Those symmetries preserve R1 and R2 but **break R3**, so every
  permuted grid needs a full re-check — cheaper to just generate again.

---

## 3. Stage 2 — bond placement

Bonds are chosen _after_ the solution exists, so they can never make it
unsatisfiable.

```
mark all cells unused
for each cell i in shuffle(all cells):
  stop when enough bonds
  skip if i is used
  candidates = { j : j unused, solution[j] = complement(solution[i]),
                     manhattan(i, j) ≥ 2 }
  skip if empty
  pick j at random, mark both used, emit bond (min, max)
```

This guarantees the §2/R4 invariants by construction: disjointness (the `used`
set), complementarity (the filter), and distance. The count is the difficulty
spec's `bonds` parameter.

**Bond quality**, applied as a re-roll rather than a hard filter, because
over-constraining bond choice starves the search:

- Prefer at least one bond with both endpoints in the same line — the strongest
  configuration in the game (see [rules §2/R4](./onedna-rule-specification.md#r4--bonds-complement-per-puzzle)).
- Prefer a spread of distances; reject a bond set whose mean Manhattan distance
  is under 3 at 6×6.
- Penalise arc crossings beyond two, measured as segment intersections between
  endpoint midpoints.
- Reject a bond set where more than half the bonds share a row band, which reads
  as visual clutter.

---

## 4. Stage 3 — clue removal

Removal is driven by the **logical solver**, not the verifier. This is what
makes "no guessing" a property of the pipeline rather than a hope.

```
givens = solution
for each cell i in shuffle(all cells):
  stop if remaining givens ≤ floor           (difficulty's clue floor)
  tentatively clear givens[i]
  run the logical solver at the difficulty's max tier
  keep the removal only if the solver
     (a) fully solves, and
     (b) lands on exactly the solution we carved from
  otherwise restore givens[i]
```

Condition (b) is not redundant. If the logical solver ever performs an unsound
elimination, it could "solve" to a different grid; asserting equality turns a
silent correctness bug into a generation failure. It costs one array comparison.

Because a full logic-only solve implies a unique solution, uniqueness is a
_consequence_ of this loop, not a separate constraint — but it is still verified
independently in stage 5.

**The `floor` parameter is the difficulty dial that matters.** Removing to
exhaustion produces the hardest puzzle the rule set allows; stopping early
produces an easier one with the same rules and the same techniques. Board size
is the session-length dial; the floor is the difficulty dial. They are
independent and both are needed.

---

## 5. Stage 4 — the logical solver

A fixpoint loop over tiers, always falling back to the cheapest technique that
still makes progress:

```
loop:
  for tier in 1..maxTier:
    if tier makes any progress:
      restart the loop from tier 1
  if no tier made progress: stop
```

Restarting from tier 1 after every success is what makes the recorded path
resemble a human solve. A solver that greedily used its most powerful technique
would rate every puzzle as hard.

**Tier 1** — `neighbour-exclusion`, `bond-complement`, `pair-saturation`,
`base-saturation`, and the implicit `naked-single` promotion when a mask
collapses.
**Tier 2** — `pair-completion`, `base-completion`, `bond-narrowing`.
**Tier 3** — not implemented in production. See §9.4.

State is four typed arrays plus incremental per-line counters
(`base[line][b]`, `pair[line][p]`), updated at the moment a mask collapses. The
first prototype recomputed counts inside every technique and was ~200× slower;
incremental counters took it from unusable to 1 400 puzzles/second.

A contradiction (any mask reaching zero) aborts immediately — used both to
reject bad carves and, in the UI, to detect an unwinnable player board.

---

## 6. Stage 5 — independent verification

```
countSolutions(clues, bonds, limit = 2)
```

MRV cell selection, forward checking on R1/R2/R3/R4, plus one global feasibility
test: no line may still owe more base minima than it has empty cells. Returns as
soon as `limit` solutions are found, so proving non-uniqueness is cheap and
proving uniqueness costs a full exhaust — acceptable at generation time,
never run at page load.

**This is not used in the app.** It is a generator and CI oracle only.

---

## 7. Aesthetic filter

A logically perfect puzzle can still look bad. Reject and re-roll when:

- Any row or any column has zero clues **and** carries no bond endpoint — that
  band reads as untouched.
- Clues cluster: split the board into quadrants; reject if any quadrant holds
  more than 45% or fewer than 8% of the clues.
- The clue layout is accidentally symmetric (rotational or mirror) unless the
  spec asked for it. Sudoku convention likes symmetry; OneDna's identity is the
  organic bond tangle, and an accidentally symmetric clue set fights it.
- More than two bond arcs cross.
- Two bonds are visually parallel and adjacent (same delta, endpoints within one
  cell) — reads as a rendering artefact.
- The same base is given more than 40% of the time across all clues, which makes
  the opening read as monotone.

---

## 8. Difficulty model

Difficulty is computed from **what a person has to do**, never from search
depth. Inputs, in descending order of influence:

| Input                                | Symbol | Source                                          |
| ------------------------------------ | ------ | ----------------------------------------------- |
| Weighted technique usage             | `W`    | `Σ weight(t) × uses(t)` over the solver path    |
| Cells the player must fill           | `E`    | `n² − givens`                                   |
| Longest deduction chain              | `L`    | maximal run of dependent deductions             |
| Highest tier actually required       | `T`    | cheapest tier that fully solves                 |
| Mean open candidates at the midpoint | `C`    | solver snapshot at 50% filled                   |
| Bond count                           | `B`    | fewer bonds ⇒ fewer long-range anchors ⇒ harder |
| Board size                           | `n`    | already inside `E`, not double-counted          |

```
score = W
      + 0.6 × E
      + 1.2 × L
      + 15  × (T − 1)
      + 8   × max(0, C − 1.5)
      − 1.5 × B
```

Measured bands (seed `20260801`, 24 samples per tier):

| Tier       | Board | Clue floor | Bonds | Max tier | Score band | Cells to fill | Target time |
| ---------- | ----- | ---------- | ----- | -------- | ---------- | ------------- | ----------- |
| Tutorial   | 4×4   | 0          | 2     | 1        | 60 – 85    | ~12           | under 1 min |
| Easy       | 6×6   | 18         | 5     | 2        | 75 – 105   | ~18           | 2 – 3 min   |
| Medium     | 6×6   | 0          | 5     | 2        | 120 – 160  | ~25           | 4 – 6 min   |
| Hard       | 8×8   | 0          | 7     | 2        | 195 – 245  | ~42           | 7 – 10 min  |
| Weekly Lab | 10×10 | 0          | 9     | 2        | 300 – 380  | ~64           | 12 – 20 min |

The bands do not overlap, which is the property that matters: a generated
puzzle either lands in its tier's band or is rejected and re-rolled.

**Solve times are estimates, not measurements.** They are extrapolated from
cells-to-fill against comparable games (Tango ≈ 28 fills ≈ 1–3 min; Sudoku easy
≈ 40 fills ≈ 5–8 min). They must be recalibrated from real telemetry after
launch — the `par` values in the [Logic Score formula](./onedna-game-design.md#81-is-a-score-worth-having)
depend on them, and a mis-set par is visible to every player. **Ship with
per-difficulty completion-time logging from day one**, even if nothing consumes
it yet.

---

## 9. Prototype results

Command:

```bash
node scripts/prototypes/onedna-feasibility.mjs 20260801 24
node scripts/prototypes/onedna-feasibility.mjs 20260801 0 --soak
node scripts/prototypes/onedna-feasibility.mjs 20260801 0 --teach
```

### 9.1 Does each rule earn its place?

6×6, 24 samples per configuration. **Every configuration produced 24/24 puzzles
that were both uniquely solvable and solvable by logic alone**, so the
comparison is on clue economy — how much the rule _knows_, expressed as how many
given letters it replaces.

| Configuration              | Clues needed | Cost of dropping the rule |
| -------------------------- | ------------ | ------------------------- |
| All four rules, 6 bonds    | **8.8**      | —                         |
| … with 3 bonds             | 12.5         | +3.7                      |
| … with 0 bonds             | 13.9         | **+5.1 (R4)**             |
| … without "no twins"       | 14.0         | **+5.2 (R3)**             |
| … without "all four bases" | 11.6         | **+2.8 (R2)**             |

Every rule pays for itself. R3 and R4 are each worth roughly five given letters,
which is why the board can show only nine clues at Medium and still be fair.

### 9.2 Does the difficulty ladder separate?

| Configuration             | Gen   | Unique + logic-only | Clues | Fills | Score | ms  | Required tier (1/2/3) |
| ------------------------- | ----- | ------------------- | ----- | ----- | ----- | --- | --------------------- |
| Tutorial 4×4, 2 bonds     | 24/24 | **24/24**           | 3.5   | 12    | 73    | <1  | 24 / 0 / 0            |
| Easy 6×6, floor 18        | 24/24 | **24/24**           | 18.0  | 18    | 86    | <1  | 22 / 2 / 0            |
| Medium 6×6                | 24/24 | **24/24**           | 10.5  | 25    | 139   | 1   | 1 / 23 / 0            |
| Hard 8×8, 7 bonds         | 24/24 | **24/24**           | 22.4  | 42    | 219   | 2   | 0 / 24 / 0            |
| Weekly Lab 10×10, 9 bonds | 8/8   | **8/8**             | 36.3  | 64    | 335   | 6   | 0 / 8 / 0             |

Scores separate cleanly (73 / 86 / 139 / 219 / 335) and the required-tier
distribution moves the way it should: Tutorial and Easy are tier 1, Medium and
Hard are tier 2.

### 9.3 Is generation reliable at scale?

300 puzzles, 6×6 Medium configuration:

```
logic-only solvable   300/300
exactly one solution  300/300
distinct puzzles      300/300
clues                 mean 10.0, range 6–14
throughput            1442 puzzles/second
```

A 400-puzzle bank — over a year of daily play per difficulty — takes under a
second to generate and can be regenerated from a seed at any time.

### 9.4 The finding that changed the design

**Tier 3 was never required. Not once, in 128 puzzles, across every
configuration tested.** `naked-subset` and `spacing-squeeze` were fully
implemented and measured; they fire occasionally as _available_ moves but never
as _necessary_ ones, because tier 1 and 2 are strong enough to finish first.

Consequences, all acted on:

1. **The production solver ships two tiers.** Tier-3 machinery would be
   maintained, tested and never exercised.
2. **The hint engine only needs eight techniques.**
3. **Difficulty comes from chain length and board size, not technique exotica.**
   This is stated plainly in the [game design](./onedna-game-design.md#7-phase-12--the-hint-engine)
   rather than papered over, because it sets the ceiling on how deep OneDna can
   go without a new mechanic — which is precisely the argument for shipping
   repeat bonds in phase 2.

### 9.5 The finding that killed the first design

The initial system was 8×8 with _exact_ per-base counts (two A, two T, two C,
two G in every line). It generated perfectly — 24/24 unique and logic-only — but
needed only **12.3 clues, leaving 52 cells to fill**, almost all through tier-1
moves. That is the worst combination a puzzle can have: long and obvious. It was
replaced by the 6×6 "half-and-half, all four present" rule, which lands at 25
fills.

The lesson is recorded because it is easy to repeat: **a tighter constraint set
does not make a harder puzzle. It makes a longer one.**

---

## 10. Serialization and tooling

```
lib/dna/puzzle-bank.json              the shipped bank, imported with { type: "json" }
scripts/lib/dna-rules.mjs             plain-Node rules mirror for build tooling
scripts/generate-dna-puzzles.mjs      writes the bank
scripts/validate-dna-puzzles.mjs      checks the bank from the command line
```

Package scripts:

```jsonc
"generate:dna": "node scripts/generate-dna-puzzles.mjs",
"validate:dna": "node scripts/validate-dna-puzzles.mjs"
```

This mirrors the arrangement that already works for Sudoku, including the
deliberate duplication of rule logic into a `.mjs` mirror so the tooling runs on
plain Node with no loader. The TypeScript engine stays the authority: the vitest
suite re-validates the entire shipped bank with the real
`lib/dna/solver.ts`, so a drifting mirror fails CI rather than shipping.

Generator CLI:

```bash
node scripts/generate-dna-puzzles.mjs                    # regenerate everything
node scripts/generate-dna-puzzles.mjs --seed 20260901    # deterministic re-roll
node scripts/generate-dna-puzzles.mjs --only medium      # one difficulty
node scripts/generate-dna-puzzles.mjs --count 60         # bank size per difficulty
```

**Failure and retry.** Each puzzle attempt is independent and seeded from
`hash(seed, difficulty, index)`. On rejection — synthesis budget exhausted,
aesthetic filter, score outside the band, verifier disagreement — the attempt is
discarded and the index retried with a bumped nonce, up to 200 attempts, after
which the generator exits non-zero rather than shipping a short bank. Rejection
reasons are counted and printed, so a filter that is silently rejecting 90% of
candidates is visible immediately.

**Determinism** is a tested property, not an assumption: the same seed must
produce a byte-identical bank. That is one test and it catches accidental
`Math.random()`, `Date.now()` and `Set` iteration-order dependence.

### Daily selection

Unchanged from the pattern that already works:

```ts
const bank = BANK[difficulty];
const puzzle = bank[hashDate(`${date}-${difficulty}`) % bank.length];
```

Positional ids (`easy-01`, `medium-07`) keep saves matchable across a bank
regeneration; a regenerated bank changes which puzzle a date resolves to, which
is exactly why the save schema stores `puzzleId` and discards a save that no
longer matches.
