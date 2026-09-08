import type { Child, FC } from "hono/jsx";
import { CATEGORY_BY_KEY } from "../../categorize/categories.ts";
import { nok } from "../format.ts";
import { categoryOptions } from "../queries.ts";

export type Assets = { htmx: string; chart: string };

export const MEDIAN_HINT =
  "Typisk måned: median av månedssummene i perioden. Måneder uten kjøp teller som 0, så et enkelt stort kjøp drar ikke tallet opp slik snittet gjør.";

const NAV: [string, string][] = [
  ["/", "Oversikt"],
  ["/categories", "Kategorier"],
  ["/vendors", "Mottakere"],
  ["/fixed", "Abonnementer"],
  ["/mortgage", "Boliglån"],
  ["/transactions", "Transaksjoner"],
  ["/review", "Gjennomgang"],
  ["/rules", "Regler"],
  ["/data", "Data"],
];

const CSS = `
:root {
  color-scheme:light;
  --bg:#f7f6f2; --card:#fff; --fg:#242c29; --muted:#626a65;
  --line:#dedfd7; --control:#8b958e; --soft:#efefe8;
  --accent:#245c50; --accent-soft:#e6efe9; --pos:#316548; --neg:#9b483b;
  --warn:#825c20; --warn-soft:#f6f0df; --negative-soft:#f7ece8;
  --chart-income:#678673; --chart-expense:#b27b68; --chart-net:#245c50;
  --chart-1:#678673; --chart-2:#b27b68; --chart-3:#6c8291;
  --chart-4:#ae9257; --chart-5:#8d7592; --chart-6:#5c9293;
  --chart-7:#a77582; --chart-8:#858958; --chart-9:#81776c;
  --font:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --text-small:12px; --text-body:14px; --text-section:17px;
  --text-title:28px; --text-value:28px;
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:24px; --space-6:32px; --space-7:48px;
  --radius:6px; --radius-card:10px;
}
* { box-sizing:border-box }
body { margin:0; font:var(--text-body)/1.5 var(--font); color:var(--fg); background:var(--bg) }
a { color:var(--accent); text-underline-offset:3px; text-decoration-thickness:1px }
a:hover { text-decoration-thickness:2px }
:focus-visible { outline:2px solid var(--accent); outline-offset:3px }
[hidden] { display:none !important }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; border:0 }
.skip-link { position:fixed; top:-100px; left:16px; padding:12px 16px; background:var(--card); z-index:30 }
.skip-link:focus { top:8px }
header { background:var(--bg); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:20 }
.header-inner { display:flex; gap:32px; align-items:center; max-width:1360px; margin:auto; padding:0 32px; min-height:72px }
.brand { display:inline-flex; align-items:center; gap:10px; font-size:20px; font-weight:600; letter-spacing:-.6px; text-decoration:none; color:var(--fg); flex-shrink:0 }
.brand-mark { display:flex; gap:3px; align-items:end; height:22px; width:22px; padding:2px; border-bottom:2px solid var(--accent) }
.brand-mark i { width:4px; height:11px; background:var(--accent) }
.brand-mark i:nth-child(2) { height:16px } .brand-mark i:nth-child(3) { height:7px }
header nav { display:flex; gap:4px; min-width:0; align-self:stretch; align-items:center }
header nav a { color:var(--muted); text-decoration:none; padding:24px 9px 21px; border-bottom:3px solid transparent; white-space:nowrap; font-size:13px }
header nav a.active { color:var(--accent); border-bottom-color:var(--accent); font-weight:600 }
header nav a:hover { color:var(--fg); background:var(--soft) }
main { max-width:1360px; margin:0 auto; padding:32px 32px 64px; min-width:0 }
h1 { font-size:var(--text-title); line-height:1.2; font-weight:600; letter-spacing:-.7px; margin:0 0 16px; overflow-wrap:anywhere }
h2 { font-size:var(--text-section); line-height:1.3; font-weight:600; margin:32px 0 12px }
h3 { font-size:var(--text-body); font-weight:600; margin:24px 0 8px }
p { margin:8px 0 16px } main > p.muted { max-width:90ch }
.muted { color:var(--muted) } .small { font-size:var(--text-small) } .right { text-align:right } .nowrap { white-space:nowrap; font-variant-numeric:tabular-nums }
.pos { color:var(--pos) } .neg { color:var(--neg) } .warn { color:var(--warn) }
.tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin:24px 0 }
.tile { min-width:0; background:var(--card); border:1px solid var(--line); border-radius:var(--radius-card); padding:20px }
.tile .label { color:var(--muted); font-size:var(--text-small); font-weight:500 }
.tile .value { font-size:var(--text-value); line-height:1.15; font-weight:600; letter-spacing:-.6px; margin-top:12px; font-variant-numeric:tabular-nums; overflow-wrap:anywhere }
.tile .sub { color:var(--muted); font-size:var(--text-small); margin-top:10px }
.tile.primary { background:var(--accent-soft); border-color:var(--accent-soft) } .tile.primary .value { font-size:36px }
.dashboard-tiles { grid-template-columns:1.5fr repeat(3,minmax(0,1fr)) }
.card { min-width:0; background:var(--card); border:1px solid var(--line); border-radius:var(--radius-card); padding:24px; margin:24px 0 }
.card > h2:first-child { margin-top:0 } .card > .tiles { margin:20px 0 }
.section-heading { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; margin-bottom:16px }
.section-heading h2, .section-heading p { margin:0 }
.tablewrap { max-width:100%; overflow:auto; border:1px solid var(--line); border-radius:var(--radius); background:var(--card) }
table { border-collapse:separate; border-spacing:0; width:100%; background:var(--card); border:1px solid var(--line); border-radius:var(--radius); font-size:13px }
.tablewrap > table { border:0; border-radius:0 }
th, td { padding:9px 12px; border-bottom:1px solid var(--line); text-align:left; vertical-align:middle }
th { background:var(--soft); font-weight:500; font-size:var(--text-small); color:var(--muted); white-space:nowrap }
td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap }
tr:last-child td { border-bottom:none } tbody tr:hover > td, tbody tr:focus-within > td { background:var(--bg) }
tr.subtotal td, tr.group-head td { background:var(--soft); font-weight:600; color:var(--fg) }
tr.group-head td { border-top:1px solid var(--line) }
td a { text-decoration:none } td a:hover, td a:focus-visible { text-decoration:underline }
a.cell { color:inherit; display:block; margin:-9px -12px; padding:9px 12px }
.category-grid th:first-child, .category-grid td:first-child { position:sticky; left:0; z-index:2; min-width:190px; background:var(--card); border-right:1px solid var(--line) }
.category-grid th:first-child, .category-grid tr.group-head td:first-child { background:var(--soft) }
.category-grid tr:hover td:first-child, .category-grid tr:focus-within td:first-child { background:var(--bg) }
.category-grid td.num { min-width:95px } .category-scroll { max-height:70vh }
.category-grid thead th { position:sticky; top:0; z-index:3 } .category-grid thead th:first-child { z-index:4 }
form.filters { display:flex; flex-wrap:wrap; gap:12px; align-items:end; margin:16px 0 24px; padding:16px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line) }
form.filters label, form.filters .field { display:flex; flex-direction:column; font-size:var(--text-small); color:var(--muted); gap:6px; min-width:0 }
form.filters > a { align-self:center; margin-top:20px }
input, select, button, .btn { font:inherit; color:var(--fg); padding:8px 10px; min-height:38px; border:1px solid var(--control); border-radius:var(--radius); background:var(--card); max-width:100% }
input[type=month] { min-width:136px; font-variant-numeric:tabular-nums } input[type=number] { font-variant-numeric:tabular-nums }
input[type=checkbox], input[type=radio] { min-height:0; width:16px; height:16px; margin:0 4px 0 0; accent-color:var(--accent); vertical-align:-3px; flex-shrink:0 }
button, .btn { cursor:pointer; background:var(--accent); color:var(--card); border-color:var(--accent); font-weight:500; text-decoration:none }
button:hover, .btn:hover { filter:brightness(.92) }
button.secondary, .btn.secondary { background:var(--card); color:var(--fg); border-color:var(--control) }
button.danger { background:var(--card); color:var(--neg); border-color:var(--control) }
button.small { padding:4px 8px; min-height:28px; font-size:11px } button:disabled { opacity:.6; cursor:wait }
.segmented { display:inline-flex; border:1px solid var(--control); border-radius:var(--radius); background:var(--card) }
form.filters .segmented label { flex-direction:row; gap:0; cursor:pointer; position:relative }
.segmented input { position:absolute; opacity:0; width:1px; height:1px }
.segmented span { padding:8px 12px; line-height:20px; font-size:13px; color:var(--muted) }
.segmented label:first-child span { border-radius:5px 0 0 5px } .segmented label:last-child span { border-radius:0 5px 5px 0 }
.segmented input:checked + span { background:var(--accent); color:var(--card) }
.segmented input:focus-visible + span { outline:2px solid var(--accent); outline-offset:3px }
details.multi { position:relative }
details.multi summary { position:relative; list-style:none; cursor:pointer; padding:8px 28px 8px 10px; border:1px solid var(--control); border-radius:var(--radius); background:var(--card); color:var(--fg); font-size:14px; line-height:20px; min-width:140px; max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
details.multi summary::-webkit-details-marker { display:none } details.multi summary::after { content:"⌄"; position:absolute; right:10px; top:7px; color:var(--muted) }
details.multi[open] summary { border-color:var(--accent) }
.multi-menu { position:absolute; top:calc(100% + 6px); left:0; z-index:15; width:max-content; min-width:240px; max-width:min(360px,calc(100vw - 40px)); max-height:320px; overflow:auto; background:var(--card); border:1px solid var(--control); border-radius:var(--radius); padding:8px }
.multi-group { padding:12px 8px 4px; font-size:var(--text-small); font-weight:600; color:var(--muted) }
form.filters .multi-menu label { flex-direction:row; align-items:center; gap:8px; padding:7px 8px; border-radius:3px; color:var(--fg); font-size:13px; cursor:pointer }
.multi-menu label:hover, .multi-menu label:focus-within { background:var(--soft) } .multi-menu input { margin:0 }
.badge { display:inline-block; font-size:11px; line-height:1.5; padding:2px 7px; border-radius:4px; background:var(--soft); color:var(--muted); white-space:nowrap }
.badge.manual { background:var(--accent-soft); color:var(--accent) } .badge.transfer { background:var(--soft); color:var(--muted) }
.badge.none, .badge.oneoff { background:var(--warn-soft); color:var(--warn) } tr.oneoff td { color:var(--muted) }
.chart { position:relative; height:280px; margin:8px 0 } .chart.unavailable { height:auto; min-height:0 } canvas { max-width:100% }
details summary { cursor:pointer; color:var(--muted) } .desc { max-width:380px; min-width:220px; overflow-wrap:anywhere }
.desc > a { color:var(--fg); font-weight:500 } .desc summary { margin-top:3px; max-width:360px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.desc details[open] summary { white-space:normal; overflow-wrap:anywhere }
pre { white-space:pre-wrap; overflow-wrap:anywhere; font-size:var(--text-small); background:var(--soft); padding:12px; border-radius:var(--radius); margin:8px 0 0 }
.inline-form { display:inline-flex; gap:8px; align-items:center }
select.cat { width:190px; max-width:220px; font-size:12px; min-height:32px; padding:5px 8px; background:transparent; border-color:transparent }
tr:hover select.cat, tr:focus-within select.cat { background:var(--card); border-color:var(--control) }
.review-table select.cat { border-color:var(--control); background:var(--card) }
.callout { border-left:2px solid var(--warn); background:var(--warn-soft); padding:12px 16px; border-radius:0 var(--radius) var(--radius) 0; margin:16px 0 }
.review-note { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px 24px; align-items:center; padding:12px 0; margin:0 0 24px; border-bottom:1px solid var(--line); color:var(--muted); font-size:13px }
.empty-state { padding:32px 24px; text-align:center; color:var(--muted) } .empty-state strong { display:block; color:var(--fg); font-weight:500; margin-bottom:8px }
.pager { display:flex; justify-content:center; gap:16px; align-items:center; margin:24px 0 }
.pager a { padding:8px 12px; border:1px solid var(--control); border-radius:var(--radius); text-decoration:none; background:var(--card) }
.grid2 { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:24px } .grid2 > * { min-width:0 }
.selected-rate td { background:var(--accent-soft); font-weight:600 }
.save-status { position:fixed; right:24px; bottom:24px; z-index:25; max-width:calc(100vw - 48px); background:var(--card); border:1px solid var(--control); border-radius:var(--radius); padding:12px 16px } .save-status:empty { display:none }
svg.spark { display:block; color:var(--chart-9) }
img.logo { border-radius:5px; vertical-align:-5px; margin-right:8px; background:var(--soft); object-fit:contain }
@media (max-width:1100px) {
  .header-inner { flex-wrap:wrap; gap:0; padding-top:16px }
  header nav { flex-basis:100%; overflow-x:auto } header nav a { padding:14px 10px 11px }
  .dashboard-tiles { grid-template-columns:repeat(2,minmax(0,1fr)) }
}
@media (max-width:900px) { .grid2 { grid-template-columns:minmax(0,1fr) } }
@media (max-width:600px) {
  .header-inner { padding:12px 16px 0 } .brand { font-size:18px } header nav { margin-top:4px }
  main { padding:24px 16px 48px } h1 { font-size:24px }
  .tiles, .dashboard-tiles { grid-template-columns:minmax(0,1fr) } .tile { padding:20px }
  .card { padding:16px } .chart { height:240px }
  form.filters > label, form.filters > .field { flex:1 1 140px }
  form.filters input:not([type=checkbox]):not([type=radio]), form.filters select { width:100%; min-width:0 }
  details.multi summary { max-width:100%; min-width:0 }
  .category-grid th:first-child, .category-grid td:first-child { min-width:145px; max-width:170px }
  .inline-form { gap:6px } .pager { gap:10px; font-size:12px }
}
@media print { header, form.filters, .skip-link, .save-status { display:none } main { padding:0 } .tablewrap { overflow:visible } }
`;

