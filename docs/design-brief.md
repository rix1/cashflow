# Design brief: Cashflow UI

## Implementation revision · 2026-09-08

Reviewed against `6b01f7f`, including the salary-based dashboard change
(`2ef657a`), merchant overview (`8869d23`) and transaction filters (`6b01f7f`).
The visual constraints below still apply. `DESIGN.md` records the chosen system.

- Dashboard headline: salary minus expenses per month. Label it explicitly;
  the monthly chart and table still show all income and actual net cash flow.
- Include **Mottakere** (`/vendors`) and merchant detail pages: logos, period
  averages, sparklines, trends and their transaction tables are established UI.
- `/fixed` is **Abonnementer** in navigation and also covers other recurring
  costs. Preserve search, kind, cadence and inactive filters.
- Transactions use an all/in/out direction control and checkbox multi-selects
  for category, owner and account. Preserve repeated query parameters, keyboard
  operation and `from`/`to` dates. Do not reintroduce a separate month filter.
- In-progress work in the main worktree distinguishes actual subscription
  spending over 12 months from cadence estimates, and refines mortgage input
  steps. Keep those calculations and inputs owned by that work; shared styles
  must accommodate their additional labels and subtotal rows.
- Chart.js and htmx are already vendored. Add no remote fonts or dependencies.
  Existing logo requests remain as documented in the README.
- Use synthetic data for implementation proofs, screenshots and interaction
  checks. Do not copy or modify the main worktree's private database.

Implementation sequence: record the system; apply shared CSS/navigation and
chart defaults; prove dashboard and transaction interactions; finish dense-grid,
review and mortgage details; verify all routes at laptop and phone widths.

You are designing the visual language for **Cashflow**, a local, private
household-finance tool used by two partners a few times a year and in bursts
around big decisions (right now: sizing a larger mortgage for a new
apartment). It is not a product with customers. It is a tool we open with a
coffee to understand where the money goes, and it should feel like that:
pleasant, calm, professional, trustworthy with numbers.

## Your task

1. **Research** (short): look at 6 to 8 references and write half a page on
   what makes them calm versus cluttered. Cover at least: two personal-finance
   apps (for example YNAB, Copilot, Monarch, Lunch Money, Actual Budget), two
   dense professional dashboards (for example Stripe, Linear, Vercel), one
   Norwegian bank app, and one editorial/data site with good tables. Extract
   patterns, not screenshots to copy.
2. **Direction**: propose one recommended direction and one alternative, each
   as a small moodboard or a single mocked dashboard frame. Pick a name
   treatment for "Cashflow" (wordmark, optional small mark). The current
   header uses an emoji; decide whether that stays.
3. **DESIGN.md**: the main deliverable, described below.
4. **Proof**: apply the system to the dashboard and the transactions page,
   either as mockups or, if you are comfortable, directly in the CSS (see
   constraints). Two pages are enough to prove the rules hold for both a
   "numbers and charts" page and a "long dense table with inline controls"
   page.

Time box: one to two days. Decisions over polish.

## What "calm but professional" has to mean here

- Numbers come first. Chrome, borders and color step back.
- Color carries meaning only: positive, negative, warning, one accent for
  interaction, and a categorical palette for charts. Everything else is
  neutral.
- Dense where the user reads (tables, grids), generous where the user
  decides (KPI tiles, the mortgage what-if result).
- Warnings inform, they do not shout. A data gap is a note, not an alarm.
- Scandinavian and warm-neutral rather than fintech-blue or "dark mode
  crypto". Think paper, ink, one accent.
- No gradients, glass, drop shadows for decoration, animated numbers, or
  illustration sets. No component library.

## Pages you are designing for

