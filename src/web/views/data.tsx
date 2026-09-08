import type { FC } from "hono/jsx";
import { nok } from "../format.ts";
import type { AccountRow, Gap, ImportRow, UnknownAccount } from "../queries.ts";

type Props = {
  accounts: AccountRow[];
  imports: ImportRow[];
  gaps: Gap[];
  unknown: UnknownAccount[];
};

export const DataPage: FC<Props> = ({ accounts, imports, gaps, unknown }) => (
  <>
    <h1>Data og import</h1>
    <div class="card">
      <b>Importere nye kontoutskrifter:</b> legg CSV-filene i{" "}
      <code>./statements/</code> og kjør{" "}
      <code>deno task import</code>. Bank og konto gjenkjennes fra innholdet,
      ikke filnavnet. Allerede importerte linjer hoppes over, så det er trygt å
      eksportere overlappende perioder. Ukjente kontonumre må legges til i{" "}
      <code>accounts.json</code>. <code>deno task rebuild</code>{" "}
      bygger databasen på nytt fra alle filene (regler og manuelle valg
      beholdes).
    </div>

    {gaps.length > 0 && (
      <div class="callout">
        <b>Hull i dataene:</b>
        <ul style="margin:6px 0 0">
          {gaps.map((g) => (
            <li>
              {g.account.owner} · {g.account.bank} · {g.account.name}: mangler
              {" "}
              {g.from} → {g.to} ({g.days}{" "}
              dager). Eksporter perioden fra nettbanken og importer.
            </li>
          ))}
        </ul>
      </div>
    )}

    {unknown.length > 0 && (
      <div class="callout">
        <b>
          Kontoer banken kaller "egen konto" som ikke finnes i accounts.json:
        </b>
        <ul style="margin:6px 0 0">
          {unknown.map((u) => (
            <li>
              <code>{u.counterparty_account}</code>{" "}
              {u.counterparty ? `(${u.counterparty})` : ""} · {u.count}{" "}
              overføringer · {nok(u.sum)} · fra{" "}
              {u.owners}. Legg den til med riktig eier og type
              (checking/savings/loan) for bedre kategorisering.
            </li>
          ))}
        </ul>
      </div>
    )}

    <h2>Kontoer</h2>
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Eier</th>
            <th>Bank</th>
            <th>Konto</th>
            <th>Type</th>
            <th>Nummer</th>
            <th class="num">Transaksjoner</th>
            <th>Første</th>
            <th>Siste</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 && (
            <tr>
              <td colspan={8} class="empty-state">
                Ingen kontoer importert ennå. Se importveiledningen øverst.
              </td>
            </tr>
          )}
          {accounts.map((a) => (
            <tr>
              <td>{a.owner}</td>
              <td>{a.bank}</td>
              <td>{a.name}</td>
              <td>{a.kind}</td>
              <td class="small muted">{a.number}</td>
              <td class="num">{a.tx_count}</td>
              <td class="nowrap">{a.first_date ?? "–"}</td>
              <td class="nowrap">{a.last_date ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h2>Importerte filer</h2>
    <p class="muted small">
      Avstemming: inngående saldo + sum av bokførte transaksjoner i perioden
      skal bli utgående saldo. Et avvik tilsvarer normalt reserverte (ikke
      bokførte) beløp på eksporttidspunktet.
    </p>
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Fil</th>
            <th>Format</th>
            <th>Konto</th>
            <th>Periode</th>
            <th class="num">Linjer</th>
            <th class="num">Nye</th>
            <th class="num">Dupl.</th>
            <th class="num">Reservert</th>
            <th class="num">Inngående</th>
            <th class="num">Sum periode</th>
            <th class="num">Utgående</th>
            <th class="num">Avvik</th>
            <th>Importert</th>
          </tr>
        </thead>
        <tbody>
          {imports.length === 0 && (
            <tr>
              <td colspan={13} class="empty-state">
                Ingen filer importert ennå. Legg til kontoutskrifter for å se
                avstemmingen.
              </td>
            </tr>
          )}
          {imports.map((i) => {
            const diff = i.opening_balance != null && i.closing_balance != null
              ? i.opening_balance + (i.period_sum ?? 0) - i.closing_balance
              : null;
            return (
              <tr>
                <td class="small" style="max-width:260px; word-break:break-all">
                  {i.file_name}
                </td>
                <td class="small">{i.format}</td>
                <td class="small">
                  {i.owner} · {i.bank} · {i.account_name}
                </td>
                <td class="nowrap small">
                  {i.period_start} → {i.period_end}
                </td>
                <td class="num">{i.row_count}</td>
                <td class="num">{i.inserted_count}</td>
                <td class="num">{i.skipped_count}</td>
                <td class="num">{i.pending_count}</td>
                <td class="num">
                  {i.opening_balance != null
                    ? nok(i.opening_balance, true)
                    : "–"}
                </td>
                <td class="num">{nok(i.period_sum ?? 0, true)}</td>
                <td class="num">
                  {i.closing_balance != null
                    ? nok(i.closing_balance, true)
                    : "–"}
                </td>
                <td
                  class={`num ${
                    diff != null && Math.abs(diff) > 1 ? "warn" : ""
                  }`}
                >
                  {diff != null ? nok(diff, true) : "–"}
                </td>
                <td class="nowrap small muted">{i.imported_at.slice(0, 16)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
);
