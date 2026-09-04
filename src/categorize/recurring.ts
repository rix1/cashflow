export type RecurringInput = {
  merchant: string;
  category_key: string;
  owner: string;
  date: string;
  amount: number;
};

export type Cadence =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "irregular";

export type RecurringItem = {
  merchant: string;
  category_key: string;
  owners: string[];
  cadence: Cadence;
  count: number;
  first: string;
  last: string;
  median_amount: number;
  monthly_equivalent: number;
  stability: number;
  active: boolean;
};

/**
 * Finds payments that repeat at a steady interval. Groups by merchant across
 * the household, so a subscription paid from either account counts once.
 */
export function detectRecurring(
  rows: RecurringInput[],
  asOf: string,
): RecurringItem[] {
  const groups = new Map<string, RecurringInput[]>();
  for (const row of rows) {
    if (row.amount >= 0) continue;
    const key = row.merchant;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const items: RecurringItem[] = [];
  for (const [merchant, list] of groups) {
    if (list.length < 3) continue;
    list.sort((a, b) => a.date.localeCompare(b.date));
    // Collapse same-day charges so several tickets in a day count as one occurrence.
    const byDay = new Map<string, number>();
    for (const row of list) {
      byDay.set(row.date, (byDay.get(row.date) ?? 0) + row.amount);
    }
    const dates = [...byDay.keys()];
    const amounts = [...byDay.values()].map((a) => Math.abs(a));
    if (dates.length < 3) continue;

    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push(daysBetween(dates[i - 1], dates[i]));
    }
    const medianInterval = median(intervals);
    const cadence = classify(medianInterval);
    if (cadence === "irregular") continue;

    const medianAmount = median(amounts);
    const stability = medianAmount === 0
      ? 1
      : median(amounts.map((a) => Math.abs(a - medianAmount))) / medianAmount;
    const last = dates[dates.length - 1];
    const active = daysBetween(last, asOf) <= medianInterval * 1.6 + 7;
    items.push({
      merchant,
      category_key: mostCommon(list.map((r) => r.category_key)),
      owners: [...new Set(list.map((r) => r.owner))],
      cadence,
      count: dates.length,
      first: dates[0],
      last,
      median_amount: round2(medianAmount),
      monthly_equivalent: round2(medianAmount * perMonth(cadence)),
      stability: round2(stability),
      active,
    });
  }
  return items.sort((a, b) => b.monthly_equivalent - a.monthly_equivalent);
}

function classify(days: number): Cadence {
  if (days >= 5 && days <= 9) return "weekly";
  if (days >= 24 && days <= 38) return "monthly";
  if (days >= 80 && days <= 100) return "quarterly";
  if (days >= 340 && days <= 395) return "yearly";
  return "irregular";
}

function perMonth(c: Cadence): number {
  switch (c) {
    case "weekly":
      return 52 / 12;
    case "monthly":
      return 1;
    case "quarterly":
      return 1 / 3;
    case "yearly":
      return 1 / 12;
    default:
      return 0;
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function daysBetween(a: string, b: string): number {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
