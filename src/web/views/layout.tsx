import type { Child, FC } from "hono/jsx";
import { CATEGORY_BY_KEY } from "../../categorize/categories.ts";
import { nok } from "../format.ts";
import { categoryOptions } from "../queries.ts";

export type Assets = { htmx: string; chart: string };

const NAV: [string, string][] = [
  ["/", "Oversikt"],
  ["/categories", "Kategorier"],
  ["/fixed", "Faste kostnader"],
  ["/mortgage", "Boliglån"],
  ["/transactions", "Transaksjoner"],
  ["/review", "Gjennomgang"],
  ["/rules", "Regler"],
  ["/data", "Data"],
];

const CSS = `
:root { --bg:#fafaf8; --fg:#1d1d1b; --muted:#6b6b66; --line:#e3e2dc; --card:#fff; --accent:#2f5d8a; --pos:#2f7d4f; --neg:#b3402f; --warn:#a1660f; --soft:#f1f0eb; }
* { box-sizing:border-box } body { margin:0; font:14px/1.45 -apple-system, "Inter", system-ui, sans-serif; color:var(--fg); background:var(--bg) }
header { display:flex; gap:18px; align-items:center; padding:10px 24px; background:#fff; border-bottom:1px solid var(--line); position:sticky; top:0; z-index:5 }
header .brand { font-weight:700; letter-spacing:.2px } header nav a { color:var(--muted); text-decoration:none; padding:6px 8px; border-radius:6px }
header nav a.active, header nav a:hover { color:var(--fg); background:var(--soft) }
main { max-width:1280px; margin:0 auto; padding:20px 24px 60px } h1 { font-size:22px; margin:0 0 12px } h2 { font-size:16px; margin:26px 0 8px } h3 { font-size:14px; margin:16px 0 6px }
.muted { color:var(--muted) } .small { font-size:12px } .right { text-align:right } .nowrap { white-space:nowrap }
.pos { color:var(--pos) } .neg { color:var(--neg) } .warn { color:var(--warn) }
.tiles { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:12px; margin:12px 0 }
.tile { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px } .tile .label { color:var(--muted); font-size:12px } .tile .value { font-size:22px; font-weight:600; margin-top:2px } .tile .sub { color:var(--muted); font-size:12px; margin-top:2px }
.card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; margin:12px 0 }
table { border-collapse:collapse; width:100%; background:var(--card); border:1px solid var(--line); border-radius:8px; overflow:hidden }
th, td { padding:6px 8px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top } th { background:var(--soft); font-weight:600; font-size:12px; color:var(--muted); white-space:nowrap }
td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap } tr:last-child td { border-bottom:none } tr.subtotal td { background:var(--soft); font-weight:600 }
tr.group-head td { background:#f7f6f2; font-weight:700; color:var(--accent) } .tablewrap { overflow-x:auto }
a { color:var(--accent) } a.cell { color:inherit; text-decoration:none; display:block } a.cell:hover { text-decoration:underline }
form.filters { display:flex; flex-wrap:wrap; gap:8px 12px; align-items:end; margin:8px 0 14px } form.filters label { display:flex; flex-direction:column; font-size:12px; color:var(--muted); gap:3px }
input, select, button { font:inherit; padding:5px 8px; border:1px solid var(--line); border-radius:6px; background:#fff } input[type=month] { min-width:130px }
button, .btn { cursor:pointer; background:var(--accent); color:#fff; border-color:var(--accent) } button.secondary { background:#fff; color:var(--fg); border-color:var(--line) } button.danger { background:#fff; color:var(--neg); border-color:var(--line) }
.badge { display:inline-block; font-size:11px; padding:1px 6px; border-radius:10px; background:var(--soft); color:var(--muted) } .badge.manual { background:#e8f0fb; color:var(--accent) } .badge.transfer { background:#eef7f0; color:var(--pos) } .badge.none { background:#fbeeea; color:var(--neg) }
.chart { position:relative; height:280px; margin:8px 0 } canvas { max-width:100% }
details summary { cursor:pointer; color:var(--muted) } .desc { max-width:360px } pre { white-space:pre-wrap; font-size:12px; background:var(--soft); padding:6px 8px; border-radius:6px; margin:6px 0 0 }
.inline-form { display:inline-flex; gap:6px; align-items:center } .callout { border-left:3px solid var(--warn); background:#fff8ec; padding:8px 12px; border-radius:6px; margin:10px 0 }
.pager { display:flex; gap:10px; margin:10px 0 } .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px } @media (max-width:900px) { .grid2 { grid-template-columns:1fr } }
select.cat { max-width:220px; font-size:12px; padding:3px 4px }
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
      <header>
        <span class="brand">💰 Cashflow</span>
        <nav>
          {NAV.map(([href, label]) => (
            <a href={href} class={active === href ? "active" : ""}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main>{children}</main>
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
      __html: `(function(){var cfg=${
        JSON.stringify(config)
      };function draw(){if(!window.Chart){document.getElementById(${
        JSON.stringify(id)
      }).insertAdjacentHTML('afterend','<p class="muted small">Chart.js ble ikke lastet (ingen nett?). Tabellene under viser samme tall.</p>');return;}new Chart(document.getElementById(${
        JSON.stringify(id)
      }),cfg);}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',draw);}else{draw();}})();`,
    }}
  />
);

export const PALETTE = [
  "#2f5d8a",
  "#b3402f",
  "#2f7d4f",
  "#a1660f",
  "#6a4c93",
  "#1b998b",
  "#c1666b",
  "#4f6d7a",
  "#8c7851",
  "#3d5a80",
  "#e07a5f",
  "#81b29a",
];
