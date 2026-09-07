import type { FC } from "hono/jsx";
import { nok } from "../format.ts";
import {
  type AccountRow,
  categoryOptions,
  type TxFilters,
  type TxRow,
} from "../queries.ts";
import { CategorySelect, MultiSelect } from "./layout.tsx";

const DIRECTIONS: [string, string][] = [
  ["", "alle"],
  ["in", "inn"],
  ["out", "ut"],
];

export const SourceBadge: FC<{ source: string | null }> = ({ source }) => {
  if (!source || source === "none") {
    return <span class="badge none">ingen</span>;
  }
  if (source === "manual") return <span class="badge manual">manuell</span>;
  if (source.startsWith("transfer")) {
    return <span class="badge transfer">overføring</span>;
  }
  if (source === "bank") return <span class="badge">bank</span>;
  if (source === "employer") return <span class="badge">arbeidsgiver</span>;
  if (source.startsWith("rule:")) return <span class="badge">regel</span>;
  return <span class="badge">{source}</span>;
};

export const TxTableRow: FC<{ tx: TxRow }> = ({ tx }) => (
  <tr id={`tx-${tx.id}`}>
    <td class="nowrap">{tx.date}</td>
    <td class="nowrap small">
      {tx.owner} · {tx.bank}
    </td>
    <td class="desc">
      <a href={`/vendors/${encodeURIComponent(tx.merchant)}`}>
        {tx.merchant}
      </a>
      <details>
        <summary class="small">{tx.description}</summary>
        <pre>
          {[
            `bank: ${tx.bank_type ?? ""} / ${tx.bank_subtype ?? ""}`,
            tx.counterparty ? `motpart: ${tx.counterparty}` : "",
            tx.original_currency && tx.original_currency !== tx.currency ? `valuta: ${tx.original_amount} ${tx.original_currency}` : "",
            tx.transfer_group ? `overføring: ${tx.transfer_group}` : "",
            tx.message ? `melding: ${tx.message}` : "",
          ]
            .filter(Boolean)
            .join("\n")}
        </pre>
      </details>
    </td>
    <td class={`num ${tx.amount > 0 ? "pos" : ""}`}>{nok(tx.amount, true)}</td>
    <td>
      <form class="inline-form">
        <CategorySelect
          name="category_key"
          value={tx.category_key}
          attrs={{
            "hx-post": `/transactions/${tx.id}/category`,
            "hx-trigger": "change",
            "hx-target": `#tx-${tx.id}`,
            "hx-swap": "outerHTML",
          }}
        />
        <SourceBadge source={tx.category_source} />
        {tx.category_source === "manual" && (
          <button
            type="button"
            class="secondary small"
            hx-post={`/transactions/${tx.id}/category`}
            hx-vals='{"category_key": ""}'
            hx-target={`#tx-${tx.id}`}
            hx-swap="outerHTML"
            title="Fjern manuell overstyring"
          >
            ×
          </button>
        )}
      </form>
    </td>
  </tr>
);

type Props = {
  filters: TxFilters;
  rows: TxRow[];
  total: number;
  sum: number;
  owners: string[];
  accounts: AccountRow[];
  page: number;
  pageSize: number;
};

export const TransactionsPage: FC<Props> = (
  { filters, rows, total, sum, owners, accounts, page, pageSize },
) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const query = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (
        v === undefined || v === "" || v === false || k === "page" ||
        k === "pageSize"
      ) continue;
      for (const item of Array.isArray(v) ? v : [v]) {
        params.append(k, String(item));
      }
    }
    params.set("page", String(p));
    return `/transactions?${params}`;
  };
  return (
    <>
      <h1>Transaksjoner</h1>
      <form class="filters" method="get" action="/transactions">
        <label>
          Søk
          <input
            type="search"
            name="q"
            value={filters.q ?? ""}
            placeholder="mottaker, tekst, melding"
          />
        </label>
        <div class="field">
          <span>Retning</span>
          <div class="segmented">
            {DIRECTIONS.map(([value, label]) => (
              <label>
                <input
                  type="radio"
                  name="direction"
                  value={value}
                  checked={(filters.direction ?? "") === value}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div class="field">
          <span>Kategori</span>
          <MultiSelect
            name="category"
            groups={categoryOptions().map((g) => ({
              label: g.group,
              options: g.categories.map((c) => ({
                value: c.key,
                label: c.name,
              })),
            }))}
            selected={filters.category}
          />
        </div>
        <div class="field">
          <span>Hvem</span>
          <MultiSelect
            name="owner"
            groups={[{ options: owners.map((o) => ({ value: o, label: o })) }]}
            selected={filters.owner}
            emptyLabel="husholdning"
          />
        </div>
        <div class="field">
          <span>Konto</span>
          <MultiSelect
            name="account"
            groups={[{
              options: accounts.filter((a) => a.tx_count > 0).map((a) => ({
                value: String(a.id),
                label: `${a.owner} · ${a.bank} · ${a.name}`,
              })),
            }]}
            selected={filters.account?.map(String)}
          />
        </div>
        <label>
          Fra
          <input type="month" name="from" value={filters.from ?? ""} />
        </label>
        <label>
          Til
          <input type="month" name="to" value={filters.to ?? ""} />
        </label>
        <label>
          <span>&nbsp;</span>
          <span>
            <input
              type="checkbox"
              name="uncategorized"
              value="1"
              checked={!!filters.uncategorized}
            />{" "}
            kun ukategoriserte
          </span>
        </label>
        {filters.merchant && (
          <input type="hidden" name="merchant" value={filters.merchant} />
        )}
        <button type="submit">Filtrer</button>
        <a href="/transactions" class="muted small">nullstill</a>
      </form>
      <p class="muted">
        {total} transaksjoner · sum <b>{nok(sum)}</b>
        {filters.merchant && (
          <>
            {" "}· mottaker <b>{filters.merchant}</b>
          </>
        )}
      </p>
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
          <tbody>{rows.map((tx) => <TxTableRow tx={tx} />)}</tbody>
        </table>
      </div>
      {pages > 1 && (
        <div class="pager">
          {page > 1 && <a href={query(page - 1)}>← forrige</a>}
          <span class="muted">
            side {page} av {pages}
          </span>
          {page < pages && <a href={query(page + 1)}>neste →</a>}
        </div>
      )}
    </>
  );
};
