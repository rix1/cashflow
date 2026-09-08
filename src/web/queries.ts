import type { Database } from "../db/db.ts";
import {
  CATEGORIES,
  CATEGORY_BY_KEY,
  GROUP_ORDER,
} from "../categorize/categories.ts";
import {
  detectRecurring,
  type RecurringItem,
} from "../categorize/recurring.ts";
import { addMonths, monthsBetween } from "./format.ts";

export type Period = { from: string; to: string; owner?: string };

export type AccountRow = {
  id: number;
  number: string;
  owner: string;
  bank: string;
  name: string;
  kind: string;
  tx_count: number;
  first_date: string | null;
  last_date: string | null;
};

export function getAccounts(db: Database): AccountRow[] {
  return db
    .prepare(
      `SELECT a.id, a.number, a.owner, a.bank, a.name, a.kind, COUNT(t.id) AS tx_count, MIN(t.date) AS first_date, MAX(t.date) AS last_date
       FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
       GROUP BY a.id ORDER BY a.owner, a.bank, a.name`,
    )
    .all<AccountRow>();
}

export function getOwners(db: Database): string[] {
  return db.prepare(`SELECT DISTINCT owner FROM accounts ORDER BY owner`).all<
    { owner: string }
  >().map((r) => r.owner);
}

export function getDateBounds(
  db: Database,
): { min: string | null; max: string | null } {
  return db.prepare(
    `SELECT MIN(date) AS min, MAX(date) AS max FROM transactions`,
  ).get<{ min: string | null; max: string | null }>()!;
}

/** Default period: the last 12 full months of data. */
export function defaultPeriod(db: Database): { from: string; to: string } {
  const { max } = getDateBounds(db);
  const lastFull = max
    ? addMonths(max.slice(0, 7), -1)
    : new Date().toISOString().slice(0, 7);
  return { from: addMonths(lastFull, -11), to: lastFull };
}

function periodWhere(
  p: Period,
  alias = "t",
): { sql: string; params: Record<string, string> } {
  const params: Record<string, string> = {
    from: `${p.from}-01`,
    to: `${addMonths(p.to, 1)}-01`,
  };
  let sql = `${alias}.date >= :from AND ${alias}.date < :to`;
  if (p.owner) {
    sql += ` AND a.owner = :owner`;
    params.owner = p.owner;
  }
  return { sql, params };
}

/** Income/expense classification used everywhere: uncategorized rows are split by sign. */
const INCOME_EXPR =
  `CASE WHEN c.kind = 'income' OR (t.category_key = 'uncategorized' AND t.amount > 0) THEN t.amount ELSE 0 END`;
const EXPENSE_EXPR =
  `CASE WHEN (c.kind = 'expense' AND t.category_key != 'uncategorized') OR (t.category_key = 'uncategorized' AND t.amount < 0) THEN t.amount ELSE 0 END`;
const SAVING_EXPR = `CASE WHEN c.kind = 'saving' THEN t.amount ELSE 0 END`;

export type MonthlyFlow = {
  month: string;
  owner: string;
  income: number;
  expense: number;
  saving: number;
};

export function monthlyFlows(db: Database, p: Period): MonthlyFlow[] {
  const w = periodWhere(p);
  return db
    .prepare(
      `SELECT substr(t.date, 1, 7) AS month, a.owner,
              SUM(${INCOME_EXPR}) AS income, SUM(${EXPENSE_EXPR}) AS expense, SUM(${SAVING_EXPR}) AS saving
       FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN categories c ON c.key = t.category_key
       WHERE ${w.sql} GROUP BY 1, 2 ORDER BY 1, 2`,
    )
    .all<MonthlyFlow>(w.params);
}

export type CategoryMonth = {
  category_key: string;
  month: string;
  sum: number;
  count: number;
};

