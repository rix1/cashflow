import type { FC } from "hono/jsx";
import { CATEGORY_BY_KEY } from "../../categorize/categories.ts";
import { monthLabel, nok } from "../format.ts";
import type { TxRow, VendorDetail, VendorRow } from "../queries.ts";
import {
  linearTrend,
  monthEnd,
  periodAverages,
  sparklinePoints,
  sparklineTrend,
  yearlyTrendPct,
} from "../stats.ts";
import {
  CategoryName,
  CHART_COLORS,
  ChartScript,
  Money,
  OwnerSelect,
} from "./layout.tsx";
import { TxTableRow } from "./transactions.tsx";
import { Logo } from "./logo.tsx";

const Sparkline: FC<{ values: number[] }> = ({ values }) => {
  const trend = sparklineTrend(values);
  return (
    <svg
      class="spark"
      viewBox="0 0 120 28"
      width="120"
      height="28"
      aria-hidden="true"
    >
      {trend && (
        <polyline
          points={trend}
          fill="none"
          stroke="var(--accent)"
          stroke-width="1"
          stroke-dasharray="3 2"
          opacity="0.7"
        />
      )}
      <polyline
        points={sparklinePoints(values)}
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
  );
};

const TrendLabel: FC<{ monthly: number[] }> = ({ monthly }) => {
  const pct = yearlyTrendPct(monthly);
  if (pct == null) return <span class="muted small">–</span>;
  const cls = Math.abs(pct) < 5 ? "muted" : pct > 0 ? "neg" : "pos";
  const arrow = Math.abs(pct) < 5 ? "→" : pct > 0 ? "↑" : "↓";
  return (
    <span class={`small ${cls}`} title="Endring per år relativt til snittnivå">
      {arrow} {Math.round(Math.abs(pct))} %/år
    </span>
  );
};

type ListProps = {
  rows: VendorRow[];
  total: number;
  months: string[];
  from: string;
  to: string;
  owner?: string;
  owners: string[];
  q: string;
  kind: string;
};

