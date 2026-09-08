import { assertEquals } from "@std/assert";
import { categorizeAll } from "../categorize/mod.ts";
import { TEST_CONFIG, testDatabase } from "../db/testdb.ts";
import {
  averages,
  getTransaction,
  heldOut,
  linkReimbursement,
  monthlyFlows,
  reimbursementCandidates,
  upsertOverride,
} from "./queries.ts";

Deno.test("a linked inflow takes the reimbursed expense's category and follows it", () => {
  const db = testDatabase([
    { merchant: "AIRBNB", date: "2026-07-07", amount: -18000 },
    { merchant: "OLD RECEIPT", date: "2025-12-01", amount: -500 },
    {
      merchant: "FRIEND",
      date: "2026-08-24",
      amount: 20000,
      bank_type: "Straksinnbetaling",
    },
  ]);
  upsertOverride(db, "fp0", { category_key: "travel" });
  categorizeAll(db, TEST_CONFIG);
  const inflow = getTransaction(db, 3)!;
  assertEquals(inflow.category_key, "people");
  // Candidates: expenses in the half year before the inflow only.
  assertEquals(
    reimbursementCandidates(db, inflow).map((c) => c.fingerprint),
    ["fp0"],
  );

  linkReimbursement(db, inflow.fingerprint, "fp0");
  categorizeAll(db, TEST_CONFIG);
  let row = getTransaction(db, 3)!;
  assertEquals([row.category_key, row.category_source], [
    "travel",
    "reimbursement",
  ]);
  assertEquals(row.reimburses_merchant, "AIRBNB");
  assertEquals(getTransaction(db, 1)!.reimbursed, 20000);

  // The expense moves category; the inflow follows on the next run.
  upsertOverride(db, "fp0", { category_key: "gifts" });
  categorizeAll(db, TEST_CONFIG);
  assertEquals(getTransaction(db, 3)!.category_key, "gifts");

  // Unlinking hands the inflow back to the rules.
  linkReimbursement(db, inflow.fingerprint, null);
  categorizeAll(db, TEST_CONFIG);
  row = getTransaction(db, 3)!;
  assertEquals([row.category_key, row.reimburses], ["people", null]);
  assertEquals(getTransaction(db, 1)!.reimbursed, 0);
});

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