export function categoryByMonth(db: Database, p: Period): CategoryMonth[] {
  const w = periodWhere(p);
  return db
    .prepare(
      `SELECT t.category_key, substr(t.date, 1, 7) AS month, SUM(t.amount) AS sum, COUNT(*) AS count
       FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE ${w.sql} GROUP BY 1, 2`,
    )
    .all<CategoryMonth>(w.params);
}

export type CategoryTotal = {
  category_key: string;
  sum: number;
  count: number;
};

export function categoryTotals(db: Database, p: Period): CategoryTotal[] {
  const w = periodWhere(p);
  return db
    .prepare(
      `SELECT t.category_key, SUM(t.amount) AS sum, COUNT(*) AS count
       FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE ${w.sql} GROUP BY 1 ORDER BY SUM(t.amount)`,
    )
    .all<CategoryTotal>(w.params);
}

export type TxDirection = "in" | "out";

export type TxFilters = {
  q?: string;
  /** Any of these category keys (empty or missing = all). */
  category?: string[];
  group?: string;
  /** Any of these owners (empty or missing = whole household). */
  owner?: string[];
  /** Any of these account ids (empty or missing = all). */
  account?: number[];
  /** Month bounds, inclusive: "YYYY-MM" or a full date. */
  from?: string;
  to?: string;
  /** "in" = positive amounts, "out" = negative amounts. */
  direction?: TxDirection;
  uncategorized?: boolean;
  merchant?: string;
  page?: number;
  pageSize?: number;
};

export type TxRow = {
  id: number;
  fingerprint: string;
  date: string;
  amount: number;
  currency: string;
  original_amount: number | null;
  original_currency: string | null;
  description: string;
  merchant: string;
  counterparty: string | null;
  bank_type: string | null;
  bank_subtype: string | null;
  message: string | null;
  category_key: string;
  category_source: string | null;
  transfer_group: string | null;
  owner: string;
  bank: string;
  account_name: string;
  note: string | null;
};

export function listTransactions(
  db: Database,
  f: TxFilters,
): { rows: TxRow[]; total: number; sum: number } {
  const where: string[] = ["1 = 1"];
  const params: Record<string, string | number> = {};
  /** `column IN (...)` with one named parameter per value. */
  const anyOf = (
    column: string,
    prefix: string,
    values: (string | number)[],
  ) => {
    const names = values.map((v, i) => {
      params[`${prefix}${i}`] = v;
      return `:${prefix}${i}`;
    });
    where.push(`${column} IN (${names.join(", ")})`);
  };
  if (f.q) {
    where.push(
      `(t.merchant LIKE :q OR t.description LIKE :q OR IFNULL(t.counterparty, '') LIKE :q OR IFNULL(t.message, '') LIKE :q)`,
    );
    params.q = `%${f.q}%`;
  }
  if (f.category?.length) anyOf("t.category_key", "cat", f.category);
  if (f.group) {
    where.push(`c.group_name = :grp`);
    params.grp = f.group;
  }
  if (f.owner?.length) anyOf("a.owner", "owner", f.owner);
  if (f.account?.length) anyOf("t.account_id", "acct", f.account);
  if (f.direction === "in") where.push(`t.amount > 0`);
  if (f.direction === "out") where.push(`t.amount < 0`);
  if (f.from) {
    where.push(`t.date >= :from`);
    params.from = f.from.length === 7 ? `${f.from}-01` : f.from;
  }
  if (f.to) {
    where.push(`t.date < :to`);
    params.to = f.to.length === 7 ? `${addMonths(f.to, 1)}-01` : f.to;
  }
  if (f.uncategorized) where.push(`t.category_key = 'uncategorized'`);
  if (f.merchant) {
    where.push(`t.merchant = :merchant`);
    params.merchant = f.merchant;
  }
  const base =
    `FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN categories c ON c.key = t.category_key
                LEFT JOIN overrides o ON o.fingerprint = t.fingerprint WHERE ${
      where.join(" AND ")
    }`;
  const totals = db.prepare(
    `SELECT COUNT(*) AS total, IFNULL(SUM(t.amount), 0) AS sum ${base}`,
  ).get<{ total: number; sum: number }>(params)!;
  const pageSize = f.pageSize ?? 200;
  const offset = ((f.page ?? 1) - 1) * pageSize;
  const rows = db
    .prepare(
      `SELECT t.id, t.fingerprint, t.date, t.amount, t.currency, t.original_amount, t.original_currency, t.description, t.merchant,
              t.counterparty, t.bank_type, t.bank_subtype, t.message, t.category_key, t.category_source, t.transfer_group,
              a.owner, a.bank, a.name AS account_name, o.note
       ${base} ORDER BY t.date DESC, t.id DESC LIMIT ${pageSize} OFFSET ${offset}`,
    )
    .all<TxRow>(params);
  return { rows, total: totals.total, sum: totals.sum };
}

