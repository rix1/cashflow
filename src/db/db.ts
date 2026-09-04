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
  db.exec(
    `INSERT INTO meta(key, value) VALUES ('schema_version', :v)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    { v: String(SCHEMA_VERSION) },
  );
  return db;
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
