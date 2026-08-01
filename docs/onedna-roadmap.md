# OneDna — roadmap, risks and recommendation

Status: **launch scope implemented in the repository.** Deferred mechanics in
this document remain roadmap items and are not exposed by the MVP.

Status: **design phase.** This document ends with a go/no-go.

Companion: [game design](./onedna-game-design.md) · [rules](./onedna-rule-specification.md) · [generator](./onedna-generator-design.md) · [technical plan](./onedna-technical-plan.md)

---

## 1. MVP scope

**In:**

- `/dna` and `/dna/archive`, behind the existing access gate.
- Three daily difficulties: Easy 6×6, Medium 6×6, Hard 8×8 — deterministic from
  the date, from a pre-generated bank of **400 puzzles per difficulty** — over a year
  before a repeat, and under a second to regenerate.
- The four rules. No variants, no exceptions.
- Board, bond arcs and badges, base pad, cycle-on-tap, notes, undo, redo, erase,
  pause, timer, mistake counting.
- Three-level hint engine driven by the logical solver.
- Four-rule legend strip plus the seven-beat tutorial, shown once.
- Local persistence with `puzzleId` matching, the shared `OneGamesStats` v2
  migration, streaks, and the archive.
- Completion panel with the itemised Logic Score and the spoiler-free share.
- Accessibility parity with OneSudoku plus the bond list and bond-aware labels.
- Generator, validator, `generate:dna` / `validate:dna` scripts, full test suite.
- **Per-difficulty completion-time logging**, even with no consumer, so the
  `par` values can be calibrated from real data rather than my estimates.

**Explicitly out of the MVP:**

- Weekly Lab, and every board size other than 6×6 and 8×8.
- Repeat bonds or any second bond type.
- Mutation cells, enzyme cells, PCR regions, restriction sites, unique-row rules.
- Tier-3 solving techniques — measured as never required.
- Any leaderboard, season, unlockable, XP, badge or reward loop.
- Speed challenge.
- A cross-game "play all today's games" hub.
- Server-side anything. OneDna ships entirely on `localStorage`.

The MVP is deliberately one game done completely, not a platform.

---

## 2. Phases

### Launch — the daily game

Everything in §1. Success is measured on: day-7 return rate, Hard completion
rate, median solve time per difficulty against the estimated par, and hint usage
distribution.

### Phase 2 — depth, after the core proves out

1. **Repeat bonds.** A doubled-stroke bond meaning "these two cells hold the
   same base". Reuses the entire bond data model, renderer, badge system and
   accessibility layer; adds one tutorial beat and two techniques
   (`repeat-propagation`, `repeat-narrowing`). This is the answer to the tier-2
   ceiling and is the single highest-value follow-up.
2. **Weekly Lab.** One 10×10 per week, released Monday, with its own archive
   row and a longer par. Verified generatable (8/8, 6ms, score band 300–380).
3. **Genome Archive polish.** The archive currently lists dates; give it the
   lab-report framing the theme earns — per-day score, streak ribbon, and a
   quiet "unsequenced" state.

### Phase 3 — themed content