export function getTransaction(db: Database, id: number): TxRow | undefined {
  return db
    .prepare(
      `SELECT t.id, t.fingerprint, t.date, t.amount, t.currency, t.original_amount, t.original_currency, t.description, t.merchant,
              t.counterparty, t.bank_type, t.bank_subtype, t.message, t.category_key, t.category_source, t.transfer_group,
              a.owner, a.bank, a.name AS account_name, o.note
       FROM transactions t JOIN accounts a ON a.id = t.account_id LEFT JOIN overrides o ON o.fingerprint = t.fingerprint
       WHERE t.id = :id`,
    )
    .get<TxRow>({ id });
}

export type ReviewGroup = {
  merchant: string;
  count: number;
  sum: number;
  first: string;
  last: string;
  sample: string;
  owners: string;
};

export function reviewQueue(
  db: Database,
  owner?: string,
  limit = 150,
): ReviewGroup[] {
  const params: Record<string, string | number> = { limit };
  let ownerSql = "";
  if (owner) {
    ownerSql = `AND a.owner = :owner`;
    params.owner = owner;
  }
  return db
    .prepare(
      `SELECT t.merchant, COUNT(*) AS count, SUM(t.amount) AS sum, MIN(t.date) AS first, MAX(t.date) AS last,
              MIN(t.description) AS sample, GROUP_CONCAT(DISTINCT a.owner) AS owners
       FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE t.category_key = 'uncategorized' ${ownerSql}
       GROUP BY t.merchant ORDER BY ABS(SUM(t.amount)) DESC LIMIT :limit`,
    )
    .all<ReviewGroup>(params);
}

export function uncategorizedStats(
  db: Database,
): { count: number; sum: number; merchants: number } {
  return db
    .prepare(
      `SELECT COUNT(*) AS count, IFNULL(SUM(amount), 0) AS sum, COUNT(DISTINCT merchant) AS merchants
       FROM transactions WHERE category_key = 'uncategorized'`,
    )
    .get<{ count: number; sum: number; merchants: number }>()!;
}

export type RecurringFilter = {
  owner?: string;
  q?: string;
  cadence?: string;
  kind?: "all" | "subscriptions" | "bills" | "other";
  includeInactive?: boolean;
};

const SUBSCRIPTION_CATEGORIES = new Set(["subscriptions", "membership"]);
const BILL_CATEGORIES = new Set([
  "housing:mortgage",
  "housing:fees",
  "housing:electricity",
  "housing:other",
  "insurance",
  "loans:student",
  "loans:other",
  "donations",
  "fees",
  "taxes",
]);

