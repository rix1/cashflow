import { assertEquals } from "@std/assert";
import { categorizeAll } from "../categorize/mod.ts";
import { TEST_CONFIG, testDatabase } from "../db/testdb.ts";
import {
  averages,
  categoryTotals,
  getTransaction,
  heldOut,
  listTransactions,
  monthlyFlows,
  setOneOff,
  setOverride,
  vendorList,
} from "./queries.ts";

Deno.test("operating income counts salary, not one-off inflows or unknown money in", () => {
  const db = testDatabase([
    {
      merchant: "EMPLOYER",
      date: "2026-01-10",
      amount: 50000,
      bank_type: "Lønn",
    },
    {
      merchant: "SOMEONE",
      date: "2026-01-12",
      amount: 10000,
      bank_type: "Giro",
    },
    { merchant: "MYSTERY IN", date: "2026-01-13", amount: 300 },
    { merchant: "MYSTERY OUT", date: "2026-01-14", amount: -700 },
    { merchant: "REMA 1000", date: "2026-01-15", amount: -1000 },
  ]);
  categorizeAll(db, TEST_CONFIG);
  const p = { from: "2026-01", to: "2026-01" };
  assertEquals(
    db.prepare(`SELECT category_key FROM transactions ORDER BY id`).all<
      { category_key: string }
    >().map((r) => r.category_key),
    [
      "income:salary",
      "income:other",
      "uncategorized",
      "uncategorized",
      "groceries",
    ],
  );
  const avg = averages(db, p);
  assertEquals([avg.income, avg.expense, avg.net], [50000, -1700, 48300]);
  assertEquals(monthlyFlows(db, p).map((f) => [f.income, f.expense]), [[
    50000,
    -1700,
  ]]);
  assertEquals(heldOut(db, p).otherIncome, { count: 1, sum: 10000 });
});

Deno.test("outside rows are neither income nor expense; only their net is reported", () => {
  const db = testDatabase([
    {
      merchant: "EMPLOYER",
      date: "2026-01-10",
      amount: 50000,
      bank_type: "Lønn",
    },
    { merchant: "AIRBNB", date: "2026-01-07", amount: -18000 },
    {
      merchant: "FRIEND",
      date: "2026-01-20",
      amount: 12000,
      bank_type: "Straksinnbetaling",
    },
    { merchant: "REMA 1000", date: "2026-01-15", amount: -1000 },
  ]);
  categorizeAll(db, TEST_CONFIG);
  const p = { from: "2026-01", to: "2026-01" };
  // As categorized by the rules: the trip is spending and the friend's money
  // shrinks "people", so expenses net to -7000 in the wrong places.
  assertEquals(averages(db, p).expense, -7000);

  setOverride(db, "fp1", "outside:others");
  setOverride(db, "fp2", "outside:others");
  categorizeAll(db, TEST_CONFIG);
  const avg = averages(db, p);
  assertEquals([avg.income, avg.expense], [50000, -1000]);
  // The household's own share of the trip is what is left as the net.
  assertEquals(heldOut(db, p).outside, { count: 2, sum: -6000 });
  assertEquals(
    categoryTotals(db, p).find((c) => c.category_key === "outside:others")?.sum,
    -6000,
  );
  const merchants = vendorList(db, p).rows.map((r) => r.merchant);
  assertEquals(
    merchants.includes("AIRBNB") || merchants.includes("FRIEND"),
    false,
  );
  assertEquals(
    listTransactions(db, { group: "Utenfor" }).rows.map((r) => r.id),
    [3, 2],
  );
});

Deno.test("a one-off stays in the list but out of every average", () => {
  const db = testDatabase([
    {
      merchant: "EMPLOYER",
      date: "2026-01-10",
      amount: 50000,
      bank_type: "Lønn",
    },
    { merchant: "REMA 1000", date: "2026-01-15", amount: -1000 },
    { merchant: "REMA 1000", date: "2026-01-20", amount: -9000 },
  ]);
  categorizeAll(db, TEST_CONFIG);
  const p = { from: "2026-01", to: "2026-01" };
  assertEquals(averages(db, p).expense, -10000);

  setOneOff(db, "fp2", true);
  categorizeAll(db, TEST_CONFIG);
  assertEquals(getTransaction(db, 3)!.one_off, 1);
  assertEquals(averages(db, p).expense, -1000);
  assertEquals(
    categoryTotals(db, p).find((c) => c.category_key === "groceries")?.sum,
    -1000,
  );
  assertEquals(
    vendorList(db, p).rows.find((r) => r.merchant === "REMA 1000")?.sum,
    -1000,
  );
  assertEquals(heldOut(db, p).oneOff, { count: 1, sum: -9000 });
  assertEquals(listTransactions(db, { oneoff: true }).rows.map((r) => r.id), [
    3,
  ]);
  assertEquals(listTransactions(db, {}).total, 3);

  setOneOff(db, "fp2", false);
  categorizeAll(db, TEST_CONFIG);
  assertEquals(averages(db, p).expense, -10000);
  assertEquals(
    db.prepare(`SELECT COUNT(*) AS n FROM overrides`).get<{ n: number }>()!.n,
    0,
  );
});
