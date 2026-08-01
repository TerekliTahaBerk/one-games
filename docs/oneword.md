# OneWord production notes

OneWord is OneGames’ single daily five-letter English word puzzle. A player has
six valid guesses. It shares the OneGames shell and access entitlement but has
its own mark, dusty-plum palette, storage namespace, statistics, schedule, and
archive.

## Rules and evaluation

`lib/word/evaluate.ts` uses the standard duplicate-safe two-pass algorithm:
exact-position letters are consumed first, then remaining answer-letter counts
are used for present letters. Keyboard evidence only upgrades (`absent` →
`present` → `correct`). Feedback never relies on color alone: correct uses an
underline, present a diamond, and absent a diagonal stroke.

The game accepts physical and on-screen keyboard input. Enter submits, Delete
and Backspace remove a letter. Input is locked during reveal and after a terminal
state, so rapid Enter presses cannot record duplicate guesses or completions.

## Daily schedule and time zone

Daily rollover uses the named `Europe/Istanbul` time zone in `lib/date.ts`.
The append-only schedule begins on 2026-01-01 and contains 365 unique answers,
through 2026-12-31. Puzzle IDs encode schedule revision and offset rather than a
runtime random seed. Reordering published answers is a breaking data migration;
append new entries instead.

Run `npm run validate:word` before publishing. It rejects malformed or duplicate
answers, answers missing from the accepted dictionary, a schedule shorter than
365 days, and an unexpectedly small accepted dictionary.

## Word-list provenance

The 8,636 accepted five-letter guesses are generated from the public-domain
ENABLE list. Full source, retrieval date, license status, transformation, and
regeneration command are in `lib/word/WORD-LIST-LICENSE.md`. The answer list is
an original, manually edited subset; accepted guesses are intentionally much
broader.

## Persistence and migration

All keys use `onegames:v1:word` and never overlap Sudoku or OneDna:

- `game:YYYY-MM-DD` stores guesses, current row, status, timing, and puzzle ID.
- `settings` stores reduced-motion and higher-contrast preferences.
- `stats` stores played/wins, streaks, six-row distribution, time, attempts,
  and completed puzzle IDs.
- `help-seen` controls the first-visit instructions.

Every save has an explicit schema version and puzzle ID. Corrupt, mismatched, or
future-version saves are discarded safely. Completion IDs make statistics
idempotent across reloads. Archive completions can affect played/win totals but
never today’s streak. “Reset OneWord data” removes only this namespace.

For a future schema, add a versioned parser/migration; do not silently reinterpret
old JSON. Keep the prior parser until the deployed population has migrated.

## Sharing, privacy, and unfinished scope

Sharing outputs only the puzzle number, score, and emoji grid. It never includes
the answer. Web Share is preferred; clipboard copy is the fallback. All progress
and statistics stay in the browser.

Hard mode is deliberately not included in this release: the product has one
clear ruleset and the settings panel does not tease unfinished functionality.
Server-synced progress and cross-device statistics are also outside the local
storage architecture.

## Verification

- `npm test`
- `npm run validate:word`
- `npm run lint`
- `npm run typecheck`
- `npm run test:e2e -- tests/word-gameplay.spec.ts`
- two consecutive `npm run build` executions before deployment

Browser QA covers 320×568, 360×800, 390×844, tablet, and 1440×900, including
first-visit help, invalid input, win/loss, reload restore, settings, archive,
focus-trapped dialogs, reduced motion, and absence of framework overlays.
