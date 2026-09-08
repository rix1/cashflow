import { assertEquals } from "@std/assert";
import { categorizeAll } from "../categorize/mod.ts";
import { TEST_CONFIG, testDatabase } from "../db/testdb.ts";
import {
  getTransaction,
  linkReimbursement,
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
