import { assertEquals } from "@std/assert";
import { Database } from "@db/sqlite";
import { SCHEMA } from "../db/schema.ts";
import type { Config } from "../config.ts";
import { categorizeAll, syncSeedData } from "./mod.ts";
import { detectRecurring } from "./recurring.ts";
import { CATEGORIES, CATEGORY_BY_KEY } from "./categories.ts";
import { SEED_RULES } from "./seed-rules.ts";

const config: Config = {
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
      number: "2222",
      owner: "alice",
      bank: "nordea",
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
      number: "4444",
      owner: "alice",
      bank: "hb",
      name: "boliglån",
      kind: "loan",
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

type Seed = Partial<{
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

function setup(rows: Seed[]) {
  const db = new Database(":memory:");
  db.exec(SCHEMA);
  for (const a of config.accounts) {
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

function categoriesOf(
  db: Database,
): {
  category_key: string;
  category_source: string;
  transfer_group: string | null;
}[] {
  return db.prepare(
    `SELECT category_key, category_source, transfer_group FROM transactions ORDER BY id`,
  ).all();
}

Deno.test("seed rules reference known categories and compile", () => {
  for (const rule of SEED_RULES) {
    assertEquals(
      CATEGORY_BY_KEY.has(rule.category),
      true,
      `rule ${rule.name} → ${rule.category}`,
    );
    new RegExp(rule.pattern, "i");
  }
  assertEquals(new Set(CATEGORIES.map((c) => c.key)).size, CATEGORIES.length);
});

Deno.test("bank signals, transfers, rules and overrides", () => {
  const db = setup([
    { merchant: "OTOVO ASA", amount: 50000, bank_type: "Lønn" },
    {
      merchant: "KONTO 4444",
      amount: -25000,
      counterparty_account: "4444",
      bank_subtype: "Nedbetaling av lån",
      message: "Avdrag: kr 8.000,00",
    },
    { merchant: "ALICE EXAMPLE", amount: -10000, counterparty_account: "2222" },
    {
      merchant: "ALICE EXAMPLE",
      amount: 10000,
      account: "2222",
      date: "2026-01-16",
      description: "Alice Example",
    },
    { merchant: "BOB EXAMPLE", amount: -5000, counterparty: "Bob Example" },
    { merchant: "JOKER ILA", amount: -120 },
    { merchant: "SPOTIFY", amount: -169 },
    { merchant: "EIDE ALICE", amount: -50000, counterparty_account: "5555" },
    { merchant: "SOMETHING NEW", amount: -999 },
    {
      merchant: "OTOVO ASA",
      amount: 1200,
      bank_subtype: "Overføring fra annen konto",
    },
    {
      merchant: "UNKNOWN SAVINGS",
      amount: -3000,
      counterparty_account: "9999",
      bank_subtype: "Overføring til egen konto",
    },
    {
      merchant: "BANK",
      amount: 820000,
      bank_subtype: "Utstedt tilbakebetaling av lån",
    },
  ]);
  syncSeedData(db);
  db.exec(
    `INSERT INTO overrides(fingerprint, category_key) VALUES ('fp8', 'gifts')`,
  );
  const stats = categorizeAll(db, config);
  const got = categoriesOf(db);
  assertEquals(got.map((g) => g.category_key), [
    "income:salary",
    "housing:mortgage",
    "transfer:own",
    "transfer:own",
    "transfer:partner",
    "groceries",
    "subscriptions",
    "savings:deposit",
    "gifts",
    "income:refund",
    "transfer:own",
    "loans:disbursement",
  ]);
  assertEquals(got[8].category_source, "manual");
  assertEquals(got[2].transfer_group, got[3].transfer_group);
  assertEquals(got[2].transfer_group !== null, true);
  assertEquals(stats.transfersLinked, 1);
  assertEquals(stats.uncategorized, 0);
  db.close();
});

Deno.test("user rules beat seed rules; lump sum to loan account is a payoff", () => {
  const db = setup([
    { merchant: "JOKER ILA", amount: -120 },
    {
      merchant: "OLD LOAN",
      amount: -800000,
      counterparty_account: "4444",
      bank_subtype: "Utgående betaling med melding",
    },
  ]);
  syncSeedData(db);
  db.exec(
    `INSERT INTO rules(priority, name, field, pattern, category_key, source) VALUES (100, 'joker is cafe', 'merchant', '^JOKER', 'dining:cafe', 'user')`,
  );
  categorizeAll(db, config);
  assertEquals(categoriesOf(db).map((g) => g.category_key), [
    "dining:cafe",
    "loans:payoff",
  ]);
  db.close();
});

Deno.test("detectRecurring finds monthly subscriptions and ignores noise", () => {
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    rows.push({
      merchant: "SPOTIFY",
      category_key: "subscriptions",
      owner: "alice",
      date: `2026-${String(m).padStart(2, "0")}-05`,
      amount: -169,
    });
    rows.push({
      merchant: "RUTER",
      category_key: "transport:public",
      owner: "alice",
      date: `2026-${String(m).padStart(2, "0")}-${
        String(m * 2).padStart(2, "0")
      }`,
      amount: -40,
    });
  }
  rows.push({
    merchant: "IKEA",
    category_key: "shopping:home",
    owner: "alice",
    date: "2026-03-01",
    amount: -5000,
  });
  rows.push({
    merchant: "IKEA",
    category_key: "shopping:home",
    owner: "alice",
    date: "2026-03-09",
    amount: -300,
  });
  rows.push({
    merchant: "IKEA",
    category_key: "shopping:home",
    owner: "alice",
    date: "2026-07-20",
    amount: -900,
  });
  const items = detectRecurring(rows, "2026-12-20");
  const spotify = items.find((i) => i.merchant === "SPOTIFY")!;
  assertEquals(spotify.cadence, "monthly");
  assertEquals(spotify.monthly_equivalent, 169);
  assertEquals(spotify.active, true);
  assertEquals(items.some((i) => i.merchant === "IKEA"), false);
});
