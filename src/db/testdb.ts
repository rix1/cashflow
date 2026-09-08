import { Database } from "@db/sqlite";
import { syncSeedData } from "../categorize/mod.ts";
import type { Config } from "../config.ts";
import { SCHEMA } from "./schema.ts";

/** Two owners, a checking account each, one savings account. */
export const TEST_CONFIG: Config = {
  owners: {
    alice: { name: "Alice", aliases: ["Alice Example", "ALICE EXAMPLE"] },
    bob: { name: "Bob", aliases: ["Bob Example"] },
  },
  accounts: [
    {
      number: "1111",
      owner: "alice",
      bank: "hb",
      name: "brukskonto",
      kind: "checking",
    },
    {
      number: "3333",
      owner: "bob",
      bank: "hb",
      name: "brukskonto",
      kind: "checking",
    },
    {
      number: "5555",
      owner: "alice",
      bank: "hb",
      name: "ask",
      kind: "savings",
    },
  ],
};

export type SeedRow = Partial<{
  account: string;
  date: string;
  amount: number;
  merchant: string;
  description: string;
  counterparty: string | null;
  counterparty_account: string | null;
  bank_type: string | null;
  bank_subtype: string | null;
  message: string | null;
}>;

/**
 * In-memory database with TEST_CONFIG's accounts and the given rows.
 * Row i gets fingerprint `fp{i}` and id i + 1. Categories and seed rules are
 * in place; nothing is categorized yet.
 */
export function testDatabase(rows: SeedRow[]): Database {
  const db = new Database(":memory:");
  db.exec(SCHEMA);
  syncSeedData(db);
  for (const a of TEST_CONFIG.accounts) {
    db.exec(
      `INSERT INTO accounts(number, owner, bank, name, kind) VALUES (:n, :o, :b, :name, :k)`,
      { n: a.number, o: a.owner, b: a.bank, name: a.name, k: a.kind },
    );
  }
  db.exec(
    `INSERT INTO imports(file_name, file_hash, format, account_id, row_count, inserted_count, skipped_count, pending_count) VALUES ('t', 'h', 'test', 1, 0, 0, 0, 0)`,
  );
  rows.forEach((r, i) => {
    const account = db.prepare(`SELECT id FROM accounts WHERE number = :n`).get<
      { id: number }
    >({ n: r.account ?? "1111" })!;
    db.exec(
      `INSERT INTO transactions(fingerprint, account_id, import_id, date, amount, currency, description, merchant, counterparty, counterparty_account, bank_type, bank_subtype, message, raw)
       VALUES (:fp, :acc, 1, :date, :amount, 'NOK', :description, :merchant, :cp, :cpa, :bt, :bst, :msg, '{}')`,
      {
        fp: `fp${i}`,
        acc: account.id,
        date: r.date ?? "2026-01-15",
        amount: r.amount ?? -100,
        description: r.description ?? r.merchant ?? "X",
        merchant: r.merchant ?? "X",
        cp: r.counterparty ?? null,
        cpa: r.counterparty_account ?? null,
        bt: r.bank_type ?? null,
        bst: r.bank_subtype ?? null,
        msg: r.message ?? null,
      },
    );
  });
  return db;
}
