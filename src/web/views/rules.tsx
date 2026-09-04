import type { FC } from "hono/jsx";
import { CATEGORY_BY_KEY } from "../../categorize/categories.ts";
import type { RuleRow } from "../queries.ts";
import { CategorySelect } from "./layout.tsx";

const FIELDS = [
  "merchant",
  "description",
  "counterparty",
  "message",
  "bank_type",
  "bank_subtype",
  "any",
];

export const RulesPage: FC<{ rules: RuleRow[]; error?: string }> = (
  { rules, error },
) => {
  const user = rules.filter((r) => r.source === "user");
  const seed = rules.filter((r) => r.source === "seed");
  return (
    <>
      <h1>Regler</h1>
      <p class="muted">
        Regler evalueres i prioritert rekkefølge (lavest tall først), første
        treff vinner. Egne regler (prioritet 100) går foran standardreglene
        (500+). Banksignaler (lønn, lån, gebyr) og overføringer mellom egne
        kontoer avgjøres før reglene. Mønstre er regulære uttrykk uten hensyn
        til store/små bokstaver. Feltet <code>merchant</code>{" "}
        er den normaliserte mottakeren (store bokstaver).
      </p>
      {error && <div class="callout">{error}</div>}
      <div class="card">
        <form class="filters" method="post" action="/rules">
          <label>
            Navn
            <input name="name" required placeholder="f.eks. Kaffe hos Tim" />
          </label>
          <label>
            Felt
            <select name="field">
              {FIELDS.map((f) => <option value={f}>{f}</option>)}
            </select>
          </label>
          <label>
            Mønster (regex)
            <input
              name="pattern"
              required
              placeholder="^TIM WENDELBOE"
              style="min-width:260px"
            />
          </label>
          <label>
            Kategori
            <CategorySelect name="category_key" class="" />
          </label>
          <label>
            Prioritet
            <input
              type="number"
              name="priority"
              value="100"
              style="width:80px"
            />
          </label>
          <button type="submit">Legg til</button>
        </form>
        <form method="post" action="/categorize" class="inline-form">
          <button type="submit" class="secondary">
            Kjør kategorisering på nytt
          </button>
          <span class="muted small">Kjøres automatisk når regler endres.</span>
        </form>
      </div>

      <h2>Egne regler ({user.length})</h2>
      <RuleTable rules={user} deletable />
      <h2>Standardregler ({seed.length})</h2>
      <p class="muted small">
        Definert i src/categorize/seed-rules.ts. Endre der for varige endringer.
      </p>
      <RuleTable rules={seed} />
    </>
  );
};

const RuleTable: FC<{ rules: RuleRow[]; deletable?: boolean }> = (
  { rules, deletable },
) => (
  <div class="tablewrap">
    <table>
      <thead>
        <tr>
          <th class="num">Prio</th>
          <th>Navn</th>
          <th>Felt</th>
          <th>Mønster</th>
          <th>Kategori</th>
          <th class="num">Treff</th>
          {deletable && <th></th>}
        </tr>
      </thead>
      <tbody>
        {rules.length === 0 && (
          <tr>
            <td colspan={7} class="muted">
              Ingen regler.
            </td>
          </tr>
        )}
        {rules.map((r) => (
          <tr>
            <td class="num">{r.priority}</td>
            <td>{r.name}</td>
            <td>{r.field}</td>
            <td class="small" style="max-width:520px; word-break:break-all">
              <code>
                {r.pattern.length > 160
                  ? r.pattern.slice(0, 160) + "…"
                  : r.pattern}
              </code>
            </td>
            <td>
              {CATEGORY_BY_KEY.get(r.category_key)?.name ?? r.category_key}
            </td>
            <td class="num">{r.matches}</td>
            {deletable && (
              <td>
                <form method="post" action={`/rules/${r.id}/delete`}>
                  <button type="submit" class="danger small">slett</button>
                </form>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