export const VendorsPage: FC<ListProps> = (
  { rows, total, months, from, to, owner, owners, q, kind },
) => {
  const fromDate = `${from}-01`;
  const toDate = monthEnd(to);
  const query = (m: string) =>
    `/vendors/${encodeURIComponent(m)}?from=${from}&to=${to}${
      owner ? `&owner=${encodeURIComponent(owner)}` : ""
    }`;
  return (
    <>
      <h1>Mottakere {owner ? `· ${owner}` : "· husholdning"}</h1>
      <p class="muted">
        Alle mottakere i perioden {monthLabel(from)} til {monthLabel(to)}{" "}
        ({months.length}{" "}
        mnd), sortert etter beløp. Snitt per uke, måned og år er regnet over
        hele perioden, ikke bare månedene med kjøp. Overføringer mellom egne
        kontoer er holdt utenfor.
      </p>
      <form class="filters" method="get" action="/vendors">
        <label>
          Søk
          <input
            type="search"
            name="q"
            value={q}
            placeholder="mottaker eller tekst"
          />
        </label>
        <label>
          Type
          <select name="kind">
            <option value="expense" selected={kind === "expense"}>
              utgifter
            </option>
            <option value="income" selected={kind === "income"}>
              inntekter
            </option>
            <option value="all" selected={kind === "all"}>alt</option>
          </select>
        </label>
        <label>
          Hvem
          <OwnerSelect owners={owners} value={owner} />
        </label>
        <label>
          Fra
          <input type="month" name="from" value={from} />
        </label>
        <label>
          Til
          <input type="month" name="to" value={to} />
        </label>
        <button type="submit">Vis</button>
        <a href="/vendors" class="muted small">nullstill</a>
      </form>
      <p class="muted small">
        Viser {rows.length} av {total}{" "}
        mottakere{q ? ` som matcher «${q}»` : ""}.
      </p>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Mottaker</th>
              <th>Kategori</th>
              <th class="num">Antall</th>
              <th class="num">Totalt</th>
              <th class="num">Per uke</th>
              <th class="num">Per mnd</th>
              <th class="num">Per år</th>
              <th>Trend</th>
              <th></th>
              <th>Første</th>
              <th>Siste</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colspan={11} class="empty-state">
                  <strong>Ingen mottakere i utvalget</strong>Prøv en annen
                  periode eller <a href="/vendors">nullstill filtrene</a>.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const avg = periodAverages(r.sum, fromDate, toDate);
              const trend = yearlyTrendPct(r.monthly);
              return (
                <tr>
                  <td>
                    <Logo merchant={r.merchant} />
                    <a href={query(r.merchant)}>{r.merchant}</a>
                    {r.owners.length > 1
                      ? <span class="muted small">· begge</span>
                      : owners.length > 1
                      ? <span class="muted small">· {r.owners[0]}</span>
                      : null}
                  </td>
                  <td class="small">
                    <CategoryName k={r.category_key} />
                  </td>
                  <td class="num">{r.count}</td>
                  <td class="num">
                    <Money value={r.sum} signed />
                  </td>
                  <td class="num">{nok(avg.weekly)}</td>
                  <td class="num">{nok(avg.monthly)}</td>
                  <td class="num">{nok(avg.yearly)}</td>
                  <td data-sort={trend == null ? undefined : trend}>
                    <Sparkline values={r.monthly} />
                  </td>
                  <td>
                    <TrendLabel monthly={r.monthly} />
                  </td>
                  <td class="nowrap small">{r.first}</td>
                  <td class="nowrap small">{r.last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

type DetailProps = {
  vendor: VendorDetail;
  months: string[];
  from: string;
  to: string;
  owner?: string;
  transactions: TxRow[];
  txTotal: number;
};

export const VendorPage: FC<DetailProps> = (
  { vendor, months, from, to, owner, transactions, txTotal },
) => {
  const fromDate = `${from}-01`;
  const toDate = monthEnd(to);
  const avg = periodAverages(vendor.sum, fromDate, toDate);
  const activeAvg = periodAverages(vendor.sum, vendor.first, vendor.last);
  const mags = vendor.monthly.map((v) => Math.abs(v));
  const trend = linearTrend(mags);
  const trendLine = trend
    ? mags.map((_, i) =>
      Math.max(0, Math.round(trend.intercept + trend.slope * i))
    )
    : [];
  const ownerQuery = owner ? `&owner=${encodeURIComponent(owner)}` : "";
  const chart = {
    type: "bar",
    data: {
      labels: months.map(monthLabel),
      datasets: [
        {
          label: vendor.sum < 0 ? "Utgift per måned" : "Beløp per måned",
          data: mags.map((v) => Math.round(v)),
          backgroundColor: vendor.sum < 0
            ? CHART_COLORS.expense
            : CHART_COLORS.income,
        },
        {
          label: "Trend",
          type: "line",
          data: trendLine,
          borderColor: CHART_COLORS.net,
          borderDash: [4, 3],
          pointRadius: 0,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  };
  return (
    <>
      <p class="small">
        <a href={`/vendors?from=${from}&to=${to}${ownerQuery}`}>
          ← alle mottakere
        </a>
      </p>
      <h1>
        <Logo merchant={vendor.merchant} size={28} />
        {vendor.merchant}
      </h1>
      <p class="muted">
        <CategoryName k={vendor.category_key} />
        {vendor.categories.length > 1 && (
          <span class="small" style="margin-left:4px">
            (også {vendor.categories.slice(1).map((c) =>
              `${
                CATEGORY_BY_KEY.get(c.category_key)?.name ?? c.category_key
              } ×${c.count}`
            ).join(", ")})
          </span>
        )} · {vendor.owners.join(" og ")} · periode {monthLabel(from)} til{" "}
        {monthLabel(to)}
      </p>
      <div class="tiles">
        <div class="tile">
          <div class="label">Totalt i perioden</div>
          <div class={`value ${vendor.sum < 0 ? "neg" : "pos"}`}>
            {nok(vendor.sum)}
          </div>
          <div class="sub">{vendor.count} transaksjoner</div>
        </div>
        <div class="tile">
          <div class="label">Per uke</div>
          <div class="value">{nok(avg.weekly)}</div>
          <div class="sub">over {months.length} mnd</div>
        </div>
        <div class="tile">
          <div class="label">Per måned</div>
          <div class="value">{nok(avg.monthly)}</div>
          <div class="sub">aktive mnd: {nok(activeAvg.monthly)}</div>
        </div>
        <div class="tile">
          <div class="label">Per år</div>
          <div class="value">{nok(avg.yearly)}</div>
          <div class="sub">
            {nok(vendor.sum / Math.max(1, vendor.count))} per kjøp
          </div>
        </div>
        <div class="tile">
          <div class="label">Trend</div>
          <div class="value">
            <TrendLabel monthly={vendor.monthly} />
          </div>
          <div class="sub">
            aktiv {vendor.first} → {vendor.last}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="chart">
          <canvas
            id="vendor-chart"
            role="img"
            aria-label="Beløp og trend per måned. Tallene finnes i tabellene nedenfor."
          >
          </canvas>
        </div>
        <ChartScript id="vendor-chart" config={chart} />
      </div>
      <div class="grid2">
        <div>
          <h2>Per år</h2>
          <table>
            <thead>
              <tr>
                <th>År</th>
                <th class="num">Totalt</th>
                <th class="num">Antall</th>
                <th class="num">Per mnd</th>
              </tr>
            </thead>
            <tbody>
              {vendor.yearly.map((y) => {
                const yFrom = y.year < from.slice(0, 4)
                  ? fromDate
                  : y.year === from.slice(0, 4)
                  ? fromDate
                  : `${y.year}-01-01`;
                const yTo = y.year === to.slice(0, 4)
                  ? toDate
                  : `${y.year}-12-31`;
                return (
                  <tr>
                    <td>{y.year}</td>
                    <td class="num">{nok(y.sum)}</td>
                    <td class="num">{y.count}</td>
                    <td class="num">
                      {nok(periodAverages(y.sum, yFrom, yTo).monthly)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div>
          <h2>Per måned</h2>
          <div class="tablewrap" style="max-height:320px; overflow:auto">
            <table>
              <thead>
                <tr>
                  <th>Måned</th>
                  <th class="num">Beløp</th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m, i) => {
                  const v = vendor.monthly[months.length - 1 - i];
                  return (
                    <tr>
                      <td data-sort={m}>
                        <a
                          href={`/transactions?merchant=${
                            encodeURIComponent(vendor.merchant)
                          }&from=${m}&to=${m}${ownerQuery}`}
                        >
                          {monthLabel(m)}
                        </a>
                      </td>
                      <td class="num">
                        {nok(v)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <h2>
        Transaksjoner{" "}
        <span class="muted small">
          siste {transactions.length} av {txTotal} ·{" "}
          <a
            href={`/transactions?merchant=${
              encodeURIComponent(vendor.merchant)
            }&from=${from}&to=${to}${ownerQuery}`}
          >
            alle
          </a>
        </span>
      </h2>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Dato</th>
              <th>Konto</th>
              <th>Mottaker / beskrivelse</th>
              <th class="num">Beløp</th>
              <th>Kategori</th>
            </tr>
          </thead>
          <tbody>{transactions.map((tx) => <TxTableRow tx={tx} />)}</tbody>
        </table>
      </div>
    </>
  );
};