| Page                    | Job                                                                 | Nature                                                   |
| ----------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| Oversikt (dashboard)    | Monthly income vs expenses, net, savings rate, top categories, gaps | KPI tiles, one bar+line chart, two tables                |
| Kategorier              | Category x month grid, 12+ month columns                            | Very dense table with group subtotals, horizontal scroll |
| Mottakere               | Merchant totals, period averages, trends and drill-down              | Dense table, logos, sparklines, detail chart             |
| Faste kostnader         | Recurring payments, monthly equivalent, active/inactive             | Table with tiles on top                                  |
| Boliglån                | Interest vs principal per term, what-if form for a new loan         | Form + result tiles + stacked bar chart + tables         |
| Transaksjoner           | 200-row table, filters, inline category select per row (htmx)       | The workhorse; controls inside table rows                |
| Gjennomgang (review)    | Uncategorized merchants, pick a category, save as rule              | Table with a select and a button per row                 |
| Regler                  | Rule list, add-rule form                                            | Form + two tables                                        |
| Data                    | Accounts, imports with reconciliation, gaps, callouts               | Admin-ish tables and notes                               |

Run it yourself: `deno task serve` then open http://127.0.0.1:8000. UI copy
is Norwegian (bokmål) and stays Norwegian.

## Constraints you must respect

- Server-rendered HTML (Hono JSX) with htmx for the few interactive bits. No
  build step, no client framework, no component library. Styling is one CSS
  block in `src/web/views/layout.tsx`; class names may change if you update
  the views, but keep it plain CSS with custom properties.
- Charts are Chart.js. You control colors, fonts, grid lines and legends via
  its options; you do not replace it.
- Local-first: prefer no external requests at all. A web font is acceptable
  only if vendored into `src/web/static/`. System font stacks are welcome.
- Light theme is required. Dark theme is optional but define tokens so it is
  cheap later.
- Desktop and 13-inch laptop first. Phone should be readable, not redesigned.
- Accessibility: text contrast 4.5:1 or better, visible focus states, color
  never the only carrier of meaning (negative numbers also read as negative
  without red).
- Keep the information architecture and navigation as they are. This is a
  visual and micro-interaction pass, not a re-architecture.

## Specific problems to solve

- KPI hierarchy on the dashboard: which number is the headline (net per
  month? fixed costs? headroom after mortgage?) and how do secondary numbers
  sit under it.
- The category grid with 12 to 24 month columns: readability, sticky first
  column, subtotal rows, cell links, and how "no value" cells look.
- Long transaction tables with a select in every row: make the select quiet
  until hovered or focused, show the "how was this categorized" badge without
  clutter, and design the expandable details row.
- The review queue: it is a repetitive task. Make the row-by-row loop fast and
  low-fatigue.
- The mortgage what-if: form, result, and a rate-sensitivity table that reads
  at a glance.
- Callouts for data gaps and unknown accounts: informative, not alarming.
- Number formatting rules: Norwegian thousands and decimals, currency suffix
  or not, negatives, tabular numerals, alignment.

## DESIGN.md format: scrappy but effective

Write for a developer (or an AI agent) who must restyle the app without asking
you questions. Rules, not essays. Each rule one or two lines with a short
"why" where it is not obvious. Examples beat adjectives. Aim for 2 to 4
pages. Suggested sections:

1. **Principles** (5 lines max).
2. **Tokens**: a ready-to-paste `:root { ... }` block with colors (neutrals,
   accent, positive, negative, warning, surfaces, borders), type scale, spacing
   scale, radii, and the chart palette (semantic colors plus a categorical set
   for about 9 groups, distinguishable and not garish). Include the dark
   variant if you define one.
3. **Typography**: font stack, sizes and weights per role (page title,
   section, table header, body, small, KPI value), line heights, numerals.
4. **Layout**: page width, gutters, section rhythm, tile grid, table
   density, responsive breakpoints.
5. **Components**: KPI tile, table (header, row, subtotal, group row, numeric
   cell, link cell, sticky column), filter bar, form fields, buttons (primary,
   secondary, danger, inline row action), badge, callout, select-in-table,
   details/expander, pagination, empty state, chart container.
6. **Charts**: color assignment rules, grid and axis styling, legend
   placement, tooltip content, what to show when Chart.js is unavailable.
7. **Numbers and text**: formatting rules with examples, Norwegian copy tone
   (short, lowercase where natural, no exclamation marks).
8. **Don'ts**: a plain list.
9. **Checklist**: 10 yes/no questions to run on any new page.

Deliver DESIGN.md at the repo root, the research memo and mockups under
`docs/design/`, and if you touched CSS, keep it to `layout.tsx` and the view
files.
