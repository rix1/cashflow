import type { FC } from "hono/jsx";
import { CATEGORY_BY_KEY } from "../../categorize/categories.ts";
import { monthLabel, monthsBetween, nok, pct } from "../format.ts";
import type {
  Averages,
  CategoryTotal,
  Gap,
  HeldOut,
  MonthlyFlow,
} from "../queries.ts";
import {
  CHART_COLORS,
  ChartScript,
  MEDIAN_HINT,
  Money,
  PeriodFilters,
} from "./layout.tsx";

type Props = {
  from: string;
  to: string;
  owner?: string;
  owners: string[];
  flows: MonthlyFlow[];
  averages: Averages;
  heldOut: HeldOut;
  topCategories: (CategoryTotal & { median: number })[];
  gaps: Gap[];
  uncategorized: { count: number; sum: number };
};

export const Dashboard: FC<Props> = (
  {
    from,
    to,
    owner,
    owners,
    flows,
    averages,
    heldOut,
    topCategories,
    gaps,
    uncategorized,
  },
) => {
  const months = monthsBetween(from, to);
  const byMonth = new Map<
    string,
    { income: number; expense: number; saving: number }
  >();
  for (const m of months) byMonth.set(m, { income: 0, expense: 0, saving: 0 });
  for (const f of flows) {
    const row = byMonth.get(f.month)!;
    row.income += f.income;
    row.expense += f.expense;
    row.saving += f.saving;
  }
  const savingsRate = averages.income > 0
    ? averages.net / averages.income
    : null;
  const ownerQuery = owner ? `&owner=${encodeURIComponent(owner)}` : "";
  const periodQuery = `from=${from}&to=${to}${ownerQuery}`;
  const gapsInPeriod = gaps.filter((g) =>
    g.to >= `${from}-01` && g.from <= `${to}-31`
  );

  const chart = {
    type: "bar",
    data: {
      labels: months.map(monthLabel),
      datasets: [
        {
          label: "Inntekt",
          data: months.map((m) => Math.round(byMonth.get(m)!.income)),
          backgroundColor: CHART_COLORS.income,
        },
        {
          label: "Utgifter",
          data: months.map((m) => Math.round(-byMonth.get(m)!.expense)),
          backgroundColor: CHART_COLORS.expense,
        },
        {
          label: "Netto",
          type: "line",
          data: months.map((m) =>
            Math.round(byMonth.get(m)!.income + byMonth.get(m)!.expense)
          ),
          borderColor: CHART_COLORS.net,
          backgroundColor: CHART_COLORS.net,
          tension: 0.2,
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
      <h1>Oversikt {owner ? `· ${owner}` : "· husholdning"}</h1>
      <p class="muted">
        Inntekter, utgifter og rommet imellom. Alle beløp i kroner.
      </p>
      <PeriodFilters
        from={from}
        to={to}
        owner={owner}
        owners={owners}
        action="/"
      />
      {gapsInPeriod.length > 0 && (
        <div class="callout">
          Mangler data i perioden:{" "}
          {gapsInPeriod.map((g) =>
            `${g.account.owner} ${g.account.bank} ${g.account.name} (${g.from} → ${g.to})`
          ).join(", ")}. Tallene for de månedene er for lave.{" "}
          <a href="/data">Detaljer</a>
        </div>
      )}
      <div class="tiles dashboard-tiles">
        <div class="tile primary">
          <div class="label">Igjen etter utgifter / mnd</div>
          <div class={`value ${averages.net < 0 ? "neg" : ""}`}>
            {nok(averages.net)}
          </div>
          <div class="sub">
            inntekt minus utgifter · sparerate {pct(savingsRate)}
          </div>
        </div>
        <div class="tile">
          <div class="label">Inntekt / mnd</div>
          <div class="value">{nok(averages.income)}</div>
          <div class="sub">
            lønn, renter og refusjoner · snitt over {averages.months} mnd
          </div>
        </div>
        <div class="tile">
          <div class="label">Utgifter / mnd</div>
          <div class="value">{nok(-averages.expense)}</div>
          <div class="sub">hvorav boliglån {nok(-averages.mortgage)}</div>
        </div>
        <div class="tile">
          <div class="label">Til sparing / mnd</div>
          <div class="value">{nok(-averages.saving)}</div>
          <div class="sub">netto flyttet til sparekontoer</div>
        </div>
      </div>
      <div class="review-note">
        <span>
          {uncategorized.count} ukategoriserte transaksjoner ·{" "}
          {nok(uncategorized.sum)} kr
        </span>
        <a
          href={`/review${owner ? `?owner=${encodeURIComponent(owner)}` : ""}`}
        >
          Gå til gjennomgang →
        </a>
      </div>
      <p class="muted small">
        Holdt utenfor driften: annen inntekt{" "}
        <a href={`/transactions?category=income%3Aother&${periodQuery}`}>
          {heldOut.otherIncome.count} poster, {nok(heldOut.otherIncome.sum)}
        </a>{" "}
        · engangsposter{" "}
        <a href={`/transactions?oneoff=1&${periodQuery}`}>
          {heldOut.oneOff.count} poster, {nok(heldOut.oneOff.sum)}
        </a>{" "}
        · utlegg for andre og annet utenfor{" "}
        <a href={`/transactions?group=Utenfor&${periodQuery}`}>
          {heldOut.outside.count} poster, netto {nok(heldOut.outside.sum)}
        </a>. Sparing og overføringer mellom egne kontoer telles ikke som
        inntekt eller utgift.
      </p>

      <div class="card">
        <div class="section-heading">
          <h2>Inntekter og utgifter</h2>
          <span class="muted small">Per måned · kr</span>
        </div>
        {flows.length === 0
          ? (
            <p class="empty-state">
              Ingen transaksjoner i perioden.{" "}
              <a href="/data">Se data og import</a>.
            </p>
          )
          : (
            <>
              <div class="chart">
                <canvas
                  id="flow-chart"
                  role="img"
                  aria-label="Inntekt, utgifter og netto per måned. Tallene står i tabellen Per måned nedenfor."
                >
                </canvas>
              </div>
              <ChartScript id="flow-chart" config={chart} />
            </>
          )}
      </div>

      <div class="grid2">
        <div>
          <h2>Per måned</h2>
          <div class="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Måned</th>
                  <th class="num">Inntekt</th>
                  <th class="num">Utgifter</th>
                  <th class="num">Netto</th>
                  <th class="num">Sparing</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const r = byMonth.get(m)!;
                  return (
                    <tr>
                      <td>
                        <a
                          href={`/transactions?from=${m}&to=${m}${ownerQuery}`}
                        >
                          {monthLabel(m)}
                        </a>
                      </td>
                      <td class="num">{nok(r.income)}</td>
                      <td class="num">{nok(r.expense)}</td>
                      <td class="num">
                        <Money value={r.income + r.expense} signed />
                      </td>
                      <td class="num">{nok(-r.saving)}</td>
                    </tr>
                  );
                })}
                <tr class="subtotal">
                  <td>Snitt</td>
                  <td class="num">{nok(averages.income)}</td>
                  <td class="num">{nok(averages.expense)}</td>
                  <td class="num">
                    <Money value={averages.net} signed />
                  </td>
                  <td class="num">{nok(-averages.saving)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2>Største utgiftskategorier</h2>
          <p class="muted small">{MEDIAN_HINT}</p>
          <div class="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th class="num">Totalt</th>
                  <th class="num">Per mnd</th>
                  <th class="num" title={MEDIAN_HINT}>Typisk mnd</th>
                  <th class="num">Antall</th>
                </tr>
              </thead>
              <tbody>
                {topCategories.length === 0 && (
                  <tr>
                    <td colspan={5} class="empty-state">
                      Ingen utgifter i perioden.
                    </td>
                  </tr>
                )}
                {topCategories.map((c) => (
                  <tr>
                    <td>
                      <a
                        href={`/transactions?category=${
                          encodeURIComponent(c.category_key)
                        }&from=${from}&to=${to}${ownerQuery}`}
                      >
                        {CATEGORY_BY_KEY.get(c.category_key)?.name ??
                          c.category_key}
                      </a>
                      <span class="muted small">
                        · {CATEGORY_BY_KEY.get(c.category_key)?.group}
                      </span>
                    </td>
                    <td class="num">{nok(c.sum)}</td>
                    <td class="num">{nok(c.sum / averages.months)}</td>
                    <td class="num" title={MEDIAN_HINT}>{nok(c.median)}</td>
                    <td class="num">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};
