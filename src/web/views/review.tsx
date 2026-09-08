import type { FC } from "hono/jsx";
import { nok } from "../format.ts";
import { REVIEW_PERIODS, type ReviewGroup, type TxRow } from "../queries.ts";
import { CategorySelect, OwnerSelect } from "./layout.tsx";
import { TxTableHead, TxTableRow } from "./transactions.tsx";

export type ReviewProps = {
  groups: ReviewGroup[];
  stats: { count: number; sum: number; merchants: number };
  otherIncome: TxRow[];
  owner?: string;
  /** One of REVIEW_PERIODS' keys. */
  period: string;
  owners: string[];
};

export function reviewUrl(owner: string | undefined, period: string): string {
  const params = new URLSearchParams();
  if (period !== "all") params.set("period", period);
  if (owner) params.set("owner", owner);
  const query = params.toString();
  return `/review${query ? `?${query}` : ""}`;
}

export const ReviewPage: FC<ReviewProps> = (props) => (
  <>
    <h1>Gjennomgang av ukategoriserte</h1>
    <p class="muted">
      Velg kategori på én eller flere mottakere og lagre. Hvert valg blir en
      regel for mottakeren, så fremtidige importer kategoriseres automatisk.
      Rediger enkelttransaksjoner under{" "}
      <a href="/transactions?uncategorized=1">Transaksjoner</a>.
    </p>
    <form class="filters" method="get" action="/review">
      <div class="field">
        <span>Periode</span>
        <nav class="segmented" aria-label="Periode">
          {REVIEW_PERIODS.map(([key, label]) => (
            <a
              href={reviewUrl(props.owner, key)}
              aria-current={key === props.period ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
      <label>
        Hvem
        <OwnerSelect owners={props.owners} value={props.owner} />
      </label>
      {props.period !== "all" && (
        <input type="hidden" name="period" value={props.period} />
      )}
      <button type="submit">Vis</button>
    </form>
    <ReviewQueue {...props} />
    <h2>Annen inntekt å avklare</h2>
    <p class="muted">
      Innbetalinger som traff samlereglene for giro og innkommende overføring
      blir «Annen inntekt», som ikke teller som inntekt i oversikten. Penger
      andre betaler tilbake hører hjemme i «Utlegg for andre» sammen med det du
      la ut for dem; ellers sett riktig kategori, eller merk posten som engangs
      så den holdes utenfor alle snitt.
    </p>
    <OtherIncome rows={props.otherIncome} />
    <script dangerouslySetInnerHTML={{ __html: REVIEW_SCRIPT }} />
  </>
);

/**
 * One form for the whole queue. Every row submits its merchant and a category;
 * rows left at "uncategorized" are ignored. htmx swaps the form in place so a
 * client-side sort survives; without JS the form posts and redirects back.
 */
export const ReviewQueue: FC<ReviewProps> = (
  { groups, stats, owner, period },
) => (
  <form
    id="review-queue"
    method="post"
    action="/review/rules"
    hx-post="/review/rules"
    hx-target="this"
    hx-swap="outerHTML"
    hx-disabled-elt=".review-save"
  >
    {owner && <input type="hidden" name="owner" value={owner} />}
    {period !== "all" && <input type="hidden" name="period" value={period} />}
    <div class="section-heading review-heading">
      <p class="muted">
        {stats.count} transaksjoner fordelt på {stats.merchants}{" "}
        mottakere, totalt <b>{nok(stats.sum)}</b>.
      </p>
      {groups.length > 0 && <SaveButton />}
    </div>
    <div class="tablewrap">
      <table id="review-table" class="review-table">
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
                <a href={`/vendors/${encodeURIComponent(g.merchant)}`}>
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
                <input type="hidden" name="merchant" value={g.merchant} />
                <CategorySelect
                  name="category_key"
                  value="uncategorized"
                  attrs={{ "aria-label": `Kategori for ${g.merchant}` }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {groups.length > 0 && (
      <p>
        <SaveButton />
      </p>
    )}
  </form>
);

const SaveButton: FC = () => (
  <button type="submit" class="review-save">Lagre regler</button>
);

/** Set `oob` on the response to a save so this section refreshes as well. */
export const OtherIncome: FC<{ rows: TxRow[]; oob?: boolean }> = (
  { rows, oob },
) => (
  <div id="other-income" hx-swap-oob={oob ? "true" : undefined}>
    <p class="muted small">
      {rows.length} innbetalinger å avklare i utvalget.
    </p>
    <div class="tablewrap">
      <table id="other-income-table">
        <TxTableHead />
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colspan={5} class="empty-state">
                Ingen annen inntekt å avklare i utvalget.
              </td>
            </tr>
          )}
          {rows.map((tx) => <TxTableRow tx={tx} />)}
        </tbody>
      </table>
    </div>
  </div>
);

/** Marks changed rows and keeps the save buttons' count current across swaps. */
const REVIEW_SCRIPT = `(function(){
function update(form) {
  const n = form.querySelectorAll('tr.pending').length;
  const label = n === 0 ? 'Lagre regler' : n === 1 ? 'Lagre 1 regel' : 'Lagre ' + n + ' regler';
  for (const button of form.querySelectorAll('.review-save')) {
    button.disabled = n === 0;
    button.textContent = label;
  }
}
document.addEventListener('change', e => {
  const form = e.target.closest('#review-queue');
  if (!form || !e.target.matches('select')) return;
  e.target.closest('tr').classList.toggle('pending', e.target.value !== 'uncategorized');
  update(form);
});
document.addEventListener('htmx:load', e => {
  const elt = e.detail.elt;
  const form = elt.id === 'review-queue' ? elt : elt.querySelector && elt.querySelector('#review-queue');
  if (form) update(form);
});
const form = document.getElementById('review-queue');
if (form) update(form);
})();`;
