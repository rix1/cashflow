import { parse } from "@std/csv/parse";
import { formatDate } from "../formatting/formatDate.ts";
import { lexer } from "../lexer/lexer.ts";
import { normalizeAccountNumber } from "../config.ts";
import {
  collapseWhitespace,
  normalizeMerchant,
} from "../normalize/merchant.ts";
import { parseNorwegianAmount } from "./amounts.ts";
import { mostFrequent } from "./handelsbanken.ts";
import type { Importer, NormalizedRow, ParsedStatement } from "./types.ts";

/**
 * Nordea exports: semicolon separated, UTF-8 with BOM, one line per row.
 * Pending rows have "Reservert" instead of a booking date.
 */
export const nordeaImporter: Importer = {
  name: "nordea",
  bank: "nordea",
  detect(header) {
    return header.startsWith("Bokføringsdato;");
  },
  parse(text) {
    const records = parse(text, {
      skipFirstRow: true,
      separator: ";",
    }) as Record<string, string>[];
    const rows = records.map(normalizeRow);
    return {
      format: "nordea",
      bank: "nordea",
      rows,
      account_number: mostFrequent(rows.map((r) => r.own_account)),
      opening_balance: null,
      opening_date: null,
      closing_balance: null,
      closing_date: null,
      total_in: null,
      total_out: null,
    } satisfies ParsedStatement;
  },
};

function normalizeRow(r: Record<string, string>): NormalizedRow {
  const bookedRaw = (r["Bokføringsdato"] ?? "").trim();
  const pending = !/^\d{4}\/\d{2}\/\d{2}$/.test(bookedRaw);
  const amount = parseNorwegianAmount(r["Beløp"]) ?? 0;
  const avsender = normalizeAccountNumber(r["Avsender"]);
  const mottaker = normalizeAccountNumber(r["Mottaker"]);
  const outgoing = amount < 0;
  const title = collapseWhitespace(r["Tittel"] ?? "");
  const lexed = lexer(title);
  const counterparty = collapseWhitespace(r["Navn"] ?? "") || null;

  return {
    date: pending ? "" : formatDate(bookedRaw),
    executed_date: null,
    amount,
    currency: collapseWhitespace(r["Valuta"] ?? "") || "NOK",
    original_amount: null,
    original_currency: null,
    conversion_rate: null,
    description: title,
    merchant: normalizeMerchant(lexed.source || title),
    counterparty,
    counterparty_account: (outgoing ? mottaker : avsender) || null,
    own_account: (outgoing ? avsender : mottaker) || null,
    bank_type: collapseWhitespace(r["Betalingstype"] ?? "") || null,
    bank_subtype: null,
    message: null,
    card: null,
    pending,
    loan: null,
    raw: r,
  };
}
