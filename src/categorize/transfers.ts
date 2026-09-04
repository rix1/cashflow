import type { Database } from "../db/db.ts";

type Candidate = {
  id: number;
  account_id: number;
  date: string;
  amount: number;
};

const LINKABLE = [
  "transfer:own",
  "transfer:partner",
  "savings:deposit",
  "savings:withdrawal",
];

/**
 * Pairs the two sides of a transfer (money out of one own account, into
 * another) within a 3 day window and stamps both with the same transfer_group.
 */
export function linkTransfers(db: Database): number {
  db.exec(`UPDATE transactions SET transfer_group = NULL`);
  const rows = db
    .prepare(
      `SELECT id, account_id, date, amount FROM transactions
       WHERE category_key IN (${LINKABLE.map((k) => `'${k}'`).join(",")})
       ORDER BY date, id`,
    )
    .all<Candidate>();

  const byAbs = new Map<string, Candidate[]>();
  for (const row of rows) {
    const key = Math.abs(row.amount).toFixed(2);
    if (!byAbs.has(key)) byAbs.set(key, []);
    byAbs.get(key)!.push(row);
  }

  const update = db.prepare(
    `UPDATE transactions SET transfer_group = :g WHERE id = :id`,
  );
  const used = new Set<number>();
  let pairs = 0;
  for (const candidates of byAbs.values()) {
    for (const out of candidates) {
      if (out.amount >= 0 || used.has(out.id)) continue;
      const match = candidates.find(
        (inn) =>
          inn.amount > 0 && !used.has(inn.id) &&
          inn.account_id !== out.account_id &&
          daysBetween(out.date, inn.date) <= 3,
      );
      if (!match) continue;
      used.add(out.id);
      used.add(match.id);
      const group = `tg:${Math.min(out.id, match.id)}`;
      update.run({ g: group, id: out.id });
      update.run({ g: group, id: match.id });
      pairs++;
    }
  }
  update.finalize();
  return pairs;
}

function daysBetween(a: string, b: string): number {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86_400_000);
}