4. **Exact regions.** Irregular regions with an _exact_ composition ("this
   region holds one of each base"), which is crisp where the rejected PCR
   inequality was mushy. Needs new iconography and a region renderer.
5. **Seasonal sample sets** — a named bank with a distinct bond aesthetic
   (denser, sparser, more same-line bonds). Content, not mechanics. Low risk,
   high perceived novelty.

### Experimental — needs validation before any commitment

6. **Speed Challenge.** Conflicts with the calm identity; a timer that punishes
   is the opposite of "take your time". Only worth prototyping as an opt-in
   side mode, never as the default surface.
7. **Global leaderboard. Recommendation: do not build it.** It requires
   accounts tied to scores, server-side storage the product does not have, a
   moderation surface, anti-cheat for a client-side game whose solution ships in
   the bundle (making scores trivially forgeable), plus privacy and retention
   policy. The cost is a backend; the benefit is a feature that contradicts
   "no feed to check". A personal streak and personal bests already provide the
   retention a daily puzzle needs. If competition is ever wanted, a
   friends-only, opt-in, weekly digest is the version worth designing — and it
   still needs the accounts that do not exist.
8. **Virus / ancient / alien genome themes.** Pure reskin unless they carry a
   mechanic. Reskins are cheap and dilute a calm identity fast. Park them.

---

## 3. Risks

| #   | Risk                                                                                                                                                | Severity | How to test it _before_ full implementation                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Depth ceiling.** Tier 3 is never required, so Hard is a longer chain, not a cleverer one. Strong solvers may find the game shallow after a month. | High     | Playtest with 5 experienced puzzle solvers on 3 Hard boards each. Ask specifically: "did anything surprise you after board 2?" If not, pull repeat bonds forward from phase 2 into launch.            |
| 2   | **Bond legibility on a 320px screen.** Eight arcs over a 6×6 grid may read as clutter, and the whole identity rests on them.                        | High     | Build a static HTML board with the worst realistic bond set (8 bonds, 2 crossings) at 320/375/414px before writing any React. Test grayscaled. If it fails, cap bonds at 5 and lean harder on badges. |
| 3   | **Session length at Hard.** ~42 fills at 8×8 may run past 10 minutes and past a daily player's patience.                                            | Medium   | Time 5 internal solvers on generated Hard boards. If the median exceeds 11 minutes, move Hard to 6×6 with a lower clue floor and reserve 8×8 for the Lab.                                             |
| 4   | **"This is just Sudoku."** R1+R2 read as a composition rule, and the first impression may be "four-letter Sudoku".                                  | Medium   | Show the four-rule card plus a screenshot to 10 people who have not seen it. Ask what it reminds them of. If Sudoku dominates, lead the marketing and the tutorial with **bonds**, not with balance.  |
| 5   | **Tap cost.** 25 fills × (select + choose) ≈ 50 taps at Medium.                                                                                     | Medium   | Instrument the prototype board with a tap counter; compare cycle-on-tap against pad entry for the same solve. Cycling should cut it to ~30.                                                           |
| 6   | **Stats migration breaking Sudoku streaks.** The `OneGamesStats` v2 migration touches live player data.                                             | Medium   | Unit-test with a real captured v1 payload; verify idempotency; ship the migration in its own commit _ahead_ of OneDna so a rollback does not need to unpick two things.                               |
| 7   | **Bank exhaustion / repetition.** A short bank repeats within weeks.                                                                                | Low      | Generation runs at ~1 400/second, so 400 per difficulty is free; add a CI check asserting the bank covers at least 12 months of daily selection from the current date.                                |
| 8   | **Par calibration.** The Logic Score's `par` values are estimates, and a wrong par makes every score feel unfair.                                   | Low      | Ship time logging on day one; recalibrate at 2 weeks. Until then, cap the time penalty at 20 points so a bad par cannot dominate a score.                                                             |
| 9   | **`GameFamily` slot.** Adding OneDna changes the advertised lineup.                                                                                 | Low      | Product decision, not technical. See §4.                                                                                                                                                              |

---

## 4. Open product questions

These need a human decision before implementation starts:

1. **Does OneDna replace one of OneWord / OneMatch / OneNumbers on the homepage,
   or become a fifth mark?** The family grid is currently a 4-up. A fifth
   changes the layout; a replacement changes a public promise.
2. **Is OneDna included in the existing $1 membership at launch?** The pricing
   copy already says "every game included", so the default answer is yes — worth
   confirming it is intentional.
3. **Route name.** `/dna` is short and clean. `/onedna` matches the product
   name. `/sudoku` set the precedent for the short form, so `/dna` unless there
   is a marketing reason.

---

## 5. Answers to the thirteen questions

**1. What is the exact launch version?**
A 6×6 four-base logic grid, three daily difficulties (Easy 6×6, Medium 6×6,
Hard 8×8), four rules, up to 8 long-range bonds per board, a three-level
explanatory hint engine, local persistence and archive, a shared OneGames
streak, and a transparent Logic Score. No variants, no exceptions, no server.

**2. Final core rules.**
R1 Balance — every row and column is half A–T, half C–G.
R2 All four — every row and column uses all four bases.
R3 No twins — identical bases never touch orthogonally.
R4 Bonds — linked cells always pair: A–T, C–G.

**3. What was removed, and why?**
Mutation cells (exception-based rules destroy hint clarity and logical
certainty); enzyme cells (at-least-one constraints over overlapping
neighbourhoods are weak deductions with high memory cost); PCR regions
(inequalities over irregular regions give soft eliminations and heavy visuals);
restriction sites (a six-long forbidden motif is a trap, not a tool, and
overlaps R3); unique rows and columns (almost never fires with four symbols at
6 wide — a tutorial line that buys nothing); `#A=#T`/`#C=#G` balance (replaced —
it permits pair-starved lines and gives mushy deductions); no-triples (replaced
by the strictly stronger and simpler no-touching); and the 8×8 exact-count
system that was the _first_ version of this design — measured at 52 forced-but-obvious
fills and cut for being long rather than hard.

**4. What makes it different from existing binary-grid puzzles?**
Bonds. Every other rule in the genre is _local_ (adjacency) or _linear_
(row/column counting). A bond is the only constraint in a puzzle of this class
that carries a deduction across the board — a counting insight in the top-left
resolves a cell in the bottom-right, which then propagates locally through
adjacency. Combined with a four-symbol alphabet that decomposes into pair and
strand, the strategic texture is genuinely unlike Binairo, Takuzu, Tango or
Queens. Ablation confirms bonds are load-bearing, not decorative: removing them
costs ≈5 given clues out of ≈9.

**5. Can it reliably generate unique, logic-only puzzles?**
Yes, verified. 300/300 puzzles uniquely solvable and solvable by logic alone,
300/300 distinct, at ~1 440 puzzles/second, with two independent oracles (a
human-technique solver and a brute-force verifier) agreeing on every one.

**6. Main human deduction techniques.**
Tier 1: neighbour exclusion, bond complement, pair saturation, base saturation,
naked single. Tier 2: pair completion, base completion, bond narrowing. Eight
total. Tier 3 was implemented and measured as never required, and is cut.

**7. How is difficulty measured?**
A weighted sum over the _human_ solve path — technique weights, cells to fill,
longest dependent chain, highest tier required, mid-solve candidate breadth,
minus a bond credit. Never brute-force recursion depth. Bands: Tutorial 60–85,
Easy 75–105, Medium 120–160, Hard 195–245, Lab 300–380, non-overlapping.

**8. Ideal board size per difficulty.**
Tutorial 4×4 (where the rules make the board a Latin square and the no-twins
rule is automatically satisfied — free pedagogy). Easy and Medium 6×6. Hard 8×8.
Weekly Lab 10×10, post-launch. 12×12 generates fine but is not worth the mobile
cost.

**9. Which advanced mechanic should appear first after launch?**
Repeat bonds — a doubled-stroke bond meaning "same base". It reuses the entire
bond system, adds one tutorial beat, introduces two genuinely new techniques,
and is the direct answer to the tier-2 depth ceiling.

**10. What should the first playable MVP include?**
Section 1 above.

**11. What should explicitly not be included?**
Section 1's exclusion list — most importantly no second bond type, no regions,
no tier-3 machinery, and no leaderboard.

**12. Biggest product and technical risks.**
Product: the depth ceiling (risk 1) and the "this is just Sudoku" first
impression (risk 4). Technical: bond legibility at 320px (risk 2) and the shared
stats migration touching live Sudoku data (risk 6).

**13. How should those risks be tested before full implementation?**
In order: (a) build the static worst-case bond board at three widths, in
grayscale, before any React — one afternoon, kills or confirms the whole visual
identity; (b) playtest 3 Hard boards with 5 experienced solvers, timed, and ask
whether anything surprised them; (c) show the four-rule card to 10 fresh people
and record what it reminds them of; (d) write the stats migration with its real
v1 payload test and ship it in its own commit first.

---

## 6. Recommendation

**Go**, with two conditions.

The design is validated where it matters: the rule set is four one-line rules
with no exceptions, every one of them measurably earns its place, generation is
reliable at 100% across 300 samples with two independent verifiers agreeing, the
difficulty bands separate cleanly, and the whole thing sits inside the existing
OneGames shell without new infrastructure. The first version of this design was
cut on its own evidence, which is the strongest signal that the second version
is sound.

The two conditions:

1. **Run the bond legibility test before writing production UI.** The entire
   identity — and the difference from Binairo — rests on arcs being readable on a
   phone. It is one afternoon of static HTML, and it is the only risk that could
   force a rule change rather than a tuning change.
2. **Accept the depth ceiling honestly, and plan repeat bonds as a
   near-term follow-up rather than a someday.** OneDna at launch is a
   Tango-class game: quick to learn, pleasant daily, deep enough for months, not
   deep enough for years. That is a good product. It stops being one if
   the roadmap pretends otherwise.

**Exact next engineering task:** implement `lib/dna/types.ts`, `lib/dna/rules.ts`
and `lib/dna/solver.ts` — the pure rule engine, the two-tier logical solver
emitting `Deduction` records, and the independent brute-force verifier — together
with `tests/dna-rules.test.ts` and `tests/dna-solver.test.ts` seeded from the
four worked puzzles in the [rule specification](./onedna-rule-specification.md#8-worked-puzzles).
No React, no CSS, no puzzle bank. Everything else in the MVP depends on this
module and nothing in it depends on anything else, so it can be built and proven
in isolation.