export function recurringItems(
  db: Database,
  opts: RecurringFilter = {},
): RecurringItem[] {
  const items = recurringItemsRaw(db, opts.owner);
  const q = opts.q?.toLowerCase();
  return items.filter((i) => {
    if (!opts.includeInactive && !i.active) return false;
    if (q && !i.merchant.toLowerCase().includes(q)) return false;
    if (opts.cadence && opts.cadence !== "all" && i.cadence !== opts.cadence) {
      return false;
    }
    if (
      opts.kind === "subscriptions" &&
      !SUBSCRIPTION_CATEGORIES.has(i.category_key)
    ) return false;
    if (opts.kind === "bills" && !BILL_CATEGORIES.has(i.category_key)) {
      return false;
    }
    if (
      opts.kind === "other" &&
      (SUBSCRIPTION_CATEGORIES.has(i.category_key) ||
        BILL_CATEGORIES.has(i.category_key))
    ) return false;
    return true;
  });
}

function recurringItemsRaw(db: Database, owner?: string): RecurringItem[] {
  const params: Record<string, string> = {};
  let ownerSql = "";
  if (owner) {
    ownerSql = `AND a.owner = :owner`;
    params.owner = owner;
  }
  const rows = db
    .prepare(
      `SELECT t.merchant, t.category_key, a.owner, t.date, t.amount
       FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN categories c ON c.key = t.category_key
       WHERE c.kind = 'expense' ${ownerSql}`,
    )
    .all<
      {
        merchant: string;
        category_key: string;
        owner: string;
        date: string;
        amount: number;
      }
    >(params);
  const { max } = getDateBounds(db);
  return detectRecurring(rows, max ?? new Date().toISOString().slice(0, 10));
}

export type LoanMonth = {
  month: string;
  payments: number;
  principal: number;
  interest: number;
  fees: number;
  total: number;
};

export function loanByMonth(db: Database): LoanMonth[] {
  return db
    .prepare(
      `SELECT substr(t.date, 1, 7) AS month, COUNT(*) AS payments, SUM(l.principal) AS principal, SUM(l.interest) AS interest,
              SUM(l.fees) AS fees, SUM(l.principal + l.interest + l.fees) AS total
       FROM loan_payments l JOIN transactions t ON t.id = l.transaction_id
       GROUP BY 1 ORDER BY 1`,
    )
    .all<LoanMonth>();
}

export type MortgageMonth = { month: string; amount: number; count: number };

export function mortgageByMonth(db: Database): MortgageMonth[] {
  return db
    .prepare(
      `SELECT substr(date, 1, 7) AS month, SUM(amount) AS amount, COUNT(*) AS count
       FROM transactions WHERE category_key = 'housing:mortgage' GROUP BY 1 ORDER BY 1`,
    )
    .all<MortgageMonth>();
}

export type Averages = {
  months: number;
  income: number;
  salary: number;
  expense: number;
  expenseExMortgage: number;
  mortgage: number;
  saving: number;
  net: number;
};

/** Monthly averages over a period, household or per owner. */
export function averages(db: Database, p: Period): Averages {
  const w = periodWhere(p);
  const row = db
    .prepare(
      `SELECT SUM(${INCOME_EXPR}) AS income, SUM(${EXPENSE_EXPR}) AS expense,
              SUM(CASE WHEN t.category_key = 'income:salary' THEN t.amount ELSE 0 END) AS salary,
              SUM(CASE WHEN t.category_key = 'housing:mortgage' THEN t.amount ELSE 0 END) AS mortgage,
              SUM(${SAVING_EXPR}) AS saving
       FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN categories c ON c.key = t.category_key
       WHERE ${w.sql}`,
    )
    .get<
      {
        income: number | null;
        salary: number | null;
        expense: number | null;
        mortgage: number | null;
        saving: number | null;
      }
    >(w.params)!;
  const months = monthsCount(p.from, p.to);
  const income = (row.income ?? 0) / months;
  const expense = (row.expense ?? 0) / months;
  const mortgage = (row.mortgage ?? 0) / months;
  return {
    months,
    income,
    salary: (row.salary ?? 0) / months,
    expense,
    expenseExMortgage: expense - mortgage,
    mortgage,
    saving: (row.saving ?? 0) / months,
    net: income + expense,
  };
}

function monthsCount(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
}

