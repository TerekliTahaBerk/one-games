# OneGames

OneGames is the daily-games member of the One family — sibling to OneRead, not
a product beneath it. It ships with **OneSudoku**: one Easy, one Medium, and
one Hard chapter every day, behind email-code verification and a $1/month Polar
membership, plus an explicit no-payment test path.

> One thoughtful game at a time.

## A sibling of OneRead, not a lookalike

The shell is deliberately the same one OneRead uses, so the two read as one
company:

- white paper, Fraunces for editorial type, Inter for interface type
- the lockup — wordmark plus character — at one fixed height (28px / 34px),
  centred on **every** route
- the same page padding on every route, verified by a test
- a typewriter opening loader — OneGames → OneSudoku → OneWord → OneMatch →
  OneNumbers — handing off to a staggered content reveal
- calm black pill CTAs, restrained motion, no cards or dashboards
- one centred footer: a Fraunces-italic tagline over
  Terms · Privacy · About · Pricing
- the family credited at the top left of the homepage, linking to OneRead —
  quiet enough not to compete with the lockup

The one deliberate departure is the legal pages: like OneRead's, they are
reference documents, so `components/LegalPage.tsx` reads left-aligned from the
top of the column instead of centring a single screen. The shell around them —
padding, wordmark, footer — is unchanged.

Mobile is designed at mobile, not scaled down: the game's number pad becomes a
single thumb-reachable row, footer dot separators are dropped in favour of
wrapping, and the title bar restacks.

## The lockup

The wordmark and the character beside it are supplied artwork, so — like
OneRead's — they ship as an image rather than being typeset. Source files live
in `assets/brand/`; `scripts/build-brand-assets.mjs` produces what the site
actually loads:

- `public/onegames-logo.png` — the lockup, cut out of its background
- `public/onegames-mark.png` — the character alone, on a white tile, used for
  the browser tab and the web app manifest

The supplied art sits on a near-white field, which reads as a grey box on a
white page. The script measures that field (82% of pixels land at 253–255, the
ink at 17–20), trims to the ink, derives per-pixel alpha across the gap so the
antialiasing survives, and undoes the white compositing so the controller's
coloured buttons keep their true hue.

The lockup renders at one fixed height everywhere — 28px, 34px from `sm` up,
the same as OneRead's.

The character belongs to the brand lockup only. The four game marks below stay
strictly geometric — no faces anywhere in them.

## The identity system

`components/GameLogo.tsx` draws all four marks in code on a shared 64×64 grid,
so they are sharp at any size and there is no raster asset to regenerate. They
share one construction language — a 3.2 outer stroke, a 2 inner stroke, a
9-unit corner radius, a pale cell rhythm, and a single solid accent moment —
while staying individually recognisable at 16px:

| Mark | Idea | Accent |
| --- | --- | --- |
| OneSudoku | Rounded logic grid, three colour families crossing it, one solid completion cell | Pale blue + region tints |
| OneWord | Three tiles leaning on a shared base, the middle one solid | Pale lilac |
| OneMatch | Three rings whose centres each sit one radius from a shared middle | Pale rose |
| OneNumbers | Asymmetric-cornered 2×2 arithmetic panel | Pale green |

They are used large on the homepage, as a small family lockup on the access and
pricing pages, and as the product mark in the game. There are no characters,
faces, or mascots anywhere in the product, and nothing is borrowed from another
puzzle brand's marks, colours, or cell compositions.

`scripts/build-og.mjs` renders `public/og.png` (1200×630) from the same lockup
file and the same fonts, so a shared link previews as the product it opens.

## Stack

- Next.js App Router on vinext/Vite, with ESM output for Cloudflare Workers
- Strict TypeScript, Tailwind v4 pipeline, token-based CSS design system
- Cloudflare D1 for verification codes, sessions, and billing state
- Resend for six-digit email verification
- Polar for $1/month checkout and signed billing webhooks
- Versioned `localStorage` for device-local puzzle progress, with a safe reset
  path for saves an older schema wrote
