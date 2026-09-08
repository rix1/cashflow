import { Database } from "@db/sqlite";
import { existsSync } from "@std/fs";
import { SCHEMA, SCHEMA_VERSION } from "./schema.ts";

export const DB_PATH = "./cashflow.sqlite3";

export type { Database };

/**
 * Opens (and creates/migrates) the cashflow database.
 * A v1 database at the same path is renamed to a backup, never deleted.
 */
export function openDatabase(path = DB_PATH): Database {
  if (existsSync(path)) backupIfLegacy(path);
  const db = new Database(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  // Wait for a concurrent writer (e.g. a running `deno task serve`) instead of failing with "database is locked".
  db.exec("PRAGMA busy_timeout = 10000");
  db.exec(SCHEMA);
  migrate(db);
  db.exec(
    `INSERT INTO meta(key, value) VALUES ('schema_version', :v)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    { v: String(SCHEMA_VERSION) },
  );
  return db;
}

/**
 * Brings a database created by an earlier version up to the current shape.
 * Every step checks the actual table first, so this is safe to run on every
 * open. CREATE TABLE IF NOT EXISTS in SCHEMA never alters existing tables.
 */
function migrate(db: Database) {
  const info = (table: string) =>
    db.prepare(`PRAGMA table_info(${table})`).all<
      { name: string; notnull: number }
    >();
  const has = (table: string, column: string) =>
    info(table).some((c) => c.name === column);

  if (!has("transactions", "one_off")) {
    db.exec(
      `ALTER TABLE transactions ADD COLUMN one_off INTEGER NOT NULL DEFAULT 0`,
    );
  }

  const overrides = info("overrides");
  const categoryRequired =
    overrides.find((c) => c.name === "category_key")?.notnull === 1;
  if (categoryRequired) {
    // v2 had category_key NOT NULL; SQLite cannot relax that in place, so
    // rebuild the table from SCHEMA and copy the rows over.
    db.transaction(() => {
      db.exec(`ALTER TABLE overrides RENAME TO overrides_v2`);
      db.exec(SCHEMA);
      db.exec(
        `INSERT INTO overrides(fingerprint, category_key, note, updated_at)
         SELECT fingerprint, category_key, note, updated_at FROM overrides_v2`,
      );
      db.exec(`DROP TABLE overrides_v2`);
    })();
  } else if (overrides.some((c) => c.name === "reimburses")) {
    // v3 carried reimbursement links. Rows that held only a link are empty
    // without it.
    db.transaction(() => {
      db.exec(`ALTER TABLE overrides DROP COLUMN reimburses`);
      db.exec(
        `DELETE FROM overrides WHERE category_key IS NULL AND one_off = 0`,
      );
    })();
  }
}

function backupIfLegacy(path: string) {
  const probe = new Database(path, { readonly: true });
  try {
    const columns = probe
      .prepare(`PRAGMA table_info(transactions)`)
      .all<{ name: string }>()
      .map((c) => c.name);
    const isLegacy = columns.length > 0 && !columns.includes("fingerprint");
    if (!isLegacy) return;
  } finally {
    probe.close();
  }
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  const backup = path.replace(/\.sqlite3$/, "") + `.v1-backup-${stamp}.sqlite3`;
  Deno.renameSync(path, backup);
  console.warn(`Found a v1 database at ${path}; moved it to ${backup}.`);
}
