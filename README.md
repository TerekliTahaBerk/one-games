# OneGames

OneGames is the daily-games member of the OneRead product family. It ships with
**OneSudoku** — one Easy, one Medium, and one Hard chapter every day — behind
email-code verification and a $1/month Polar membership, plus an explicit
no-payment test path.

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
  Terms · Privacy · About · Pricing · Archive · OneRead

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
9-unit corner radius, one pale accent per game, and a single solid accent
moment — while staying individually recognisable at 16px:

| Mark | Idea | Accent |
| --- | --- | --- |
| OneSudoku | Rounded logic grid, pale cell rhythm, one solid completion cell | Pale blue |
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
- Versioned `localStorage` for device-local puzzle progress
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
| Storage | native D1 binding `DB` | D1 over HTTP (`CLOUDFLARE_*` vars) |

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
npm run test:e2e
npm run build          # Cloudflare Worker bundle -> dist/
npm run build:vercel   # Next.js build -> .next/
```

Asset and content tooling:

```bash
node scripts/build-brand-assets.mjs
node scripts/build-og.mjs
node scripts/generate-puzzles.mjs
```

## Project structure

```text
assets/brand/           Supplied logo artwork (source files)
app/                    Routes, metadata, manifest, sitemap, robots
app/api/access/         Verification, session, test, status, checkout
app/api/webhook/        Signed Polar billing lifecycle
components/             Shared shell: header, footer, logos, access, legal
components/sudoku/      Board, controls, settings, completion
hooks/                  Gameplay state and timer orchestration
lib/access/             Crypto, D1, email, session, webhook interpretation
lib/sudoku/             Solver, puzzle bank, persistence
scripts/                Social card and puzzle-bank generators
tests/                  Vitest unit tests and Playwright specs
drizzle/                D1 schema migration
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
| `CLOUDFLARE_ACCOUNT_ID` | D1 over HTTP (non-Cloudflare hosts) | Falls back to the native binding, then to no storage |
| `CLOUDFLARE_D1_DATABASE_ID` | Same | Same |
| `CLOUDFLARE_API_TOKEN` | Same (needs D1 Edit) | Same |

## Sudoku architecture

`lib/sudoku/solver.ts` is UI-independent: it validates boards, detects
conflicts, computes candidates, solves with a minimum-remaining-values
backtracking strategy, and counts solutions to prove uniqueness. Puzzle strings
hold clues only; solutions are derived when a game starts.

The gameplay hook keeps each move as a snapshot for undo/redo, pauses timing
when the document is hidden, and writes a versioned save after state changes.

### Daily puzzle selection

The browser's local date becomes a `YYYY-MM-DD` key. A stable hash of that key
and the difficulty picks from the curated bank, so a date always maps to the
same puzzle.

`scripts/generate-puzzles.mjs` regenerates the bank: it carves rotationally
symmetric holes from randomly generated solved grids, keeping a candidate only
while exactly one solution remains, to a clue budget per difficulty (easy 38–42,
medium 30–34, hard 24–28). The banks are disjoint. Tests assert that every
single puzzle in every bank has a unique solution, that no grid repeats, that
clue counts strictly decrease with difficulty, and that a given day serves three
different grids.

### Persistence

Keys use the `onegames:v1` namespace, stored per date and difficulty: values,
candidates, elapsed time, status, mistakes, hints, and undo/redo history.
Settings and aggregate stats are separate records. Reads are guarded so
malformed or unavailable storage degrades safely. A streak counts calendar dates
with at least one completed difficulty.

## Accessibility

Semantic `grid`/`gridcell` roles, row/column/value labels, roving focus,
arrow-key movement, number and delete keys, visible focus rings, live
announcements, labelled dialogs, non-colour conflict markers, 44px touch
targets in the footer and controls, and reduced-motion support (both the OS
preference and an in-game toggle). `banner`, `main`, and `contentinfo`
landmarks are page-level on every route, which the Playwright suite asserts.

## Testing

- `npm test` — 32 unit tests over the solver, puzzle bank, daily scheduling,
  webhook interpretation, and the D1 HTTP client.
- `npm run test:e2e` — 68 Playwright checks across a desktop and a mobile
  project, covering the no-account play path, the access gate, number entry by pad
  and keyboard, notes mode, arrow-key movement, undo/redo/erase, hints,
  pause/resume, difficulty switching, reload persistence, puzzle completion,
  the archive, and shell consistency (wordmark size and centring, equal top padding, identical footer,
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
