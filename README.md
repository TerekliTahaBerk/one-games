# OneGames

OneGames is the daily-games member of the OneRead product family. The first
release contains **OneSudoku**, with one Easy, Medium, and Hard chapter each
day, email-code verification, a $1/month Polar subscription gate, and an
explicit no-payment test path.

> One thoughtful game at a time.

## Screenshots

Product screenshots can be added here after deployment.

## Stack

- Next.js App Router, React, and strict TypeScript
- Tailwind CSS plus a token-based editorial design system
- Cloudflare D1 for verification, sessions, and billing state
- Resend for six-digit email verification
- Polar for $1/month checkout and signed billing webhooks
- Versioned `localStorage` for device-local puzzle progress
- Vitest for domain logic and Playwright for critical gameplay flows
- vinext/Vite output suitable for Vercel-style development and Cloudflare-based Sites hosting

## Local setup

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Project structure

```text
app/                    Routes, metadata, manifest, sitemap
app/api/access/         Verification, session, test, status, checkout
app/api/webhook/        Signed Polar billing lifecycle
components/             Shared editorial UI
components/sudoku/      Board, controls, settings, completion
hooks/                  Gameplay state and timer orchestration
lib/sudoku/             Solver, validation, puzzle bank, persistence
tests/                  Unit and end-to-end tests
public/                 Original vector brand assets
drizzle/                D1 schema migration
```

## Sudoku architecture

`lib/sudoku/solver.ts` is UI-independent. It validates boards, detects
conflicts, computes candidates, solves with a minimum-remaining-values
backtracking strategy, and counts solutions to verify uniqueness. Puzzle
strings contain clues only; solutions are derived when a game starts.

The gameplay hook keeps each move as a snapshot for undo/redo, pauses timing
when the document is hidden, and writes a versioned game record after state
changes. The view layer receives explicit board state and actions.

## Daily puzzle selection

The browser-local calendar date becomes a `YYYY-MM-DD` key. A stable hash of
that key and the difficulty selects from the curated local bank, so the same
date always maps to the same puzzle. Unit tests verify that sampled puzzles for
every difficulty have exactly one solution.

To add puzzles, append 81-character clue strings (zero means empty) to the
appropriate difficulty in `lib/sudoku/puzzles.ts`. Run `npm test`; uniqueness
validation should also be extended to any new bank entries.

## Access and billing

The public home follows OneRead’s single-purpose product-family structure.
`/play` requests a six-digit code, verifies inbox ownership, creates an
HTTP-only access session, and checks the D1 subscription record. Verification
never grants paid access. Polar’s signed webhook is the only path that moves a
subscription to `active`.

“Test this game” creates a short-lived HTTP-only test session and stays
deliberately separate from billing. Configure the variables in `.env.example`
locally and as hosted runtime values. The Polar product referenced by
`POLAR_ONEGAMES_PRODUCT_ID` should be priced at $1/month.

## Puzzle persistence model

Keys use the `onegames:v1` namespace. Games are stored separately by date and
difficulty. Saved data includes values, candidates, elapsed time, status,
mistakes, hints, and practical undo/redo history. Settings and aggregate stats
use separate records. Reads are guarded so malformed or unavailable storage
falls back safely.

Puzzle progress and stats are local to the current browser. A streak counts calendar dates with at
least one completed difficulty; completing another difficulty on the same date
does not break or artificially extend it.

## Accessibility

The board uses semantic grid and grid-cell roles, meaningful row/column/value
labels, roving focus, arrow-key movement, number and delete keys, visible focus
states, live announcements, dialog labels, non-color conflict markers, 44px
mobile targets, and reduced-motion support.

## Adding future games

Give each game a route and its own domain module, then register its real card on
the hub. Shared brand components and tokens should remain game-agnostic.
Persistence keys should keep the `onegames:<version>:<game>` pattern.

## Deployment

The production build is generated with `npm run build`. Live email and checkout
require the Resend, Polar, verification-secret, and public URL values listed in
`.env.example`. Test access works without provider credentials.

## Originality

OneGames shares the product-family system and subscription discipline of the
owner-provided OneRead repository, while retaining original OneGames game
artwork and puzzle execution. It contains no New York Times code, puzzle data,
branding, fonts, copy, or assets.
