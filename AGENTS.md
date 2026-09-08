# AGENTS.md

Working notes for AI coding agents and humans contributing to this repo.
README.md covers usage, docs/PLAN.md covers the v1 review, the phases and
current status. This file covers conventions and invariants.

## What this is

A local household finance tool. CSV exports from Norwegian banks are imported
into SQLite, categorized, and browsed in a local web UI (monthly flows, category
grid, recurring fixed costs, mortgage split, loan what-if). Two owners, several
accounts, one shared database. The purpose is to understand income, expenses and
fixed costs well enough to size a larger mortgage.

## Private data: never commit, never print

- `./statements/*.csv`, `./accounts.json` and `./cashflow.sqlite3*` are
  gitignored and contain real names and account numbers. Keep them out of
  commits, fixtures, docs and chat output. Use the placeholders from
  `accounts.example.json` in examples and tests.
- The database is derived data: `deno task rebuild` recreates it from the CSVs.
  Rules created in the UI and manual overrides live in the database and survive
  rebuilds. A v1-era database is renamed to a backup, never deleted.

## Commands

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `deno task import`     | Import new/changed CSVs in `./statements`, then categorize |
| `deno task rebuild`    | Wipe transactions/imports, re-import everything            |
| `deno task categorize` | Re-run categorization only                                 |
| `deno task serve`      | Web UI on http://127.0.0.1:8000 (`--port N`)               |
| `deno task dev`        | Same, restarts on file changes                             |
| `deno task test`       | Unit tests                                                 |
| `deno task check`      | Type-check, lint, `fmt --check`                            |

Run `deno fmt` before committing. Line width is the default 80, so long literal
lines (seed rules, canonical merchant lists) get wrapped. Do not patch source
with line-based string replacement; use token-level edits or edit by hand.

## Architecture

```
src/main.ts                 CLI dispatcher (import, rebuild, categorize, serve)
src/config.ts               accounts.json loader, account-number normalization, owner aliases
src/db/schema.ts            SQLite DDL (schema v3)
src/db/db.ts                openDatabase(): WAL, foreign keys, busy timeout, v1 backup
src/importers/encoding.ts   strict UTF-8, else ISO-8859-1
src/importers/handelsbanken.ts, nordea.ts   bank readers (Importer interface)
src/importers/loan.ts       parses "Avdrag / Renter / Terminomkostninger" messages
src/importers/fingerprint.ts  stable row identity for dedup
src/importers/import-service.ts  file -> DB (accounts, imports, transactions, loan_payments)
src/lexer/                  card-description lexer (currency, rate, card, merchant)
src/normalize/merchant.ts   noisy description -> stable merchant key
src/categorize/categories.ts  taxonomy (key, name, group, kind)
src/categorize/seed-rules.ts  default rules, evaluated in order
src/categorize/engine.ts    categorizeTransaction(): the layered decision
src/categorize/transfers.ts links opposite amounts across own accounts
src/categorize/recurring.ts detects steady-cadence payments
src/categorize/mod.ts       categorizeAll(), seed sync, context loading
src/cli/                    import and categorize commands
src/web/server.tsx          Hono routes
src/web/queries.ts          all SQL for the UI and JSON API
src/web/stats.ts            trend, period averages, sparkline geometry
src/web/logos.ts            merchant -> domain map, favicon cache, SVG monogram
src/web/views/*.tsx         server-rendered JSX pages (vendors.tsx = merchant overview)
src/web/static/             vendored htmx and Chart.js
```

## Invariants

- **Importer contract.** `detect(headerLine)` picks the reader from the first
  line; `parse(text)` returns `NormalizedRow`s. Amounts are signed in the
  account currency. `own_account` and `counterparty_account` are digit-only. The
  file's account is the most frequent `own_account`.
- **Fingerprint** = sha256 of account, dates, amount, currency, folded
  description, folded message and an ordinal among identical rows in the same
  file. The same line in two exports yields the same fingerprint and is skipped.
  Changing the inputs changes dedup for every existing row: rebuild.
- **Pending rows** (Handelsbanken `Reservert`, Nordea rows without a booking
  date) are skipped. They come back booked in the next export.
- **`merchant` is computed at import time.** After changing the normalizer, run
  `deno task rebuild` before expecting rules to see new keys.
