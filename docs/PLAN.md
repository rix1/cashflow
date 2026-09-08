# Cashflow v2 plan

Written 2026-09-04. Goal: a correct, browsable overview of household income and
expenses to prepare for a larger mortgage. Partner exports arrive later, so every
step must stay bank- and owner-agnostic.

## Review of the v1 code (what was wrong)

- New Handelsbanken export changed format: ISO-8859-1 encoding, `;` separator,
  multi-line quoted message fields, and footer rows with totals and opening /
  closing balance. v1 read UTF-8 with `,` and would have imported garbage.
- Dedup was disabled (unique constraint removed because identical rows are
  legitimate, e.g. five Ruter tickets in one day). Re-importing overlapping
  exports doubled rows. The v1 DB had 3750 rows for 3486 distinct ids.
- Filename-based account guessing failed for both new files.
- `deno task run` could not write the DB with its permission flags; the `./out`
  CSV writer was dead code.
- Only the lexed merchant string was stored; Type/Undertype/Betalingstype,
  counterparty and message were thrown away. These are what a categorizer needs.
- Transfers between own accounts counted as income and expenses.
- Pending rows stored "Reservert" as a date; new `DD.MM MERCHANT STREET CITY`
  descriptions kept the date in the merchant name.

## Phase 0: data model and idempotent import  (done)

- SQLite schema v2 (`src/db/schema.ts`): `accounts`, `imports`, `transactions`,
  `loan_payments`, `categories`, `rules`, `overrides`, `meta`.
- The DB is derived data. `deno task rebuild` wipes transactions/imports and
  re-imports everything from `./statements`. Rules and manual overrides are keyed
  by stable fingerprints and survive rebuilds.
- Fingerprint = sha256 of account, dates, amount, description, message and an
  ordinal among identical rows in the same file. Identical legitimate rows stay,
  re-imports are ignored.
- Pending rows (`Reservert` / no booked date) are skipped; they arrive booked in
  the next export.
- A v1 database found at `./cashflow.sqlite3` is renamed to
  `cashflow.v1-backup.sqlite3`, never deleted.

## Phase 1: importers without prompts  (done)

- Format is detected from the header, not the filename. Encoding is sniffed
  (UTF-8 with or without BOM, else Latin-1).
- The account is identified from the account number inside the file and mapped
  to owner/bank/name through `accounts.json` (gitignored; see
  `accounts.example.json`). Unknown accounts fail with a message that tells you
  what to add. Partner exports are a drop-in.
- Handelsbanken v1 (comma) and v2 (semicolon) readers, Nordea reader.
- Footer balances are stored per import for reconciliation.
- Mortgage messages (`Avdrag / Renter / Terminomkostninger`) are parsed into
  `loan_payments`.
- Coverage gaps per account are computed from import periods and shown in the
  UI (the Nordea hole 2025-01-18 to 2025-03-03 is expected).

## Phase 2: categorization engine  (done)

Layered, first match wins, manual overrides always win:

1. Bank signals: salary type, loan repayment subtype, fees, interest, cash.
2. Transfers: counterparty account in `accounts.json`, or counterparty name
   matching an owner alias. Own-to-own is `transfer:own`, between partners is
   `transfer:partner`. Opposite amounts across own accounts within 3 days are
   linked into a transfer group.
3. Rules: ordered regex rules on merchant / description / counterparty /
   message / bank type. Seed rules live in `src/categorize/seed-rules.ts`; rules
   created from the UI live in the DB and take priority.
4. Anything else is `uncategorized` and shows up in the review queue sorted by
   money at stake.

A merchant normalizer strips city suffixes, Vipps/Zettle/VFI prefixes, card
terminal ids and unique reference numbers so the rule list stays short.

## Phase 3: local web UI  (done, first version)

Hono + server-rendered JSX + htmx, no build step. Deno Fresh was considered;
the API layer is separate so a Fresh frontend can replace the views later if
the UI grows interactive enough to want islands.

Views: dashboard, category grid, vendors (searchable merchant overview with
totals, weekly/monthly/yearly averages, sparkline trend and a detail page per
merchant), fixed costs (recurring detection), mortgage (interest vs principal,
what-if for the new loan), transactions (search, inline category edit), review
queue (bulk tag by merchant, creates rules), rules, data quality (imports,
gaps, reconciliation).

## Phase 4: later

- DNB reader if needed for the partner's bank.
- CSV/Sheets export of the categorized ledger.
- Budget targets per category.
- Optional: move views to Deno Fresh.

## Status 2026-09-04 (evening, partner data added)

Phases 0 to 3 are implemented and verified against the real exports:

- 7 files imported (both partners), 8607 transactions, overlapping exports
  deduplicated fully (January 2025 overlap for both Handelsbanken accounts).
- 20 mortgage terms parsed with interest/principal split.
- 65 transfer pairs linked across own and partner accounts.
- Roughly 10 % of rows remain uncategorized (long tail of one-off merchants);
  the review page is built to clear those quickly and each choice becomes a
  rule.
- The data page flagged Siri's "Sparegris" savings account automatically; it
  is now in accounts.json.
- 2026-09-05: vendor overview added (`/vendors`); the recurring page became a
  subscription finder with search, type and cadence filters and merchant
  logos; design brief written at docs/design-brief.md; Claude Design sync was
  evaluated and skipped because the app has no component library to import.

Known limitations / next steps:

- Nordea gap 2025-01-18 to 2025-03-03 still needs an export from the bank.
- Siri's other accounts (the "annen konto" 1638 22 83701 and any savings or
  loan accounts at other banks) are known only by number; add them to
  accounts.json with the right kind when identified.
- Chart.js 4.5.1 and htmx 2.0.4 are vendored in src/web/static/.
- Seed rules are tuned to this household's merchants; generic keyword rules
  will misfire occasionally. Fix by adding a user rule with lower priority
  number, or an override on the transaction.
- The mortgage what-if uses the last 12 months of household averages; it does
  not know about salary changes, the new apartment's fellesutgifter, or
  savings targets. Treat it as a floor.

## Status 2026-09-08 (operating view)

The March 2026 share sale and reimbursements from friends had inflated both
income and expenses, so the overview and the loan what-if could not be
trusted for "what does a bigger loan leave us". Changes:

- The brokerage payout account is in accounts.json as a savings account, so
  the sale is a savings withdrawal that nets against the deposit the same
  day. No code change; the data page would have flagged it if the bank had
  marked it as an own account.
- Schema v3: overrides carry a reimbursement link and a one-off flag, the
  category became optional, transactions mirror the flag. `openDatabase()`
  migrates in place.
- Reimbursement links: an inflow linked to an expense from the transaction
  row takes that expense's category on every categorization run. The review
  page lists every "Annen inntekt" row, since the two catch-all seed rules
  are where one-offs land.
- One income definition everywhere: operating income = salary, interest and
  employer refunds. "Annen inntekt" and unknown inflows are held out and the
  overview says so.
- One-off flag: kept in the transaction list, left out of flows, averages,
  category totals, merchant totals and recurring detection. "Typisk måned"
  (median of monthly sums, empty months as 0) next to the mean on the
  overview and the categories page.

Still open: the two August 2026 inflows from a friend need linking to the
expenses they covered (the data does not say which), April 2026 has 109
uncategorized rows to clear before per-category averages are trusted, and
budget targets per category remain Phase 4.
