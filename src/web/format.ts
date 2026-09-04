const nokFormatter = new Intl.NumberFormat("nb-NO", {
  maximumFractionDigits: 0,
});
const nokFormatter2 = new Intl.NumberFormat("nb-NO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function nok(n: number | null | undefined, decimals = false): string {
  if (n == null || Number.isNaN(n)) return "–";
  return (decimals ? nokFormatter2 : nokFormatter).format(n).replace(/−/g, "-");
}

export function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return `${Math.round(n * 100)} %`;
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "mai",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "des",
];

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}

export function monthLabelLong(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** "2026-03" + n months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

export function isMonth(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}