- **Categorization order** (`engine.ts`): manual override, bank signals (salary,
  loan repayment, fees, interest, cash), transfer detection (account numbers
  from accounts.json, owner aliases, bank's own-account subtype), employer
  refunds, rules by priority (user rules 100, seed rules 500+), uncategorized.
  Savings categories flip by amount sign.
- **Totals** are defined once in `web/queries.ts` (`INCOME_EXPR`,
  `EXPENSE_EXPR`, `SAVING_EXPR`). Income is operating income only
  (`OPERATING_INCOME_CATEGORIES`: salary, interest, employer refunds);
  `income:other` and positive uncategorized rows are held out, negative
  uncategorized rows count as expense, saving and transfer kinds are excluded.
  Every aggregate also filters `t.one_off = 0`. Keep every view consistent with
  those expressions; the transaction list is the only place one-offs show.
- **Overrides** (`overrides` table, keyed by fingerprint) hold three independent
  manual decisions: `category_key`, `reimburses` (fingerprint of the expense an
  inflow pays back) and `one_off`. Change them only through `upsertOverride()`
  in `web/queries.ts`, which drops empty rows, and re-run `categorizeAll()`
  afterwards: it mirrors `one_off` onto transactions and gives linked inflows
  the expense's current category (source `reimbursement`) in a post-pass.
- **Schema changes** bump `SCHEMA_VERSION` and add a step to `migrate()` in
  `db/db.ts`. `CREATE TABLE IF NOT EXISTS` never alters an existing table, so
  new columns need `ALTER TABLE` there, and relaxing a constraint means
  rebuilding the table (see the v3 overrides step). `db.test.ts` runs the
  migration against a v2-shaped file.

## Adding things

- **A bank:** one file in `src/importers/` implementing `Importer`, register it
  in `src/importers/mod.ts`, add a fixture test in `importers.test.ts` built
  from anonymized lines.
- **A category:** `categories.ts`. Group drives UI ordering, kind drives totals.
- **A seed rule:** `seed-rules.ts`. `brands(...)` anchors names at the start of
  the normalized merchant, `words(...)` matches anywhere. First match wins, so
  put specific rules before generic keyword rules. Seed rules are tuned to this
  household's merchants; that is intended.
- **Own accounts:** the data page lists counterparty accounts the bank calls
  "own account" that are missing from `accounts.json`. Add them with the right
  owner and kind (`checking`, `savings`, `loan`) and re-run categorize.

## Verifying changes

1. `deno task check` and `deno task test`.
2. For importer, normalizer or rule changes: `deno task rebuild`, then check the
   uncategorized count, the top uncategorized merchants, the categories of the
   largest transactions, and the data page for unknown own accounts.
3. For UI changes: start `deno task serve --port 8765`, fetch each page with a
   small Deno script (curl may be unavailable in sandboxes), confirm 200s and no
   error text, then stop the server.

## Gotchas

- SQLite runs in WAL mode with a 10 second busy timeout. A running
  `deno task dev` restarts on every source edit and reopens the database.
- Handelsbanken v2 exports are ISO-8859-1 and sometimes mangle names
  (`F™RSŽKRING`); fingerprints fold non-Latin-1 characters to `?` so both export
  generations dedupe.
- Nordea exports carry no card or foreign-currency prefix; original currency is
  only known for Handelsbanken card rows.
- Owner aliases in `accounts.json` drive transfer detection by name. Keep them
  in sync with how each bank renders names (uppercase variants, initials).
- `jsx-key` lint is disabled on purpose: pages are server-rendered strings.
- Logos: `/logo/:merchant` fetches favicons from icons.duckduckgo.com (the only
  non-local host in the serve task's `--allow-net`) into `.cache/logos/`.
  Unknown domains get a monogram; add domains to `KNOWN` in `logos.ts`.
- The default shell is zsh: never use `path` as a shell variable name (it is
  bound to `PATH`, and every later command fails with "command not found").
  Headless Chrome screenshots work with `--timeout=6000`;
  `--virtual-time-budget` hangs on Chart.js animations.

## Commit style

Small, self-contained commits prefixed by area: `importers:`, `categorize:`,
`web:`, `db:`, `docs:`, `chore:`.
