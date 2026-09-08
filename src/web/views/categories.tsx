import type { FC } from "hono/jsx";
import { CATEGORIES, GROUP_ORDER } from "../../categorize/categories.ts";
import { monthLabel, monthsBetween, nok } from "../format.ts";
import type { CategoryMonth } from "../queries.ts";
import { median } from "../stats.ts";
import { ChartScript, MEDIAN_HINT, PALETTE, PeriodFilters } from "./layout.tsx";

type Props = {
  from: string;
  to: string;
  owner?: string;
  owners: string[];
  cells: CategoryMonth[];
};

export const CategoriesPage: FC<Props> = (
  { from, to, owner, owners, cells },
) => {
  const months = monthsBetween(from, to);
  const ownerQuery = owner ? `&owner=${encodeURIComponent(owner)}` : "";
  const lookup = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const c of cells) {
    lookup.set(`${c.category_key}|${c.month}`, c.sum);
    totals.set(c.category_key, (totals.get(c.category_key) ?? 0) + c.sum);
  }
  const groups = GROUP_ORDER.map((group) => ({
    group,
    categories: CATEGORIES.filter((c) =>
      c.group === group && (totals.get(c.key) ?? 0) !== 0
    ),
  })).filter((g) => g.categories.length > 0);

  const expenseGroups = groups.filter((g) =>
    !["Inntekt", "Sparing", "Overføringer", "Utenfor"].includes(g.group)
  );
  const chart = {
    type: "bar",
    data: {
      labels: months.map(monthLabel),
      datasets: expenseGroups.map((g) => ({
        label: g.group,
        data: months.map((m) =>
          Math.round(
            -g.categories.reduce(
              (s, c) => s + (lookup.get(`${c.key}|${m}`) ?? 0),
              0,
            ),
          )
        ),
        backgroundColor: PALETTE[GROUP_ORDER.indexOf(g.group) % PALETTE.length],
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { x: { stacked: true }, y: { stacked: true } },
    },
  };

  return (
    <>
      <h1>Kategorier per måned {owner ? `· ${owner}` : "· husholdning"}</h1>
      <PeriodFilters
        from={from}
        to={to}
        owner={owner}
        owners={owners}
        action="/categories"
      />
      <div class="card">
        <div class="section-heading">
          <h2>Utgifter etter gruppe</h2>
          <span class="muted small">Per måned · kr</span>
        </div>
        <div class="chart">
          <canvas
            id="cat-chart"
            role="img"
            aria-label="Utgifter etter gruppe per måned. Tallene finnes i kategoritabellen nedenfor."
          >
          </canvas>
        </div>
        <ChartScript id="cat-chart" config={chart} />
      </div>
      <p class="muted small">
        {MEDIAN_HINT} Rull sidelengs for å se flere måneder.
      </p>
      <div
        class="tablewrap category-scroll"
        tabindex={0}
        role="region"
        aria-label="Kategorier per måned, rullbar tabell"
      >
        <table class="category-grid">
          <thead>
            <tr>
              <th>Kategori</th>
              {months.map((m) => <th class="num">{monthLabel(m)}</th>)}
              <th class="num">Totalt</th>
              <th class="num">Snitt</th>
              <th class="num" title={MEDIAN_HINT}>Typisk</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colspan={months.length + 4} class="empty-state">
                  Ingen kategoriserte transaksjoner i perioden.
                </td>
              </tr>
            )}
            {groups.map((g) => {
              const groupMonth = (m: string) =>
                g.categories.reduce(
                  (s, c) => s + (lookup.get(`${c.key}|${m}`) ?? 0),
                  0,
                );
              const groupTotal = g.categories.reduce(
                (s, c) => s + (totals.get(c.key) ?? 0),
                0,
              );
              return (
                <>
                  <tr class="group-head">
                    <td>{g.group}</td>
                    {months.map((m) => (
                      <td class="num">{nok(groupMonth(m))}</td>
                    ))}
                    <td class="num">{nok(groupTotal)}</td>
                    <td class="num">{nok(groupTotal / months.length)}</td>
                    <td class="num" title={MEDIAN_HINT}>
                      {nok(median(months.map(groupMonth)))}
                    </td>
                  </tr>
                  {g.categories.map((c) => (
                    <tr>
                      <td>
                        <a
                          href={`/transactions?category=${
                            encodeURIComponent(c.key)
                          }&from=${from}&to=${to}${ownerQuery}`}
                        >
                          {c.name}
                        </a>
                      </td>
                      {months.map((m) => {
                        const v = lookup.get(`${c.key}|${m}`);
                        return (
                          <td class="num">
                            {v != null
                              ? (
                                <a
                                  class="cell"
                                  href={`/transactions?category=${
                                    encodeURIComponent(c.key)
                                  }&from=${m}&to=${m}${ownerQuery}`}
                                >
                                  {nok(v)}
                                </a>
                              )
                              : (
                                <span
                                  class="muted"
                                  aria-label="Ingen transaksjoner"
                                >
                                  –
                                </span>
                              )}
                          </td>
                        );
                      })}
                      <td class="num">{nok(totals.get(c.key) ?? 0)}</td>
                      <td class="num">
                        {nok((totals.get(c.key) ?? 0) / months.length)}
                      </td>
                      <td class="num" title={MEDIAN_HINT}>
                        {nok(
                          median(
                            months.map((m) => lookup.get(`${c.key}|${m}`) ?? 0),
                          ),
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};
