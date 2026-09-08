import { assert, assertEquals } from "@std/assert";
import { Database } from "@db/sqlite";
import { openDatabase } from "./db.ts";
import { SCHEMA_VERSION } from "./schema.ts";

/** The tables every earlier version had, as far as the migration cares. */
const BASE_SCHEMA = `
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT NOT NULL UNIQUE, owner TEXT NOT NULL,
  bank TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'checking',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT, file_name TEXT NOT NULL, file_hash TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL, account_id INTEGER NOT NULL REFERENCES accounts(id), row_count INTEGER NOT NULL,
  inserted_count INTEGER NOT NULL, skipped_count INTEGER NOT NULL, pending_count INTEGER NOT NULL,
  period_start TEXT, period_end TEXT, opening_balance REAL, opening_date TEXT, closing_balance REAL,
  closing_date TEXT, total_in REAL, total_out REAL, imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE categories (
  key TEXT PRIMARY KEY, name TEXT NOT NULL, group_name TEXT NOT NULL, kind TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, fingerprint TEXT NOT NULL UNIQUE,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  import_id INTEGER NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  date TEXT NOT NULL, executed_date TEXT, amount REAL NOT NULL, currency TEXT NOT NULL,
  original_amount REAL, original_currency TEXT, conversion_rate REAL, description TEXT NOT NULL,
  merchant TEXT NOT NULL, counterparty TEXT, counterparty_account TEXT, bank_type TEXT, bank_subtype TEXT,
  message TEXT, card TEXT, raw TEXT NOT NULL, category_key TEXT REFERENCES categories(key),
  category_source TEXT, transfer_group TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO categories(key, name, group_name, kind) VALUES ('groceries', 'Dagligvarer', 'Mat', 'expense');
`;

const V2_OVERRIDES = `
CREATE TABLE overrides (
  fingerprint TEXT PRIMARY KEY,
  category_key TEXT NOT NULL REFERENCES categories(key),
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO meta VALUES ('schema_version', '2');
INSERT INTO overrides(fingerprint, category_key, note) VALUES ('fp1', 'groceries', 'kept');
`;

const V3_OVERRIDES = `
CREATE TABLE overrides (
  fingerprint TEXT PRIMARY KEY,
  category_key TEXT REFERENCES categories(key),
  reimburses TEXT,
  one_off INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO meta VALUES ('schema_version', '3');
INSERT INTO overrides(fingerprint, category_key, note) VALUES ('fp1', 'groceries', 'kept');
INSERT INTO overrides(fingerprint, reimburses) VALUES ('fp2', 'fpX');
INSERT INTO overrides(fingerprint, one_off) VALUES ('fp3', 1);
`;

const CURRENT_OVERRIDE_COLUMNS = [
  "fingerprint",
  "category_key",
  "one_off",
  "note",
  "updated_at",
];

function columns(db: Database, table: string): string[] {
  return db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>()
    .map((c) => c.name);
}

type OverrideRow = {
  fingerprint: string;
  category_key: string | null;
  note: string | null;
  one_off: number;
};

/** Creates a file database with the given old DDL, opens it twice, runs the check each time. */
function withMigrated(
  ddl: string,
  check: (db: Database, pass: number) => void,
) {
  Deno.mkdirSync(".cache", { recursive: true });
  const path = `.cache/test-migrate-${crypto.randomUUID()}.sqlite3`;
  try {
    const old = new Database(path);
    old.exec(ddl);
    old.close();
    for (const pass of [1, 2]) {
      const db = openDatabase(path);
      try {
        assert(columns(db, "transactions").includes("one_off"), `pass ${pass}`);
        assertEquals(columns(db, "overrides"), CURRENT_OVERRIDE_COLUMNS);
        assertEquals(
          db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`)
            .get<{ value: string }>()?.value,
          String(SCHEMA_VERSION),
        );
        check(db, pass);
      } finally {
        db.close();
      }
    }
  } finally {
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        Deno.removeSync(path + suffix);
      } catch {
        // already gone
      }
    }
  }
}

const overrideRows = (db: Database) =>
  db.prepare(
    `SELECT fingerprint, category_key, note, one_off FROM overrides ORDER BY fingerprint`,
  ).all<OverrideRow>();

Deno.test("openDatabase migrates a v2 database and keeps its overrides", () => {
  withMigrated(BASE_SCHEMA + V2_OVERRIDES, (db) => {
    assertEquals(overrideRows(db), [
      {
        fingerprint: "fp1",
        category_key: "groceries",
        note: "kept",
        one_off: 0,
      },
    ]);
    // The relaxed column accepts a flag-only row now.
    db.exec(`INSERT INTO overrides(fingerprint, one_off) VALUES ('fpN', 1)`);
    db.exec(`DELETE FROM overrides WHERE fingerprint = 'fpN'`);
  });
});

Deno.test("openDatabase drops the v3 link column and the rows that only held a link", () => {
  withMigrated(BASE_SCHEMA + V3_OVERRIDES, (db) => {
    assertEquals(overrideRows(db), [
      {
        fingerprint: "fp1",
        category_key: "groceries",
        note: "kept",
        one_off: 0,
      },
      { fingerprint: "fp3", category_key: null, note: null, one_off: 1 },
    ]);
  });
});