- Vitest for domain logic, Playwright for desktop and mobile flows

## Local setup

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No credentials are needed — use the
**“try today’s game without an account”** link on `/play`.

## Deploy targets

The app builds for two hosts from one codebase.

| | Cloudflare / Sites | Vercel |
| --- | --- | --- |
| Build | `npm run build` (vinext → `dist/`) | `npm run build:vercel` (`next build` → `.next/`) |
| Config | `.openai/hosting.json` | `vercel.json` |
| Storage | native D1 binding `DB` | Postgres (`POSTGRES_URL`) |

`vercel.json` pins the build command, so a Vercel project needs no dashboard
setup. If a Build Command is already set in project settings it overrides
`vercel.json` — clear it, or set it to `npm run build:vercel`.

Storage resolves in `lib/access/db.ts`, in this order: native D1 binding →
D1 HTTP API → none. With none, the marketing pages and playing without an account work
normally, and email sign-in, checkout, and the webhook return
`storage_not_configured` (503). Nothing is ever simulated as succeeding.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:db        # needs POSTGRES_URL in .env.local
npm run test:e2e
npm run build          # Cloudflare Worker bundle -> dist/
npm run build:vercel   # Next.js build -> .next/
```

Asset and content tooling:

```bash
node scripts/build-brand-assets.mjs
node scripts/build-og.mjs
node scripts/generate-puzzles.mjs               # regrid and recolour the bank
node scripts/generate-puzzles.mjs --groups-only  # keep the grids, redraw colours
npm run validate:sudoku                          # check the shipped bank
```

## Project structure

```text
assets/brand/           Supplied logo artwork (source files)
app/                    Routes, metadata, manifest, sitemap, robots
app/api/access/         Verification, session, test, status, checkout
app/api/webhook/        Signed Polar billing lifecycle
db/postgres/            Postgres migrations
components/             Shared shell: header, footer, logos, access, legal
components/sudoku/      Board, controls, settings, completion
hooks/                  Gameplay state and timer orchestration
lib/access/             Crypto, storage adapters, store, session, webhooks
lib/sudoku/             Solver, puzzle bank, persistence
scripts/                Social card and puzzle-bank generators
tests/                  Vitest unit tests and Playwright specs
drizzle/                D1 schema migration
```

## Data layer

Every statement the app runs lives in `lib/access/store.ts`. Route handlers own
HTTP — parsing, status codes, cookies — and call in for anything that touches
storage, so the SQL the app runs is the SQL the integration test exercises
rather than a copy that can drift. Each function returns `null`/`false` when no
database is configured; none of them throw for that, and none invent a result.

One schema serves both engines. Timestamps are epoch milliseconds in `BIGINT`
rather than `TIMESTAMPTZ`, because SQLite has no timezone-aware type and
milliseconds compare identically on both with no conversion. `lib/access/
postgres.ts` rewrites `?` placeholders to `$1…$n` (skipping quoted strings) so
one set of queries serves both, and runs `batch` inside a real transaction —
something the D1 HTTP client cannot offer.

| Table | Holds |
| --- | --- |
| `players` | every address ever entered, with request count and verification date |
| `verification_codes` | keyed hashes, expiry, attempt count |
| `access_sessions` | SHA-256 of the cookie value, never the value itself |
| `subscriptions` | billing status per address |
| `billing_events` | delivered webhook ids, for idempotency |

`players` is recorded the moment an address is entered, not once it verifies —
the top of the funnel is worth knowing.

### Migrations

Postgres migrations live in `db/postgres/` and are applied in filename order by
`scripts/migrate-postgres.mjs`, which records what it has run in
`schema_migrations` and wraps each file in a transaction, so re-running is a
no-op and a partial file can never land. The D1 paths create their tables on
first use instead.

```bash
node --env-file=.env.local scripts/migrate-postgres.mjs
npm run test:db   # walks the whole lifecycle against the real database
```

## Access and billing

`/play` requests a six-digit code, verifies inbox ownership, creates an
HTTP-only access session, and reads the D1 subscription record. **Verification
never grants paid access** — Polar's signed webhook is the only path that moves
a subscription to `active`.

- Codes are stored as an HMAC (`EMAIL_VERIFICATION_SECRET`), expire after ten
  minutes, allow five attempts, and are single-use.
- Requests are rate-limited to one code per address per minute.
- Session tokens are 256-bit, stored only as a SHA-256 hash, and set as
  `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- Webhooks are signature-verified and de-duplicated by `webhook-id`, so a
  retried delivery cannot double-apply.
