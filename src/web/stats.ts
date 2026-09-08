/** Least-squares line through (index, value). Slope is change per step. */
export function linearTrend(
  values: number[],
): { slope: number; intercept: number } | null {
  const n = values.length;
  if (n < 2) return null;
  const mx = (n - 1) / 2;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (values[i] - my);
    den += (i - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

/** Index range [start, end] of the first and last non-zero value, or null. */
export function activeSpan(values: number[]): [number, number] | null {
  let start = -1;
  let end = -1;
  values.forEach((v, i) => {
    if (v !== 0) {
      if (start < 0) start = i;
      end = i;
    }
  });
  return start < 0 ? null : [start, end];
}

const MIN_TREND_MONTHS = 6;

/**
 * Trend of monthly values as percent change per year relative to the mean
 * level, fitted over the months between first and last activity. Null with
 * fewer than six months of actual activity or no spend.
 */
export function yearlyTrendPct(monthly: number[]): number | null {
  const span = activeSpan(monthly);
  if (!span) return null;
  const values = monthly.slice(span[0], span[1] + 1).map(Math.abs);
  if (values.filter((v) => v > 0).length < MIN_TREND_MONTHS) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean < 1) return null;
  const t = linearTrend(values);
  if (!t) return null;
  return ((t.slope * 12) / mean) * 100;
}

/** Median of the values; 0 for an empty list. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Median monthly sum per key over the given months. A month without a row
 * counts as 0, so something bought in two months out of twelve has a
 * typical month of nothing, which is the point of showing it next to the
 * mean.
 */
export function medianByKey(
  cells: { key: string; month: string; sum: number }[],
  months: string[],
): Map<string, number> {
  const byKey = new Map<string, Map<string, number>>();
  for (const c of cells) {
    let perMonth = byKey.get(c.key);
    if (!perMonth) {
      perMonth = new Map();
      byKey.set(c.key, perMonth);
    }
    perMonth.set(c.month, (perMonth.get(c.month) ?? 0) + c.sum);
  }
  const out = new Map<string, number>();
  for (const [key, perMonth] of byKey) {
    out.set(key, median(months.map((m) => perMonth.get(m) ?? 0)));
  }
  return out;
}

export type Averages = {
  days: number;
  weekly: number;
  monthly: number;
  yearly: number;
};

/** Averages of a total over an inclusive date range. */
export function periodAverages(
  total: number,
  fromDate: string,
  toDate: string,
): Averages {
  const days = Math.max(
    1,
    Math.round((Date.parse(toDate) - Date.parse(fromDate)) / 86_400_000) + 1,
  );
  return {
    days,
    weekly: total / (days / 7),
    monthly: total / (days / 30.4375),
    yearly: total / (days / 365.25),
  };
}

/** Last day of a "YYYY-MM" month as ISO date. */
export function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Points for an SVG sparkline; values are plotted as magnitudes. */
export function sparklinePoints(
  values: number[],
  width = 120,
  height = 28,
  pad = 2,
): string {
  if (values.length === 0) return "";
  const mags = values.map((v) => Math.abs(v));
  const max = Math.max(...mags, 1);
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return mags
    .map((v, i) =>
      `${(pad + i * stepX).toFixed(1)},${
        (height - pad - (v / max) * (height - pad * 2)).toFixed(1)
      }`
    )
    .join(" ");
}

/** Regression line over the active span, in sparklinePoints coordinates. */
export function sparklineTrend(
  values: number[],
  width = 120,
  height = 28,
  pad = 2,
): string | null {
  const span = activeSpan(values);
  if (!span) return null;
  const mags = values.map((v) => Math.abs(v));
  const active = mags.slice(span[0], span[1] + 1);
  if (active.filter((v) => v > 0).length < MIN_TREND_MONTHS) return null;
  const t = linearTrend(active);
  if (!t) return null;
  const max = Math.max(...mags, 1);
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const y = (v: number) =>
    height - pad -
    (Math.min(Math.max(v, 0), max) / max) * (height - pad * 2);
  const x1 = pad + span[0] * stepX;
  const x2 = pad + span[1] * stepX;
  const yEnd = t.intercept + t.slope * (active.length - 1);
  return `${x1.toFixed(1)},${y(t.intercept).toFixed(1)} ${x2.toFixed(1)},${
    y(yEnd).toFixed(1)
  }`;
}
