# Reference notes · 2026-09-08

Short review of six public product/documentation pages, not signed-in product
audits. The takeaways below are design interpretations, not claims about every
screen of these products.

| Reference | Pattern to borrow | Keep out of Cashflow |
| --- | --- | --- |
| [Actual Budget](https://actualbudget.org/) | A transaction-focused workflow: keep categorization near the row and reports near their underlying ledger. | Budget allocation controls that this tool does not support. |
| [Copilot Money](https://www.copilot.money/) | Separate transaction detail, recurring spending and cash-flow summaries; show a number with its purpose and period. | Its abundance of category emoji and lifestyle imagery. |
| [Stripe Dashboard basics](https://docs.stripe.com/dashboard/basics) | Summaries, reports and task actions have distinct roles; keep filters and drill-downs explicit. | Product-switcher and business administration chrome. |
| [Linear](https://linear.app/features) | Separate planning, work and insights; a task table benefits from consistent rows and restrained hierarchy. | The product marketing page's repeated visual treatments and motion. |
| [DNB Mobilbank](https://www.dnb.no/dagligbank/mobilbank) | Familiar Norwegian terms, searchable transactions and a clear distinction between spending and recurring bills. | Banking actions such as payment or account opening. |
| [SSB consumer price index](https://www.ssb.no/en/priser-og-prisindekser/konsumpriser/statistikk/konsumprisindeksen) | Put period, unit and explanation next to data; tables remain a first-class way to inspect chart values. | Statistical publishing metadata unrelated to a household decision. |

Calm comes from a predictable reading order: context, number, explanation,
then detail. Density is useful when columns align and the same action sits in
the same place on every row. Clutter comes from giving every card, badge,
button and amount equal visual emphasis. Cashflow already has a sensible
information architecture; the strongest improvement is to make the operating
monthly remainder the first read, and let the financial tables keep their detail.
Use pale surfaces to group, thin rules to align, and color sparingly for meaning.
Give notes a next action and table controls a strong focus state. Keep the existing
merchant identity cues, but avoid adding decorative category iconography.

## Recommended direction: Paper ledger

Warm paper (`#f7f6f2`), charcoal ink (`#242c29`), teal interaction (`#245c50`).
System sans, compact ledger rows, one pale-teal headline tile. Cashflow is a
plain wordmark with a small ledger mark, replacing the emoji. The implemented
dashboard and transactions page are the proof frames; see `DESIGN.md` for rules.

## Alternative: Graphite ledger

Cooler white (`#f6f7f8`), graphite (`#252a30`), slate interaction (`#425c73`).
The same rows and hierarchy, tighter square corners and an unadorned wordmark.
This is appropriate for an office reporting tool; Paper ledger better fits the
brief's warm, occasional household-review setting. No dark theme in this pass.