export type ImportRow = {
  id: number;
  file_name: string;
  format: string;
  account_id: number;
  owner: string;
  bank: string;
  account_name: string;
  row_count: number;
  inserted_count: number;
  skipped_count: number;
  pending_count: number;
  period_start: string | null;
  period_end: string | null;
  opening_balance: number | null;
  opening_date: string | null;
  closing_balance: number | null;
  closing_date: string | null;
  imported_at: string;
  period_sum: number | null;
};

export function listImports(db: Database): ImportRow[] {
  return db
    .prepare(
      `SELECT i.*, a.owner, a.bank, a.name AS account_name,
              (SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = i.account_id AND t.date >= i.period_start AND t.date <= i.period_end) AS period_sum
       FROM imports i JOIN accounts a ON a.id = i.account_id ORDER BY a.owner, a.bank, i.period_start`,
    )
    .all<ImportRow>();
}

export type Gap = {
  account: AccountRow;
  from: string;
  to: string;
  days: number;
};

/** Holes between import periods per account. */
export function coverageGaps(db: Database): Gap[] {
  const accounts = getAccounts(db);
  const imports = listImports(db);
  const gaps: Gap[] = [];
  for (const account of accounts) {
    const periods = imports
      .filter((i) =>
        i.account_id === account.id && i.period_start && i.period_end
      )
      .map((i) => [i.period_start!, i.period_end!] as [string, string])
      .sort((a, b) => a[0].localeCompare(b[0]));
    let coveredUntil: string | null = null;
    for (const [start, end] of periods) {
      if (coveredUntil && daysBetween(coveredUntil, start) > 7) {
        gaps.push({
          account,
          from: coveredUntil,
          to: start,
          days: Math.round(daysBetween(coveredUntil, start)),
        });
      }
      if (!coveredUntil || end > coveredUntil) coveredUntil = end;
    }
  }
  return gaps;
}