export const Layout: FC<
  { title: string; active: string; assets: Assets; children?: Child }
> = ({ title, active, assets, children }) => (
  <html lang="nb">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title} · Cashflow</title>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script src={assets.htmx} defer></script>
      <script src={assets.chart}></script>
    </head>
    <body>
      <a class="skip-link" href="#main">Hopp til innhold</a>
      <header>
        <div class="header-inner">
          <a class="brand" href="/" aria-label="Cashflow · oversikt">
            <span class="brand-mark" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
            Cashflow
          </a>
          <nav aria-label="Hovedmeny">
            {NAV.map(([href, label]) => (
              <a
                href={href}
                class={active === href ? "active" : ""}
                aria-current={active === href ? "page" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" tabindex={-1}>{children}</main>
      <div
        class="save-status"
        id="save-status"
        role="status"
        aria-live="polite"
      >
      </div>
      <script dangerouslySetInnerHTML={{ __html: MULTI_SCRIPT }} />
    </body>
  </html>
);

export const Money: FC<
  { value: number | null | undefined; decimals?: boolean; signed?: boolean }
> = ({ value, decimals, signed }) => {
  if (value == null) return <span class="muted">–</span>;
  const cls = value > 0 ? "pos" : value < 0 ? "neg" : "muted";
  return <span class={signed ? cls : ""}>{nok(value, decimals)}</span>;
};

export const CategorySelect: FC<
  {
    name: string;
    value?: string;
    class?: string;
    includeEmpty?: boolean;
    attrs?: Record<string, string>;
  }
> = (
  { name, value, class: cls, includeEmpty, attrs },
) => (
  <select name={name} class={cls ?? "cat"} {...(attrs ?? {})}>
    {includeEmpty ? <option value="">– alle –</option> : null}
    {categoryOptions().map(({ group, categories }) => (
      <optgroup label={group}>
        {categories.map((c) => (
          <option value={c.key} selected={c.key === value}>
            {c.name}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
);

export const CategoryName: FC<{ k: string }> = ({ k }) => (
  <span>{CATEGORY_BY_KEY.get(k)?.name ?? k}</span>
);

export const OwnerSelect: FC<
  { owners: string[]; value?: string; name?: string }
> = ({ owners, value, name = "owner" }) => (
  <select name={name}>
    <option value="">husholdning</option>
    {owners.map((o) => (
      <option value={o} selected={o === value}>
        {o}
      </option>
    ))}
  </select>
);

export type MultiOption = { value: string; label: string };
export type MultiGroup = { label?: string; options: MultiOption[] };

/**
 * Checkbox dropdown that submits one `name=value` per checked option.
 * Nothing checked means "no filter", which the summary text mirrors.
 * MULTI_SCRIPT keeps the summary in sync and closes the menu on outside click.
 */
export const MultiSelect: FC<
  {
    name: string;
    groups: MultiGroup[];
    label: string;
    selected?: string[];
    emptyLabel?: string;
  }
> = ({ name, groups, label, selected = [], emptyLabel = "alle" }) => {
  const chosen = groups
    .flatMap((g) => g.options)
    .filter((o) => selected.includes(o.value));
  const summary = chosen.length === 0
    ? emptyLabel
    : chosen.length <= 2
    ? chosen.map((o) => o.label).join(", ")
    : `${chosen.length} valgt`;
  return (
    <details class="multi" data-empty={emptyLabel} data-label={label}>
      <summary
        aria-label={`${label}: ${summary}`}
        title={chosen.map((o) => o.label).join(", ")}
      >
        {summary}
      </summary>
      <div class="multi-menu">
        {groups.map((g) => (
          <>
            {g.label ? <div class="multi-group">{g.label}</div> : null}
            {g.options.map((o) => (
              <label>
                <input
                  type="checkbox"
                  name={name}
                  value={o.value}
                  checked={selected.includes(o.value)}
                />
                {o.label}
              </label>
            ))}
          </>
        ))}
      </div>
    </details>
  );
};

const MULTI_SCRIPT = `(function(){
const nav = document.querySelector('header nav');
const active = nav.querySelector('[aria-current="page"]');
if (active && nav.scrollWidth > nav.clientWidth) {
  nav.scrollLeft = active.offsetLeft - nav.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
}
function update(d) {
  const chosen = Array.from(d.querySelectorAll('input:checked'), i => i.parentElement.textContent.trim());
  const label = !chosen.length ? d.dataset.empty : chosen.length <= 2 ? chosen.join(', ') : chosen.length + ' valgt';
  const summary = d.querySelector('summary');
  summary.textContent = label;
  summary.title = chosen.join(', ');
  summary.setAttribute('aria-label', d.dataset.label + ': ' + label);
}
function position(d) {
  const menu = d.querySelector('.multi-menu');
  menu.style.left = '0px';
  const right = menu.getBoundingClientRect().right;
  menu.style.left = Math.min(0, innerWidth - 16 - right) + 'px';
}
document.addEventListener('change', e => {
  const d = e.target.closest('details.multi');
  if (d) update(d);
});
document.addEventListener('toggle', e => {
  if (e.target.matches('details.multi[open]')) position(e.target);
}, true);
window.addEventListener('resize', () => document.querySelectorAll('details.multi[open]').forEach(position));
for (const event of ['click', 'focusin']) document.addEventListener(event, e => {
  document.querySelectorAll('details.multi[open]').forEach(d => {
    if (!d.contains(e.target)) d.open = false;
  });
});
document.addEventListener('keydown', e => {
  const d = e.target.closest('details.multi[open]');
  if (e.key === 'Escape' && d) {
    d.open = false;
    d.querySelector('summary').focus();
    e.preventDefault();
  }
});
const pending = new WeakMap();
const status = document.getElementById('save-status');
let timer;
function announce(message, clear = false) {
  clearTimeout(timer);
  status.textContent = message;
  if (clear) timer = setTimeout(() => status.textContent = '', 4500);
}
document.addEventListener('htmx:beforeRequest', e => {
  const row = e.detail.elt.closest('tr[id^="tx-"]');
  if (!row) return;
  const focus = document.activeElement;
  pending.set(e.detail.xhr, { row: row.id, focus: row.contains(focus) ? focus : null });
  announce('Lagrer endringen …');
});
document.addEventListener('htmx:afterSwap', e => {
  const state = pending.get(e.detail.xhr);
  if (!state || !state.focus || state.focus.isConnected) return;
  const row = document.getElementById(state.row);
  const next = document.getElementById(state.focus.id) || row?.querySelector('select');
  if (document.activeElement === document.body) next?.focus({ preventScroll: true });
});
document.addEventListener('htmx:afterRequest', e => {
  const state = pending.get(e.detail.xhr);
  if (!state) return;
  if (e.detail.successful) announce('Endringen er lagret.', true);
  else {
    const select = document.getElementById(state.row)?.querySelector('select[data-saved-value]');
    if (select) select.value = select.dataset.savedValue;
    announce('Endringen ble ikke lagret. Prøv igjen.');
  }
});
})();`;

export const PeriodFilters: FC<
  { from: string; to: string; owner?: string; owners: string[]; action: string }
> = ({ from, to, owner, owners, action }) => (
  <form class="filters" method="get" action={action}>
    <label>
      Fra
      <input type="month" name="from" value={from} />
    </label>
    <label>
      Til
      <input type="month" name="to" value={to} />
    </label>
    <label>
      Hvem
      <OwnerSelect owners={owners} value={owner} />
    </label>
    <button type="submit">Vis</button>
  </form>
);

/** Embeds JSON for a chart and the script that draws it once Chart.js has loaded. */
export const ChartScript: FC<{ id: string; config: unknown }> = (
  { id, config },
) => (
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){const id=${JSON.stringify(id)};const cfg=${
        JSON.stringify(config).replaceAll("<", "\\u003c")
      };${CHART_SCRIPT}})();`,
    }}
  />
);

const CHART_SCRIPT = `
function draw() {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  function fallback(message) {
    canvas.hidden = true;
    canvas.parentElement.classList.add('unavailable');
    const note = document.createElement('p');
    note.className = 'muted small';
    note.textContent = message;
    canvas.after(note);
  }
  if (!window.Chart) {
    fallback('Diagrammet er utilgjengelig. Tallene finnes i tabellene nedenfor.');
    return;
  }
  if (!cfg.data.datasets.length || !cfg.data.datasets.some(d => d.data.length)) {
    fallback('Ingen tall å vise i diagrammet for denne perioden.');
    return;
  }
  const styles = getComputedStyle(document.documentElement);
  const token = name => styles.getPropertyValue(name).trim();
  const color = value => typeof value === 'string' && value.startsWith('var(')
    ? token(value.slice(4, -1)) : value;
  const number = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
  Chart.defaults.font.family = token('--font');
  Chart.defaults.font.size = 12;
  Chart.defaults.color = token('--muted');
  Chart.defaults.animation = false;
  cfg.data.datasets.forEach(d => {
    d.backgroundColor = color(d.backgroundColor);
    d.borderColor = color(d.borderColor);
    d.pointStyle = d.type === 'line' ? 'line' : 'rectRounded';
    if (d.type === 'line') {
      d.order ??= -1;
      d.borderWidth = 2;
      d.pointRadius ??= 2;
    } else {
      d.borderRadius = 3;
      d.maxBarThickness = 32;
    }
  });
  const opts = cfg.options ||= {};
  opts.locale = 'nb-NO';
  opts.interaction = { mode: 'index', intersect: false };
  opts.plugins ||= {};
  opts.plugins.legend = {
    position: 'bottom', align: 'start',
    labels: { usePointStyle: true, boxWidth: 10, boxHeight: 8, padding: 20 }
  };
  opts.plugins.tooltip = {
    backgroundColor: token('--fg'), padding: 12, cornerRadius: 6,
    callbacks: { label: c => c.dataset.label + ': ' + number.format(c.parsed.y) + ' kr' }
  };
  opts.scales ||= {};
  opts.scales.x = { ...opts.scales.x, grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0 } };
  opts.scales.y = { ...opts.scales.y, border: { display: false },
    grid: { color: token('--line'), drawTicks: false },
    ticks: { padding: 12, callback: value => number.format(value) }
  };
  new Chart(canvas, cfg);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw);
else draw();
`;

export const CHART_COLORS = {
  income: "var(--chart-income)",
  expense: "var(--chart-expense)",
  net: "var(--chart-net)",
};

export const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
];
