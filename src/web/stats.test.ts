import { assertAlmostEquals, assertEquals } from "@std/assert";
import {
  activeSpan,
  linearTrend,
  median,
  medianByKey,
  monthEnd,
  periodAverages,
  sparklinePoints,
  sparklineTrend,
  yearlyTrendPct,
} from "./stats.ts";

Deno.test("linearTrend fits a straight line", () => {
  const t = linearTrend([10, 20, 30, 40])!;
  assertAlmostEquals(t.slope, 10);
  assertAlmostEquals(t.intercept, 10);
  assertEquals(linearTrend([5]), null);
  assertAlmostEquals(linearTrend([7, 7, 7])!.slope, 0);
});

Deno.test("yearlyTrendPct uses the active span only", () => {
  assertEquals(yearlyTrendPct([1, 2, 3]), null);
  assertEquals(yearlyTrendPct([0, 0, 0, 0, 0, 0]), null);
  const up = yearlyTrendPct([100, 110, 120, 130, 140, 150])!;
  assertAlmostEquals(up, (10 * 12) / 125 * 100, 1e-9);
  const padded = yearlyTrendPct([
    0,
    0,
    0,
    -100,
    -110,
    -120,
    -130,
    -140,
    -150,
    0,
    0,
  ])!;
  assertAlmostEquals(padded, up, 1e-9);
  assertEquals(yearlyTrendPct([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -5000, 0]), null);
  assertEquals(activeSpan([0, 0, 3, 0, 4, 0]), [2, 4]);
  assertEquals(activeSpan([0, 0]), null);
  assertEquals(sparklineTrend([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -5000, 0]), null);
  // Two purchases a year apart span 13 months but are not a trend.
  assertEquals(
    yearlyTrendPct([-900, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -3000]),
    null,
  );
});

Deno.test("periodAverages over a year", () => {
  const a = periodAverages(-12000, "2025-01-01", "2025-12-31");
  assertEquals(a.days, 365);
  assertAlmostEquals(a.weekly, -12000 / (365 / 7), 1e-6);
  assertAlmostEquals(a.monthly, -12000 / (365 / 30.4375), 1e-6);
  assertAlmostEquals(a.yearly, -12000 / (365 / 365.25), 1e-6);
});

Deno.test("monthEnd handles February and December", () => {
  assertEquals(monthEnd("2024-02"), "2024-02-29");
  assertEquals(monthEnd("2026-12"), "2026-12-31");
});

Deno.test("sparklinePoints scales magnitudes into the box", () => {
  const pts = sparklinePoints([-10, -20], 100, 20, 0).split(" ");
  assertEquals(pts, ["0.0,10.0", "100.0,0.0"]);
  assertEquals(sparklinePoints([]), "");
});

Deno.test("median: odd, even and empty", () => {
  assertEquals(median([5, 1, 3]), 3);
  assertEquals(median([4, 1, 3, 2]), 2.5);
  assertEquals(median([]), 0);
});

Deno.test("medianByKey counts months without rows as zero", () => {
  const months = ["2026-01", "2026-02", "2026-03", "2026-04"];
  const cells = [
    { key: "travel", month: "2026-01", sum: -18000 },
    { key: "groceries", month: "2026-01", sum: -6000 },
    { key: "groceries", month: "2026-02", sum: -5000 },
    { key: "groceries", month: "2026-03", sum: -7000 },
    { key: "groceries", month: "2026-04", sum: -6500 },
    { key: "groceries", month: "2026-04", sum: -500 },
  ];
  const m = medianByKey(cells, months);
  // One big trip in four months: the typical month is nothing.
  assertEquals(m.get("travel"), 0);
  // Two cells in April add up before the median is taken.
  assertEquals(m.get("groceries"), -6500);
});
