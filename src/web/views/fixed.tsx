import type { FC } from "hono/jsx";
import { CATEGORY_BY_KEY } from "../../categorize/categories.ts";
import type { RecurringItem } from "../../categorize/recurring.ts";
import { nok } from "../format.ts";
import { OwnerSelect } from "./layout.tsx";

type Props = {
  items: RecurringItem[];
  owner?: string;
  owners: string[];
  showInactive: boolean;
};

const CADENCE: Record<string, string> = {
  weekly: "ukentlig",
  monthly: "månedlig",
  quarterly: "kvartalsvis",
  yearly: "årlig",
  irregular: "uregelmessig",
};

export const FixedPage: FC<Props> = (
  { items, owner, owners, showInactive },
) => {
  const visible = showInactive ? items : items.filter((i) => i.active);
  const active = items.filter((i) => i.active);
  const byGroup = new Map<string, number>();
  for (const i of active) {
    const g = CATEGORY_BY_KEY.get(i.category_key)?.group ?? "Annet";
    byGroup.set(g, (byGroup.get(g) ?? 0) + i.monthly_equivalent);
  }
  const total = active.reduce((s, i) => s + i.monthly_equivalent, 0);
  const ownerQuery = owner ? `&owner=${encodeURIComponent(owner)}` : "";

  return (
    <>
      <h1>
        Faste og gjentakende kostnader {owner ? `· ${owner}` : "· husholdning"}
      </h1>
      <p class="muted">
        Betalinger til samme mottaker med jevn rytme (ukentlig, månedlig,
        kvartalsvis, årlig). Aktiv betyr sett i løpet av den siste perioden.
        Beløp er median per betaling omregnet til måned.
      </p>
      <form class="filters" method="get" action="/fixed">
        <label>
          Hvem
          <OwnerSelect owners={owners} value={owner} />
        </label>
        <label>
          <span>&nbsp;</span>
          <span>
            <input
              type="checkbox"
              name="inactive"
              value="1"
              checked={showInactive}
            />{" "}
            vis også inaktive
          </span>
        </label>
        <button type="submit">Vis</button>
      </form>
      <div class="tiles">
        <div class="tile">
          <div class="label">Faste kostnader / mnd (aktive)</div>
          <div class="value neg">{nok(total)}</div>
          <div class="sub">{active.length} gjentakende poster</div>
        </div>
        {[...byGroup.entries()].sort((a, b) => b[1] - a[1]).map(([g, v]) => (
          <div class="tile">
            <div class="label">{g}</div>
            <div class="value">{nok(v)}</div>
          </div>
        ))}
      </div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Mottaker</th>
              <th>Kategori</th>
              <th>Rytme</th>
              <th class="num">Per betaling</th>
              <th class="num">Per mnd</th>
              <th class="num">Antall</th>
              <th>Første</th>
              <th>Siste</th>
              <th>Hvem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => (
              <tr>
                <td>
                  <a
                    href={`/transactions?merchant=${
                      encodeURIComponent(i.merchant)
                    }${ownerQuery}`}
                  >
                    {i.merchant}
                  </a>
                </td>
                <td>
                  {CATEGORY_BY_KEY.get(i.category_key)?.name ?? i.category_key}
                </td>
                <td>
                  {CADENCE[i.cadence]} {i.stability > 0.35
                    ? <span class="muted small">(varierende beløp)</span>
                    : null}
                </td>
                <td class="num">{nok(i.median_amount)}</td>
                <td class="num">{nok(i.monthly_equivalent)}</td>
                <td class="num">{i.count}</td>
                <td class="nowrap">{i.first}</td>
                <td class="nowrap">{i.last}</td>
                <td>{i.owners.join(", ")}</td>
                <td>
                  {i.active
                    ? <span class="badge transfer">aktiv</span>
                    : <span class="badge">inaktiv</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
