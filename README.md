# Cashflow

Household finance overview built from CSV exports of Norwegian bank
statements. Import the exports, let the categorizer sort them, and browse the
result in a local web UI: monthly income and expenses, category grid, merchant
overview with trends and averages, subscriptions and other recurring costs,
mortgage interest vs principal, and a what-if calculator for a new loan.

Transactions stay local in Deno and SQLite. Known merchant logos use a cached
favicon service; see the web UI and privacy notes below.

## Direction

The first version of this repo normalized bank CSVs into a combined file for
spreadsheet analysis. It has grown into the whole workflow: import, dedupe,
categorize, browse and adjust, so a yearly review takes minutes instead of an
evening, and questions like "what are our fixed costs" or "what does a bigger
loan leave us per month" have a page.

- `docs/PLAN.md` has the review of the old code, the phases and the current
  status.
- `AGENTS.md` has conventions and invariants for anyone (human or AI) changing
  the code.
- `DESIGN.md` defines the visual system. `docs/design-brief.md` records its
  scope and the revision against the latest UI changes.

## Quick start

```sh
# 1. Describe your household (owners + account numbers). The real file is gitignored.
cp accounts.example.json accounts.json

# 2. Drop CSV exports into ./statements/ (any filename)

# 3. Import and categorize
deno task import

# 4. Browse
deno task serve      # http://127.0.0.1:8000
```

Requires Deno 2.x.

## Supported exports

| Bank          | Format                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Handelsbanken | v1 (comma, UTF-8, until early 2025) and v2 (semicolon, ISO-8859-1, multi-line messages, balance footer) |
| Nordea        | semicolon, UTF-8 with BOM                                              |

The bank is detected from the CSV header and the encoding is sniffed, so file
names do not matter. The account is identified from the account number inside
the file and mapped to an owner through `accounts.json`. If the account is
unknown the import stops and tells you what to add.

Adding a bank means adding one file in `src/importers/` that implements the
`Importer` interface (detect header, parse rows into `NormalizedRow`) and
registering it in `src/importers/mod.ts`.

## Commands

| Command                       | What it does                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `deno task import [files...]` | Imports every `.csv` in `./statements` (or the given files), skips lines already imported, then categorizes. |
| `deno task rebuild`           | Wipes imported data and re-imports everything. Rules and manual category choices are kept.       |
| `deno task categorize`        | Re-runs categorization only.                                                                     |
| `deno task serve`             | Starts the web UI on http://127.0.0.1:8000 (`--port N` to change).                               |
| `deno task dev`               | Same, restarting on file changes.                                                                |
| `deno task test`              | Runs the test suite.                                                                             |
| `deno task check`             | Type-check, lint and format check.                                                               |

## How it works

**Import.** Each statement line becomes a normalized transaction with a
fingerprint (account, dates, amount, description, message, plus an ordinal for
identical lines in the same file). Re-importing overlapping exports is safe:
identical fingerprints are skipped. Pending (`Reservert`) lines are skipped
because they show up booked in the next export. Opening and closing balances
from Handelsbanken footers are stored for reconciliation, and mortgage messages
(`Avdrag / Renter / Terminomkostninger`) are parsed into a `loan_payments`
table.

**Merchant normalization** (`src/normalize/merchant.ts`) turns
`Vipps*FLYTOGET AS`, `Spotify P411AB172B` or `27.10 JOKER MØLLERGAT ... OSLO`
into stable merchant keys so rules stay short.

**Categorization** (`src/categorize/`) is layered, first match wins:

1. Manual decisions made in the UI, keyed by fingerprint so they survive
   rebuilds: a category override, or a one-off flag.
2. Bank signals: salary, loan repayment, fees, interest, cash.
3. Transfers: counterparty account in `accounts.json`, or counterparty name
   matching an owner alias. Own-to-own transfers, partner transfers, savings
   deposits and loan payoffs are excluded from income and expenses. Opposite
   amounts across own accounts within three days are linked.
4. Expense refunds from an employer.
5. Rules: regexes on merchant, description, counterparty, message or bank
   type. Seed rules live in `src/categorize/seed-rules.ts`; rules created from
   the UI live in the database and take priority.
6. Everything else is `uncategorized` and appears in the review queue.

**Operating view.** The overview and the loan what-if count salary, interest
and employer refunds as income. "Annen inntekt" and unknown inflows stay out
until they are given a category, unknown outflows count as spending, and
moves to and from savings are neither. Both errors understate headroom rather
than inflate it. Money that only passes through, such as a bill paid for
friends and what they send back, goes in the "Utenfor" group (`outside`
kind): both directions in the same category, counted as neither income nor
expense, with the group's net shown so your own share stays visible. A
transaction flagged as a
one-off in the UI stays in the transaction list but leaves every average,
category total, merchant total and the recurring detector. The overview says
what was held out, and shows a "typical month" (the median of the monthly
sums, empty months counting as zero) next to the mean per category, so one
big purchase does not define a category.

**Web UI** (`src/web/`) is Hono with server-rendered JSX and htmx, no build
step. Chart.js and htmx load from cdnjs unless copies exist in
`src/web/static/` (`htmx.min.js`, `chart.umd.min.js`). Merchant logos are
favicons fetched once by the server from DuckDuckGo's icon service into
`.cache/logos/` (gitignored) for merchants with a known domain, with an SVG
monogram for the rest; pages themselves never call third parties.

Transaction filters combine direction (all/in/out), multiple categories,
owners and accounts, and a from/to period. Dashboard headline figures and
mortgage headroom use salary; the monthly cash-flow chart includes all income.

## Privacy

`statements/`, `accounts.json` and the database are gitignored. They hold real
names and account numbers and must stay out of commits, fixtures and docs.

## Database

`./cashflow.sqlite3` (gitignored) is derived data and can always be rebuilt
from the CSVs. Tables: `accounts`, `imports`, `transactions`, `loan_payments`,
`categories`, `rules`, `overrides`. A database from the previous version of
this tool is renamed to `cashflow.v1-backup-<timestamp>.sqlite3` on first run.

## Layout

```
src/
  main.ts            CLI entry (import, rebuild, categorize, serve)
  config.ts          accounts.json loader
  db/                schema + connection
  importers/         encoding sniffing, bank readers, fingerprints, import service
  lexer/             card-description lexer (currency, rate, card, merchant)
  normalize/         merchant normalizer
  categorize/        categories, seed rules, engine, transfer linking, recurring detection
  web/               Hono server, queries, JSX views
docs/PLAN.md         review of v1, the phased plan and current status
AGENTS.md            conventions and invariants for contributors
```

## License

MIT, see LICENCE.md.
