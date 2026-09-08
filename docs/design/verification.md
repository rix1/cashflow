# Implementation verification · 2026-09-08

Branch: `web/design-system`, in a leased worktree at Treehouse's default root.
Rebased onto main `b2571dc` before implementation. Main's worktree and private
data were not modified. All commits use disabled GPG signing.

## Delivered

- [Paper ledger rules](../../DESIGN.md), [revised brief](../design-brief.md),
  [six reference notes](research.md) and [two direction frames](directions.svg).
- Shared tokens, system typography, wordmark, responsive navigation and clear
  focus states. Native HTML, Hono JSX, htmx and vendored Chart.js remain.
- Dashboard hierarchy, operating-income context, held-out links and median
  explanations. Stable category chart colors and an opaque sticky grid column.
- Quiet transaction controls, named filters, Escape/focus handling, inline save
  feedback and failure recovery. Category and one-off controls stay independent.
- Updated review and empty states, merchant charts and mortgage rate emphasis.
  No SQL, schema, categorization or financial formula changes.

## Checks passed

- `deno fmt`, `deno task check`, `deno task test`: 36 tests / 69 steps passed.
- `deno task serve --port 8765`, then a Deno fetch script: all nine navigation
  pages plus merchant detail returned 200 without error text. Server stopped
  after verification.
- Headless Chrome: all ten routes at 1440, 1280 and 390px; no uncaught script
  errors or document-level horizontal overflow. Tables scroll within the page.
- Browser interactions: category/owner multi-selection, Escape and focus,
  repeated query values through pagination, direction filtering, inline category
  save/reset, one-off on/off, focus restoration after row replacement, and a
  simulated HTTP 500 with visible error feedback and restored select value.
- Sticky category column while scrolling, empty transaction/dashboard states,
  unavailable Chart.js with readable tables, decimal mortgage-rate labels, and
  filter menus staying inside the viewport. Active mobile navigation is visible.
- Text-color contrast across neutral and tinted surfaces: minimum 4.75:1 for
  muted text; accent, positive, negative and warning text all exceed 4.5:1.
- Visual inspection of both proof pages, the phone transaction layout and the
  direction frames. This is a browser/contrast check, not a full screen-reader
  accessibility audit.

## Proof and local preview

These images use 391 invented transactions over 12 months and account owners
from `accounts.example.json`. They contain no household statement data.

- [Dashboard](proof/dashboard.png)
- [Transactions](proof/transactions.png)
- [Transactions on a phone](proof/transactions-mobile.png)

The leased worktree has a synthetic `accounts.json` and `cashflow.sqlite3`, both
gitignored. To view that existing preview from the worktree:

```sh
deno task serve --port 8765
```

Open `http://127.0.0.1:8765/?from=2025-09&to=2026-08` to match the dashboard
proof. A fresh checkout still uses the ordinary README import workflow; there
is no new production demo mode. The branch has not been merged into main.