- Subscription statuses are `active`, `pending`, `past_due`, and `canceled`.
  The mapping lives in `lib/access/billing.ts` and is unit-tested, including
  that a `subscription.revoked` event carrying a stale `active` status still
  revokes.

“Try today’s game without an account” sets a short-lived (2 hour) HTTP-only
test session and is
deliberately independent of billing. **When the email or billing variables are
absent, those endpoints say so and return 503 — they never behave as though a
real code was sent or a real payment was taken.**

### Environment variables

See `.env.example`. Summary of what breaks without each:

| Variable | Needed for | Without it |
| --- | --- | --- |
| `EMAIL_VERIFICATION_SECRET` | Hashing verification codes | Code requests return `email_not_configured` |
| `RESEND_API_KEY` | Delivering codes | Same as above |
| `ONEGAMES_EMAIL_FROM` | Sender identity | Falls back to `OneGames <hello@oneread.email>` |
| `POLAR_ACCESS_TOKEN` | Opening checkout | Checkout returns `billing_not_configured` |
| `POLAR_ONEGAMES_PRODUCT_ID` | The $1/month product | Same as above |
| `POLAR_WEBHOOK_SECRET` | Verifying webhooks | Webhook returns 503; nothing becomes `active` |
| `POLAR_SERVER` | Sandbox vs production | Defaults to `sandbox` |
| `PUBLIC_BASE_URL` | Checkout return URLs, sitemap, robots | Falls back to the production origin |
| `POSTGRES_URL` / `PRISMA_DATABASE_URL` | Storage off Cloudflare | Falls back to the D1 binding, then D1 HTTP, then no storage |
| `CLOUDFLARE_ACCOUNT_ID` | D1 over HTTP | Only consulted when Postgres is unset |
| `CLOUDFLARE_D1_DATABASE_ID` | Same | Same |
| `CLOUDFLARE_API_TOKEN` | Same (needs D1 Edit) | Same |

## Sudoku architecture

`lib/sudoku/constraints.ts` is the single rule engine and is UI-independent. It
models one neighbourhood per cell — row, column and box peers, plus the peers
that share the cell's colored group — and every downstream question is answered
from it: candidates, conflicts (with the rule each one breaks), and completion.
`lib/sudoku/solver.ts` adds the minimum-remaining-values search and the
uniqueness count on top, so a solution can never violate a colored group.

The gameplay hook keeps each move as a snapshot for undo/redo, pauses timing
when the document is hidden, and writes a versioned save after state changes.

### Colored groups

A colored group is a named set of cells whose non-zero values must all differ,
on top of the usual rules. In the interface it reads as
“Matching colored cells cannot repeat a number.”

Puzzle data stores a semantic palette key, never a CSS value:

```json
{ "id": "coral", "color": "coral", "cells": [0, 31, 43, 62] }
```

`app/globals.css` binds each key (`coral`, `violet`, `mint`, `gold`, `sky`) to
`--region` and `--region-soft`, and `lib/sudoku/regions.ts` gives it a
player-facing name and a corner-marker shape so groups stay separable without
relying on hue. A cell belongs to at most one group; `lib/sudoku/puzzle-validation.ts`
enforces that, along with cell ranges, in-group duplicates, minimum size, and
given clues that would already break the rule.

Layouts are legible figures — diagonals, arcs, crowns, pinwheels, constellations
— drawn so no two cells in a group share a row or a column and every group spans
at least two boxes. Easy carries 3 groups of 3–4 cells, medium 4 of 4–5, hard 4–5
of 4–6, never more than a third of the board. Puzzles with no colored groups are
still fully supported and behave exactly as before.

