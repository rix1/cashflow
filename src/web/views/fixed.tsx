import type { FC } from "hono/jsx";
import { CATEGORY_BY_KEY } from "../../categorize/categories.ts";
import type { RecurringItem } from "../../categorize/recurring.ts";
import { nok } from "../format.ts";
import type { RecurringFilter } from "../queries.ts";
import { OwnerSelect } from "./layout.tsx";
import { Logo } from "./logo.tsx";

type Props = {
  items: RecurringItem[];
  filter: RecurringFilter;
  owners: string[];
};

const CADENCE: Record<string, string> = {
  weekly: "ukentlig",
  monthly: "månedlig",
  quarterly: "kvartalsvis",
  yearly: "årlig",
  irregular: "uregelmessig",
};

export const FixedPage: FC<Props> = ({ items, filter, owners }) => {
  const active = items.filter((i) => i.active);
  const byGroup = new Map<string, number>();
  for (const i of active) {
    const g = CATEGORY_BY_KEY.get(i.category_key)?.group ?? "Annet";
    byGroup.set(g, (byGroup.get(g) ?? 0) + i.monthly_equivalent);
  }
  const total = active.reduce((s, i) => s + i.monthly_equivalent, 0);
  const yearly = total * 12;
  const ownerQuery = filter.owner
    ? `?owner=${encodeURIComponent(filter.owner)}`
    : "";
  const kind = filter.kind ?? "all";

  return (
    <>
      <h1>
        Abonnementer og faste kostnader{" "}
        {filter.owner ? `· ${filter.owner}` : "· husholdning"}
      </h1>
      <p class="muted">
        Betalinger til samme mottaker med jevn rytme (ukentlig, månedlig,
        kvartalsvis, årlig). Beløp er median per betaling omregnet til måned.
        Aktiv betyr betalt i løpet av den siste perioden; inaktive er
        sannsynligvis avsluttet.
      </p>
      <form class="filters" method="get" action="/fixed">
        <label>
          Søk
          <input
            type="search"
            name="q"
            value={filter.q ?? ""}
            placeholder="mottaker"
          />
        </label>
        <label>
          Type
          <select name="kind">
            <option value="all" selected={kind === "all"}>alle</option>
            <option value="subscriptions" selected={kind === "subscriptions"}>
              abonnementer og medlemskap
            </option>
            <option value="bills" selected={kind === "bills"}>
              faste regninger (bolig, lån, forsikring, gaver)
            </option>
            <option value="other" selected={kind === "other"}>
              annet gjentakende (mat, transport, ...)
            </option>
          </select>
        </label>
        <label>
          Rytme
          <select name="cadence">
            {["all", "weekly", "monthly", "quarterly", "yearly"].map((c) => (
              <option value={c} selected={(filter.cadence ?? "all") === c}>
                {c === "all" ? "alle" : CADENCE[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hvem
          <OwnerSelect owners={owners} value={filter.owner} />
        </label>
        <label>
          <span>&nbsp;</span>
          <span>
            <input
              type="checkbox"
              name="inactive"
              value="1"
              checked={!!filter.includeInactive}
            />{" "}
            vis også inaktive
          </span>
        </label>
        <button type="submit">Vis</button>
        <a href="/fixed" class="muted small">nullstill</a>
      </form>
      <div class="tiles">
        <div class="tile">
          <div class="label">Per måned (aktive i utvalget)</div>
          <div class="value neg">{nok(total)}</div>
          <div class="sub">
            {active.length} poster · {nok(yearly)} per år
          </div>
        </div>
        {[...byGroup.entries()].sort((a, b) => b[1] - a[1]).map(([g, v]) => (
          <div class="tile">
            <div class="label">{g}</div>
            <div class="value">{nok(v)}</div>
            <div class="sub">per måned</div>
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
              <th class="num">Per år</th>
              <th class="num">Antall</th>
              <th>Første</th>
              <th>Siste</th>
              <th>Hvem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colspan={11} class="muted">
                  Ingen gjentakende betalinger matcher.
                </td>
              </tr>
            )}
            {items.map((i) => (
              <tr>
                <td class="nowrap">
                  <Logo merchant={i.merchant} />
                  <a
                    href={`/vendors/${
                      encodeURIComponent(i.merchant)
                    }${ownerQuery}`}
                  >
                    {i.merchant}
                  </a>
                </td>
                <td class="small">
                  {CATEGORY_BY_KEY.get(i.category_key)?.name ?? i.category_key}
                </td>
                <td class="small">
                  {CADENCE[i.cadence]} {i.stability > 0.35
                    ? <span class="muted">(varierende)</span>
                    : null}
                </td>
                <td class="num">{nok(i.median_amount)}</td>
                <td class="num">{nok(i.monthly_equivalent)}</td>
                <td class="num">{nok(i.monthly_equivalent * 12)}</td>
                <td class="num">{i.count}</td>
                <td class="nowrap small">{i.first}</td>
                <td class="nowrap small">{i.last}</td>
                <td class="small">{i.owners.join(", ")}</td>
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
