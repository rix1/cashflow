/** Parses "-1 003,40", "-1003.40", "8.393,00", "270 039,54 NOK" into a number. */
export function parseNorwegianAmount(
  input: string | null | undefined,
): number | null {
  if (input == null) return null;
  let s = String(input).replace(/[^\d,.\-]/g, "");
  if (!s || s === "-") return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Both present: the last one is the decimal separator.
    if (lastComma > lastDot) s = s.replaceAll(".", "").replace(",", ".");
    else s = s.replaceAll(",", "");
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? round2(n) : null;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