### Daily puzzle selection

The browser's local date becomes a `YYYY-MM-DD` key. A stable hash of that key
and the difficulty picks from the curated bank in `lib/sudoku/puzzle-bank.json`,
so a date always maps to the same puzzle. Ids are positional and stable
(`easy-01`, `medium-07`, …).

`scripts/generate-puzzles.mjs` regenerates the bank: it carves rotationally
symmetric holes from randomly generated solved grids, keeping a candidate only
while exactly one solution remains, to a clue budget per difficulty (easy 38–42,
medium 30–34, hard 24–28). It then fits each grid with the largest legible set of
non-overlapping colour figures whose cells already hold nine distinct values in
that grid's own solution — which is what keeps the single solution intact once
the colored rule applies. `--groups-only` redraws the colours without touching
the grids. `npm run validate:sudoku` re-checks everything from the command line.

### Persistence

Keys use the `onegames:v1` namespace, stored per date and difficulty: values,
candidates, elapsed time, status, mistakes, hints, and undo/redo history.
Settings, aggregate stats, and the colored-rule onboarding flag are separate
records under the same namespace.

The save schema is at **version 2**, which added the `puzzleId` field. `loadGame`
discards — and only discards — a game save it cannot vouch for: an older schema
version, a malformed board, or a save written against a different puzzle
definition than the one now served for that date. Settings and historical stats
live under their own keys and are never touched by that reset. A streak counts
calendar dates with at least one completed difficulty.

## Accessibility

Semantic `grid`/`gridcell` roles, row/column/value labels that also name a
cell's colored group, roving focus, arrow-key movement, number and delete keys,
visible focus rings, live announcements, labelled dialogs, non-colour conflict
markers, a distinct corner-marker shape per colour so groups never depend on hue
alone, 44px touch targets in the footer and controls, and reduced-motion support (both the OS
preference and an in-game toggle). `banner`, `main`, and `contentinfo`
landmarks are page-level on every route, which the Playwright suite asserts.

## Testing

- `npm test` — 61 unit tests over the rule engine (standard and colored peers,
  candidate exclusion, conflict reasons, the solver, completion), puzzle-data
  validation, the puzzle bank, save migration, daily scheduling, webhook
  interpretation, the D1 HTTP client, and Postgres placeholder translation.
  Offline; the integration suite skips itself.
- `npm run validate:sudoku` — checks every shipped puzzle from the command line:
  well-formed groups, one solution under the colored rules, and layout budgets.
- `npm run test:db` — 11 checks that walk the whole lifecycle against a real
  database: code request, cooldown, attempt counting, verification, session
  resolution, checkout, webhook grant and revoke, idempotency, and purge.
- `npm run test:e2e` — 90 Playwright checks across a desktop and a mobile
  project, covering the no-account play path, the access gate, number entry by pad
  and keyboard, notes mode, arrow-key movement, undo/redo/erase, hints,
  pause/resume, difficulty switching, reload persistence, puzzle completion,
  the colored-rule onboarding and legend, colored-group conflicts, colored-group
  accessible labels, the reduced-motion toggle, the archive, and shell consistency (wordmark size and centring, equal top padding, identical footer,
  touch heights, and no horizontal overflow) on every route.

## Deployment

`npm run build` produces the Cloudflare-compatible bundle in `dist/`, with
`.openai/hosting.json` and the D1 migration packaged into `dist/.openai` by
`build/sites-vite-plugin.ts`. `npm run build:vercel` produces a stock Next.js
build in `.next/`.

Either way, apply `drizzle/0000_onegames_access.sql` to the D1 database (the
app also creates the tables on first use) and set the runtime variables above.

## Originality

OneGames shares the product-family system and subscription discipline of the
owner-provided OneRead repository, and its own game artwork and puzzle
execution are original. It contains no New York Times code, puzzle data,
branding, fonts, copy, or assets.
