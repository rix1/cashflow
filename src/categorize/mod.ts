import type { Database } from "../db/db.ts";
import type { Config } from "../config.ts";
import { CATEGORIES } from "./categories.ts";
import { SEED_RULES } from "./seed-rules.ts";
import {
  type CategorizationContext,
  categorizeTransaction,
  type CompiledRule,
  compileRule,
  isSalary,
  type KnownAccount,
  type TxForCategorization,
} from "./engine.ts";
import { linkTransfers } from "./transfers.ts";

export { detectRecurring } from "./recurring.ts";
export { exactPattern } from "./engine.ts";

const SEED_PRIORITY_BASE = 500;
export const USER_PRIORITY_DEFAULT = 100;

/** Keeps the categories and seed rules in the DB in sync with the code. */
export function syncSeedData(db: Database) {
  db.transaction(() => {
    CATEGORIES.forEach((c, i) => {
      db.exec(
        `INSERT INTO categories(key, name, group_name, kind, sort) VALUES (:key, :name, :group, :kind, :sort)
         ON CONFLICT(key) DO UPDATE SET name = excluded.name, group_name = excluded.group_name, kind = excluded.kind, sort = excluded.sort`,
        { key: c.key, name: c.name, group: c.group, kind: c.kind, sort: i },
      );
    });
    const names = SEED_RULES.map((r) => r.name);
    SEED_RULES.forEach((r, i) => {
      db.exec(
        `INSERT INTO rules(priority, name, field, pattern, category_key, source) VALUES (:priority, :name, :field, :pattern, :category, 'seed')
         ON CONFLICT(source, name) DO UPDATE SET priority = excluded.priority, field = excluded.field, pattern = excluded.pattern, category_key = excluded.category_key`,
        {
          priority: SEED_PRIORITY_BASE + i,
          name: r.name,
          field: r.field,
          pattern: r.pattern,
          category: r.category,
        },
      );
    });
    const placeholders = names.map((_, i) => `:n${i}`).join(",");
    const params = Object.fromEntries(names.map((n, i) => [`n${i}`, n]));
    db.exec(
      `DELETE FROM rules WHERE source = 'seed' AND name NOT IN (${placeholders})`,
      params,
    );
  })();
}

export function loadContext(
  db: Database,
  config: Config,
): CategorizationContext {
  const accountsByNumber = new Map<string, KnownAccount>();
  for (
    const a of db.prepare(`SELECT id, number, owner, kind FROM accounts`).all<
      { id: number; number: string; owner: string; kind: string }
    >()
  ) {
    accountsByNumber.set(a.number, { id: a.id, owner: a.owner, kind: a.kind });
  }
  const rules = db
    .prepare(
      `SELECT id, priority, name, field, pattern, category_key, source FROM rules WHERE enabled = 1 ORDER BY priority, id`,
    )
    .all<
      {
        id: number;
        priority: number;
        name: string;
        field: string;
        pattern: string;
        category_key: string;
        source: string;
      }
    >()
    .map(compileRule)
    .filter((r): r is CompiledRule => r !== null);
  const overrides = new Map<string, string>();
  for (
    const o of db.prepare(
      `SELECT fingerprint, category_key FROM overrides WHERE category_key IS NOT NULL`,
    ).all<{ fingerprint: string; category_key: string }>()
  ) {
    overrides.set(o.fingerprint, o.category_key);
  }
  const salaryPayers = new Set<string>();
  for (
    const row of db.prepare(
      `SELECT merchant, bank_type, amount FROM transactions`,
    ).all<{ merchant: string; bank_type: string | null; amount: number }>()
  ) {
    if (isSalary(row)) salaryPayers.add(row.merchant);
  }
  return { config, accountsByNumber, rules, overrides, salaryPayers };
}

/** Mirrors the one-off flag from overrides onto transactions so aggregates can filter without a join. */
function applyOneOffs(db: Database) {
  db.exec(
    `UPDATE transactions
     SET one_off = IFNULL((SELECT o.one_off FROM overrides o WHERE o.fingerprint = transactions.fingerprint), 0)`,
  );
}

export type CategorizeStats = {
  total: number;
  uncategorized: number;
  transfersLinked: number;
  byCategory: { category: string; count: number; sum: number }[];
};

export function categorizeAll(db: Database, config: Config): CategorizeStats {
  syncSeedData(db);
  const ctx = loadContext(db, config);
  const rows = db
    .prepare(
      `SELECT t.id, t.fingerprint, t.account_id, a.owner, t.amount, t.merchant, t.description, t.counterparty,
              t.counterparty_account, t.bank_type, t.bank_subtype, t.message
       FROM transactions t JOIN accounts a ON a.id = t.account_id`,
    )
    .all<TxForCategorization>();

  const update = db.prepare(
    `UPDATE transactions SET category_key = :category, category_source = :source WHERE id = :id`,
  );
  let uncategorized = 0;
  db.transaction(() => {
    for (const tx of rows) {
      const result = categorizeTransaction(tx, ctx);
      if (result.category_key === "uncategorized") uncategorized++;
      update.run({
        category: result.category_key,
        source: result.source,
        id: tx.id,
      });
    }
  })();
  update.finalize();
  applyOneOffs(db);
  const transfersLinked = linkTransfers(db);

  const byCategory = db
    .prepare(
      `SELECT category_key AS category, COUNT(*) AS count, ROUND(SUM(amount)) AS sum FROM transactions GROUP BY 1 ORDER BY 3`,
    )
    .all<{ category: string; count: number; sum: number }>();
  return { total: rows.length, uncategorized, transfersLinked, byCategory };
}
