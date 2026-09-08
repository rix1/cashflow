# Cashflow · Paper ledger

Implementation contract, 2026-09-08. Scope and revision:
[design brief](docs/design-brief.md). Reference notes and alternative:
[research](docs/design/research.md).

## Principles

- Give the decision one headline; leave the underlying numbers nearby.
- Use warm neutrals for structure, teal for interaction, color for meaning.
- Keep tables compact and decisions spacious. Align every amount to the right.
- Name the basis of a number: operating income, observed spending or estimate.
- Keep navigation, queries, categorization and calculations intact.

## Tokens

The CSS block in `src/web/views/layout.tsx` is the implementation source. Use
semantic variables so a future dark theme can replace surfaces and ink.

```css
:root {
  color-scheme: light;
  --bg: #f7f6f2;
  --card: #ffffff;
  --fg: #242c29;
  --muted: #626a65;
  --line: #dedfd7;
  --control: #8b958e;
  --soft: #efefe8;
  --accent: #245c50;
  --accent-soft: #e6efe9;
  --pos: #316548;
  --neg: #9b483b;
  --warn: #825c20;
  --warn-soft: #f6f0df;
  --negative-soft: #f7ece8;
  --chart-income: #678673;
  --chart-expense: #b27b68;
  --chart-net: #245c50;
  --chart-1: #678673;
  --chart-2: #b27b68;
  --chart-3: #6c8291;
  --chart-4: #ae9257;
  --chart-5: #8d7592;
  --chart-6: #5c9293;
  --chart-7: #a77582;
  --chart-8: #858958;
  --chart-9: #81776c;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --text-small: 12px;
  --text-body: 14px;
  --text-section: 17px;
  --text-title: 28px;
  --text-value: 28px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --radius: 6px;
  --radius-card: 10px;
}
```

## Typography and layout

- Use the local system stack; no font downloads. Body 14/1.5, small 12/1.5.
- Page titles 28/1.2 at 600; section titles 17/1.3 at 600. No all-caps headings.
- KPI values 28/1.15 at 600; the main decision 36px. Use tabular numerals on
  values, amounts, dates and numerical form fields, not a monospace body font.
- Keep the `Cashflow` wordmark at 20px with a small, plain ledger mark. Remove
  the money-bag emoji. The wordmark links to the dashboard.
- Keep all nine navigation destinations and their order. Active navigation has
  an underline and `aria-current`; a skip link goes to main content.
- Main width 1360px, gutters 32px, bottom space 64px. Sections have 32px rhythm.
- KPI tiles use a responsive grid with a 180px minimum. Dashboard headline gets
  extra width on desktop; use one column below 600px. Never truncate amounts.
- Below 1100px let navigation occupy its own row. Below 600px use 16px gutters
  and horizontally scroll navigation and tables, never the entire page.

## Components

- **KPI:** small muted label, large value, small explanation. Quiet white tile;
  only the primary decision receives a pale teal surface. Keep positive expense
  magnitudes neutral; negative balances retain a minus sign and negative ink.
- **Dashboard:** headline “Igjen etter utgifter / mnd”; explain operating income
  minus expenses. Show income, expenses and saving transfers alongside it. Put
  uncategorized work in a compact note, not a competing headline KPI.
- **Operating view:** keep held-out money and drill-down links visible. Show
  typical-month medians beside averages; one-offs stay in the ledger with an
  explicit badge and reversible action. Keep both review queues.
- **Table:** white surface, 9px/12px cells, quiet horizontal rules, 12px medium
  headers. Hover/focus-within highlights the row; links stay distinguishable.
- **Category grid:** explicit horizontal scroll region with keyboard focus,
  sticky first column on an opaque surface, bold group totals. Cells with no
  transactions show a dash with accessible text; a real zero displays `0`.
- **Number cells:** right align and never wrap. Cell links fill the cell and
  underline on hover/focus. Group/subtotal rows use neutral fills, not accent
  ink.
- **Filters:** labels above controls, 38px minimum height, wrapping rows and
  consistent gaps. Multi-select summaries include field labels for assistive
  technology; selected counts remain visible. Escape closes and restores focus.
- **Fields/buttons:** visible neutral border; 2px teal focus ring with 3px gap.
  Primary is teal/white, secondary white/ink, destructive white/negative ink.
  Checkbox/radio accent is teal. Do not hide an input's keyboard focus.
- **Inline categories:** readable native select, transparent background at rest;
  show a control border on row hover or focus. Pair with a small text source
  badge. Name the merchant in the select's accessible label.
- **Save feedback:** keep the category field focused after htmx replaces a row.
  Announce successful saves and errors in a live status region; failed saves
  must not look successful. Preserve the inline reset action.
- **Details:** use native `details`; quiet description summary, inset wrapping
  text when open. Never truncate the expanded bank description or message.
- **Review:** consistent select/action placement, explicit “Lagre regel”, label
  each select with its merchant, and show a useful completion state when empty.
- **Callout:** amber text label and pale warm fill with a slim rule. Explain the
  gap and link to the next action. Do not use red for missing data.
- **Mortgage:** keep inputs, result and sensitivity together; highlight the
  chosen-rate row with text and a pale surface. Promote new-loan headroom.
- **Merchant:** keep logos small, period-average explanations visible, and
  trends labeled with arrows/text as well as sparklines.
- **Pagination:** bordered links, current/total page text, retained filter
  values.
- **Empty state:** one clear sentence and a relevant action; no empty decorative
  chart or blank table. A missing chart must leave its data table available.

## Charts

- Keep Chart.js. Read color/font tokens from the same CSS used by the page.
- Income uses sage, spending clay, net a dark teal line with points. Legends
  name each series and use line/point shapes as well as color.
- Category colors follow the stable group order, never the filtered row index.
  Use the nine muted categorical tokens; labels and tables resolve similar hues.
- Use thin horizontal grid lines, no vertical grid, no canvas border, no default
  animation. Legends below and left, chart height 280px (240px on phones).
- Norwegian axis numbers; tooltips add `kr`. Existing rounded chart values stay
  unchanged. Avoid string placeholders where Chart.js requires a callback.
- Canvas has an accessible label referring to the adjacent table. If the library
  is unavailable, replace the empty canvas with a short note pointing to the
  table.

## Numbers and text

- `12 450` for summary kroner, `-1 249,50` in transaction rows, `24 %` for
  rates. Use existing `nok`/`pct`; identify NOK in page context, not every table
  cell.
- Preserve signed values. A labeled expense KPI may show a positive magnitude;
  transaction and category cells must retain their sign. Missing is `–`, zero
  `0`.
- Norwegian bokmål, short factual labels, sentence case, no exclamation marks.
- Operating income is salary, interest and employer refunds, consistently across
  tiles, charts and mortgage calculations. Keep observed spending and cadence
  estimates visibly distinct; styling must not imply estimate precision.

## Don'ts

No gradients, shadows, glass, decorative illustrations, external fonts, new
frameworks, nav reorganization, color-only states, invented financial data in
production, or changes to import/categorization/SQL rules as part of this pass.

## Checklist

1. Is the primary decision obvious and its calculation basis named?
2. Are data and calculations unchanged by the presentation?
3. Are the period, owner and units clear?
4. Are text colors at least 4.5:1 on their surfaces?
5. Can every control be operated with visible keyboard focus?
6. Are amounts aligned, tabular and signed correctly?
7. Do tables scroll inside the page, with a sticky category column?
8. Do filters, pagination and htmx saves retain their behavior?
9. Do empty results and unavailable charts have useful text?
10. Have laptop and phone layouts been checked using synthetic data?
