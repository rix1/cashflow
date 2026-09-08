import type { FC } from "hono/jsx";
import { nok } from "../format.ts";
import type { ReviewGroup, TxRow } from "../queries.ts";
import { CategorySelect, OwnerSelect } from "./layout.tsx";
import { TxTableHead, TxTableRow } from "./transactions.tsx";

type Props = {
  groups: ReviewGroup[];
  stats: { count: number; sum: number; merchants: number };
  otherIncome: TxRow[];
  owner?: string;
  owners: string[];
};

export const ReviewPage: FC<Props> = (
  { groups, stats, otherIncome, owner, owners },
) => (
  <>
    <h1>Gjennomgang av ukategoriserte</h1>
    <p class="muted">
      {stats.count} transaksjoner fordelt på {stats.merchants} mottakere, totalt
      {" "}
      <b>{nok(stats.sum)}</b>. Velg kategori og lagre: det lager en regel for
      mottakeren, så fremtidige importer kategoriseres automatisk. Rediger
      enkelttransaksjoner under{" "}
      <a href="/transactions?uncategorized=1">Transaksjoner</a>.
    </p>
    <form class="filters" method="get" action="/review">
      <label>
        Hvem
        <OwnerSelect owners={owners} value={owner} />
      </label>
      <button type="submit">Vis</button>
    </form>
    <div class="tablewrap">
      <table class="review-table">
        <thead>
          <tr>
            <th>Mottaker</th>
            <th>Eksempel</th>
            <th class="num">Antall</th>
            <th class="num">Sum</th>
            <th>Periode</th>
            <th>Hvem</th>
            <th>Kategori</th>
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 && (
            <tr>
              <td colspan={7} class="empty-state">
                <strong>Ingen ukategoriserte mottakere i utvalget</strong>Du kan
                fortsatt justere enkeltposter under{" "}
                <a href="/transactions">Transaksjoner</a>.
              </td>
            </tr>
          )}
          {groups.map((g) => (
            <tr>
              <td>
                <a
                  href={`/vendors/${encodeURIComponent(g.merchant)}`}
                >
                  {g.merchant}
                </a>
              </td>
              <td class="small muted">{g.sample}</td>
              <td class="num">{g.count}</td>
              <td class="num">{nok(g.sum)}</td>
              <td class="nowrap small">
                {g.first} → {g.last}
              </td>
              <td class="small">{g.owners}</td>
              <td>
                <form method="post" action="/review/rule" class="inline-form">
                  <input type="hidden" name="merchant" value={g.merchant} />
                  <input type="hidden" name="owner" value={owner ?? ""} />
                  <CategorySelect
                    name="category_key"
                    value="uncategorized"
                    attrs={{ "aria-label": `Kategori for ${g.merchant}` }}
                  />
                  <button type="submit">Lagre regel</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h2>Annen inntekt å avklare</h2>
    <p class="muted">
      {otherIncome.length}{" "}
      innbetalinger traff samlereglene for giro og innkommende overføring og ble
      «Annen inntekt», som ikke teller som inntekt i oversikten. Penger andre
      betaler tilbake hører hjemme i «Utlegg for andre» sammen med det du la ut
      for dem; ellers sett riktig kategori, eller merk posten som engangs så den
      holdes utenfor alle snitt.
    </p>
    <div class="tablewrap">
      <table>
        <TxTableHead />
        <tbody>
          {otherIncome.length === 0 && (
            <tr>
              <td colspan={5} class="empty-state">
                Ingen annen inntekt å avklare i utvalget.
              </td>
            </tr>
          )}
          {otherIncome.map((tx) => <TxTableRow tx={tx} />)}
        </tbody>
      </table>
    </div>
  </>
);