function daysBetween(a: string, b: string): number {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

export type UnknownAccount = {
  counterparty_account: string;
  counterparty: string | null;
  count: number;
  sum: number;
  owners: string;
};

/** Counterparty accounts the bank flags as "own account" but that are missing from accounts.json. */
export function unknownOwnAccounts(db: Database): UnknownAccount[] {
  return db
    .prepare(
      `SELECT t.counterparty_account, MIN(t.counterparty) AS counterparty, COUNT(*) AS count, SUM(t.amount) AS sum, GROUP_CONCAT(DISTINCT a.owner) AS owners
       FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE t.counterparty_account IS NOT NULL AND t.counterparty_account != ''
         AND t.category_source = 'transfer:bank'
         AND t.counterparty_account NOT IN (SELECT number FROM accounts)
       GROUP BY 1 ORDER BY ABS(SUM(t.amount)) DESC`,
    )
    .all<UnknownAccount>();
}

export type RuleRow = {
  id: number;
  priority: number;
  name: string;
  field: string;
  pattern: string;
  category_key: string;
  source: string;
  enabled: number;
  created_at: string;
  matches: number;
};

export function listRules(db: Database): RuleRow[] {
  return db
    .prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM transactions t WHERE t.category_source = 'rule:' || r.id) AS matches
       FROM rules r ORDER BY r.priority, r.id`,
    )
    .all<RuleRow>();
}

export function createRule(
  db: Database,
  rule: {
    name: string;
    field: string;
    pattern: string;
    category_key: string;
    priority?: number;
  },
): number {
  new RegExp(rule.pattern, "i"); // throws on invalid pattern
  if (!CATEGORY_BY_KEY.has(rule.category_key)) {
    throw new Error(`Unknown category ${rule.category_key}`);
  }
  db.exec(
    `INSERT INTO rules(priority, name, field, pattern, category_key, source) VALUES (:priority, :name, :field, :pattern, :category, 'user')
     ON CONFLICT(source, name) DO UPDATE SET priority = excluded.priority, field = excluded.field, pattern = excluded.pattern, category_key = excluded.category_key`,
    {
      priority: rule.priority ?? 100,
      name: rule.name,
      field: rule.field,
      pattern: rule.pattern,
      category: rule.category_key,
    },
  );
  return db.lastInsertRowId;
}

export function deleteRule(db: Database, id: number) {
  db.exec(`DELETE FROM rules WHERE id = :id AND source = 'user'`, { id });
}

export type OverridePatch = {
  category_key?: string | null;
  reimburses?: string | null;
  one_off?: boolean;
  note?: string | null;
};

export type OverrideRow = {
  category_key: string | null;
  reimburses: string | null;
  one_off: number;
  note: string | null;
};

export function getOverride(
  db: Database,
  fingerprint: string,
): OverrideRow | undefined {
  return db
    .prepare(
      `SELECT category_key, reimburses, one_off, note FROM overrides WHERE fingerprint = :fp`,
    )
    .get<OverrideRow>({ fp: fingerprint });
}

/**
 * Merges a patch into the manual decisions for one transaction. Fields left
 * out of the patch keep their value; the row is dropped once it holds
 * nothing. Callers re-run categorization afterwards.
 */
export function upsertOverride(
  db: Database,
  fingerprint: string,
  patch: OverridePatch,
) {
  if (patch.category_key && !CATEGORY_BY_KEY.has(patch.category_key)) {
    throw new Error(`Unknown category ${patch.category_key}`);
  }
  const current = getOverride(db, fingerprint);
  const pick = <T>(next: T | undefined, prev: T): T =>
    next === undefined ? prev : next;
  const row = {
    category: pick(patch.category_key, current?.category_key ?? null),
    reimburses: pick(patch.reimburses, current?.reimburses ?? null),
    one_off: patch.one_off === undefined
      ? current?.one_off ?? 0
      : (patch.one_off ? 1 : 0),
    note: pick(patch.note, current?.note ?? null),
  };
  if (!row.category && !row.reimburses && !row.one_off) {
    db.exec(`DELETE FROM overrides WHERE fingerprint = :fp`, {
      fp: fingerprint,
    });
    return;
  }
  db.exec(
    `INSERT INTO overrides(fingerprint, category_key, reimburses, one_off, note)
     VALUES (:fp, :category, :reimburses, :one_off, :note)
     ON CONFLICT(fingerprint) DO UPDATE SET category_key = excluded.category_key, reimburses = excluded.reimburses,
       one_off = excluded.one_off, note = excluded.note, updated_at = datetime('now')`,
    { fp: fingerprint, ...row },
  );
}

/**
 * Manual category for one transaction. Null clears it, together with any
 * reimbursement link, since the link is what decided the category.
 */
export function setOverride(
  db: Database,
  fingerprint: string,
  category_key: string | null,
  note?: string | null,
) {
  upsertOverride(db, fingerprint, {
    category_key,
    ...(category_key ? {} : { reimburses: null }),
    ...(note === undefined ? {} : { note }),
  });
}

export function categoryOptions() {
  return GROUP_ORDER.map((group) => ({
    group,
    categories: CATEGORIES.filter((c) => c.group === group),
  }));
}

export type VendorRow = {
  merchant: string;
  category_key: string;
  owners: string[];
  count: number;
  sum: number;
  first: string;
  last: string;
  monthly: number[];
};

type VendorCell = {
  merchant: string;
  month: string;
  category_key: string;
  owner: string;
  sum: number;
  count: number;
  first: string;
  last: string;
};

/** Merchants in a period with per-month series, excluding transfers and savings moves. */
export function vendorList(
  db: Database,
  p: Period & {
    q?: string;
    limit?: number;
    kind?: "expense" | "income" | "all";
  },
): { rows: VendorRow[]; total: number; months: string[] } {
  const w = periodWhere(p);
  const params: Record<string, string> = { ...w.params };
  let extra = "";
  if (p.q) {
    extra += ` AND (t.merchant LIKE :q OR t.description LIKE :q)`;
    params.q = `%${p.q}%`;
  }
  if (p.kind === "expense") extra += ` AND t.amount < 0`;
  if (p.kind === "income") extra += ` AND t.amount > 0`;
  const cells = db
    .prepare(
      `SELECT t.merchant, substr(t.date, 1, 7) AS month, t.category_key, a.owner, SUM(t.amount) AS sum, COUNT(*) AS count, MIN(t.date) AS first, MAX(t.date) AS last
       FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN categories c ON c.key = t.category_key
       WHERE ${w.sql} AND c.kind NOT IN ('transfer', 'saving') ${extra}
       GROUP BY 1, 2, 3, 4`,
    )
    .all<VendorCell>(params);
  const months = monthsBetween(p.from, p.to);
  const index = new Map(months.map((m, i) => [m, i]));
  const byMerchant = new Map<
    string,
    VendorRow & { categoryCounts: Map<string, number> }
  >();
  for (const cell of cells) {
    let row = byMerchant.get(cell.merchant);
    if (!row) {
      row = {
        merchant: cell.merchant,
        category_key: cell.category_key,
        owners: [],
        count: 0,
        sum: 0,
        first: cell.first,
        last: cell.last,
        monthly: months.map(() => 0),
        categoryCounts: new Map(),
      };
      byMerchant.set(cell.merchant, row);
    }
    row.count += cell.count;
    row.sum += cell.sum;
    if (cell.first < row.first) row.first = cell.first;
    if (cell.last > row.last) row.last = cell.last;
    if (!row.owners.includes(cell.owner)) row.owners.push(cell.owner);
    row.categoryCounts.set(
      cell.category_key,
      (row.categoryCounts.get(cell.category_key) ?? 0) + cell.count,
    );
    const i = index.get(cell.month);
    if (i !== undefined) row.monthly[i] += cell.sum;
  }
  const rows = [...byMerchant.values()]
    .map((r) => {
      const category_key = [...r.categoryCounts.entries()].sort((a, b) =>
        b[1] - a[1]
      )[0][0];
      const { categoryCounts: _c, ...rest } = r;
      return { ...rest, category_key, owners: r.owners.sort() };
    })
    .sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum));
  return { rows: rows.slice(0, p.limit ?? 100), total: rows.length, months };
}

export type VendorDetail = VendorRow & {
  yearly: { year: string; sum: number; count: number }[];
  categories: { category_key: string; count: number }[];
};

export function vendorDetail(
  db: Database,
  merchant: string,
  p: Period,
): VendorDetail | null {
  const { rows } = vendorList(db, { ...p, limit: 1_000_000 });
  const row = rows.find((r) => r.merchant === merchant);
  if (!row) return null;
  const w = periodWhere(p);
  const params = { ...w.params, merchant };
  const ownerSql = p.owner ? " AND a.owner = :owner" : "";
  const yearly = db
    .prepare(
      `SELECT substr(t.date, 1, 4) AS year, SUM(t.amount) AS sum, COUNT(*) AS count
       FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE ${w.sql}${ownerSql} AND t.merchant = :merchant GROUP BY 1 ORDER BY 1`,
    )
    .all<{ year: string; sum: number; count: number }>(params);
  const categories = db
    .prepare(
      `SELECT t.category_key, COUNT(*) AS count FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE ${w.sql}${ownerSql} AND t.merchant = :merchant GROUP BY 1 ORDER BY 2 DESC`,
    )
    .all<{ category_key: string; count: number }>(params);
  return { ...row, yearly, categories };
}

/** Whole data range as months, for pages that default to "all time". */
export function fullPeriod(db: Database): { from: string; to: string } {
  const { min, max } = getDateBounds(db);
  const now = new Date().toISOString().slice(0, 7);
  return { from: (min ?? now).slice(0, 7), to: (max ?? now).slice(0, 7) };
}
