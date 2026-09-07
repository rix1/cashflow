import { assertAlmostEquals, assertEquals } from "@std/assert";
import {
  activeSpan,
  linearTrend,
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
