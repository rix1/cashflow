import type { NormalizedRow } from "./types.ts";

/**
 * Stable identity for a statement line. Identical lines within one file are
 * legitimate (several bus tickets in a day), so an ordinal separates them.
 * The same line in two exports gets the same fingerprint and is skipped.
 */
export async function fingerprintRows(
  rows: NormalizedRow[],
  accountNumber: string,
): Promise<string[]> {
  const seen = new Map<string, number>();
  const out: string[] = [];
  for (const row of rows) {
    const base = [
      accountNumber,
      row.date,
      row.executed_date ?? "",
      row.amount.toFixed(2),
      row.currency,
      foldText(row.description),
      foldText(row.message ?? ""),
    ].join("|");
    const ordinal = seen.get(base) ?? 0;
    seen.set(base, ordinal + 1);
    out.push(await sha256(`${base}|${ordinal}`));
  }
  return out;
}

/**
 * Banks sometimes mangle non-Latin characters differently between export
 * versions ("F?RS?KRING" in one, "F™RSŽKRING" in another). Folding anything
 * outside printable ASCII + Latin-1 to "?" keeps the fingerprint stable.
 */
export function foldText(input: string): string {
  return input.replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, "?");
}

export async function sha256(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(
    new Uint8Array(digest),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
