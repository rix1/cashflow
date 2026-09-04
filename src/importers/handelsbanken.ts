import { parse } from "@std/csv/parse";
import { formatDate } from "../formatting/formatDate.ts";
import { lexer } from "../lexer/lexer.ts";
import { normalizeAccountNumber } from "../config.ts";
import {
  collapseWhitespace,
  normalizeMerchant,
} from "../normalize/merchant.ts";
import { parseNorwegianAmount, round2 } from "./amounts.ts";
import { parseLoanMessage } from "./loan.ts";
import type { Importer, NormalizedRow, ParsedStatement } from "./types.ts";

/**
 * Handelsbanken exports:
 *  v1 (until early 2025): comma separated, UTF-8, sometimes an extra empty column.
 *  v2 (2025+): semicolon separated, ISO-8859-1, multi-line quoted messages and
 *     footer rows with totals and opening/closing balance.
 * Both share the same column names.
 */
export const handelsbankenImporter: Importer = {
  name: "handelsbanken",
  bank: "handelsbanken",
  detect(header) {
    return header.startsWith("Utført dato");
  },
  parse(text) {
    const header = text.split("\n", 1)[0];
    const separator = header.includes(";") ? ";" : ",";
    const format = separator === ";" ? "handelsbanken-v2" : "handelsbanken-v1";
    const records = parse(text, { skipFirstRow: true, separator }) as Record<
      string,
      string
    >[];

    const rows: NormalizedRow[] = [];
    const statement: ParsedStatement = {
      format,
      bank: "handelsbanken",
      rows,
      account_number: null,
      opening_balance: null,
      opening_date: null,
      closing_balance: null,
      closing_date: null,
      total_in: null,
      total_out: null,
    };

    for (const record of records) {
      const first = (record["Utført dato"] ?? "").trim();
      if (isDate(first)) {
        rows.push(normalizeRow(record));
        continue;
      }
      readFooter(first, record, statement);
    }
    statement.account_number = mostFrequent(rows.map((r) => r.own_account));
    return statement;
  },
};

function isDate(s: string): boolean {
  return /^\d{2}\.\d{2}\.\d{4}$/.test(s);
}

function normalizeRow(r: Record<string, string>): NormalizedRow {
  const executed = formatDate(r["Utført dato"]);
  const booked = r["Bokført dato"]?.trim() ? formatDate(r["Bokført dato"]) : "";
  const status = (r["Status"] ?? "").trim();
  const pending = status === "Reservert" || !booked;

  const inn = (r["Beløp inn"] ?? "").trim();
  const ut = (r["Beløp ut"] ?? "").trim();
  const amount = parseNorwegianAmount(inn !== "" ? inn : ut) ?? 0;

  const type = clean(r["Type"]);
  const subtype = clean(r["Undertype"]);
  const description = clean(r["Beskrivelse"]) ?? "";
  const message = (r["Melding/KID/Fakt.nr"] ?? "").trim() || null;
  const fraKonto = normalizeAccountNumber(r["Fra konto"]);
  const tilKonto = normalizeAccountNumber(r["Til konto"]);
  const outgoing = amount < 0;
  const own = outgoing ? fraKonto : tilKonto;
  const counterpartyAccount = outgoing ? tilKonto : fraKonto;
  const counterparty = clean(outgoing ? r["Mottakernavn"] : r["Avsender"]);

  const isCard = type === "Varekjøp" || (subtype ?? "").startsWith("Varekjøp");
  const lexed = lexer(message ?? "");
  const merchantCandidate = isCard
    ? (lexed.source || description)
    : (counterparty || description);
  const originalAmount = lexed.local_value ? Number(lexed.local_value) : null;

  return {
    date: booked || executed,
    executed_date: executed || null,
    amount,
    currency: clean(r["Valuta"]) ?? "NOK",
    original_amount: originalAmount != null && Number.isFinite(originalAmount)
      ? round2(Math.sign(amount || 1) * originalAmount)
      : null,
    original_currency: lexed.currency || null,
    conversion_rate: lexed.conversion_rate
      ? Number(lexed.conversion_rate)
      : null,
    description: description || counterparty || message?.split("\n")[0] || "",
    merchant: normalizeMerchant(merchantCandidate),
    counterparty,
    counterparty_account: counterpartyAccount || null,
    own_account: own || null,
    bank_type: type,
    bank_subtype: subtype,
    message,
    card: lexed.card || null,
    pending,
    loan: subtype === "Nedbetaling av lån" ? parseLoanMessage(message) : null,
    raw: r,
  };
}

function readFooter(
  label: string,
  record: Record<string, string>,
  statement: ParsedStatement,
) {
  const value = record["Rentedato"] ?? "";
  const dateInLabel = /(\d{2}\.\d{2}\.\d{4})/.exec(label)?.[1];
  if (/^Inngående saldo/i.test(label)) {
    statement.opening_balance = parseNorwegianAmount(value);
    statement.opening_date = dateInLabel ? formatDate(dateInLabel) : null;
  } else if (/^Utgående\s+saldo/i.test(label)) {
    statement.closing_balance = parseNorwegianAmount(value);
    statement.closing_date = dateInLabel ? formatDate(dateInLabel) : null;
  } else if (/^Total beløp inn/i.test(label)) {
    statement.total_in = parseNorwegianAmount(value);
  } else if (/^Totalt? beløp ut/i.test(label)) {
    statement.total_out = parseNorwegianAmount(value);
  }
}

function clean(s: string | undefined): string | null {
  const c = collapseWhitespace(s ?? "");
  return c === "" ? null : c;
}

export function mostFrequent(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}
