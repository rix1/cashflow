import { basename } from "@std/path";
import type { Database } from "../db/db.ts";
import { type Config, findAccount, normalizeAccountNumber } from "../config.ts";
import { fingerprintRows, sha256 } from "./fingerprint.ts";
import { type ParsedFile, parseStatementBytes } from "./mod.ts";
import type { NormalizedRow } from "./types.ts";

export type ImportSummary = {
  file: string;
  format: string;
  encoding: string;
  account: string;
  owner: string;
  rows: number;
  inserted: number;
  skipped: number;
  pending: number;
  period: [string, string] | null;
  status: "imported" | "already-imported" | "empty";
};

export class UnknownAccountError extends Error {
  constructor(
    public file: string,
    public accountNumber: string | null,
    public ownerGuess: string | null,
  ) {
    super(
      `${file}: account ${
        accountNumber ?? "(none found)"
      } is not in accounts.json. Add an entry like\n` +
        `  { "number": "${accountNumber ?? "..."}", "owner": "${
          ownerGuess ?? "<owner>"
        }", "bank": "<bank>", "name": "brukskonto" }`,
    );
  }
}

export function ensureAccount(
  db: Database,
  config: Config,
  accountNumber: string,
  file: string,
): { id: number; owner: string } {
  const cfg = findAccount(config, accountNumber);
  if (!cfg) {
    const ownerGuess = Object.keys(config.owners).find((o) =>
      basename(file).toLowerCase().startsWith(o.toLowerCase())
    ) ?? null;
    throw new UnknownAccountError(file, accountNumber, ownerGuess);
  }
  const number = normalizeAccountNumber(cfg.number);
  db.exec(
    `INSERT INTO accounts(number, owner, bank, name, kind) VALUES (:number, :owner, :bank, :name, :kind)
     ON CONFLICT(number) DO UPDATE SET owner = excluded.owner, bank = excluded.bank, name = excluded.name, kind = excluded.kind`,
    {
      number,
      owner: cfg.owner,
      bank: cfg.bank,
      name: cfg.name,
      kind: cfg.kind ?? "checking",
    },
  );
  const row = db.prepare(
    `SELECT id, owner FROM accounts WHERE number = :number`,
  ).get<{ id: number; owner: string }>({ number })!;
  return row;
}

/** Registers every configured account so transfer detection knows them before their statements arrive. */
export function syncAccountsFromConfig(db: Database, config: Config) {
  for (const a of config.accounts) {
    db.exec(
      `INSERT INTO accounts(number, owner, bank, name, kind) VALUES (:number, :owner, :bank, :name, :kind)
       ON CONFLICT(number) DO UPDATE SET owner = excluded.owner, bank = excluded.bank, name = excluded.name, kind = excluded.kind`,
      {
        number: normalizeAccountNumber(a.number),
        owner: a.owner,
        bank: a.bank,
        name: a.name,
        kind: a.kind ?? "checking",
      },
    );
  }
}

export async function importStatementFile(
  db: Database,
  config: Config,
  path: string,
): Promise<ImportSummary> {
  const bytes = await Deno.readFile(path);
  const fileHash = await sha256(bytes);
  const file = basename(path);
  const parsed = parseStatementBytes(bytes, file);

  const existing = db.prepare(`SELECT id FROM imports WHERE file_hash = :hash`)
    .get<{ id: number }>({ hash: fileHash });
  if (existing) {
    return summary(file, parsed, "?", "?", 0, 0, 0, "already-imported");
  }
  if (!parsed.account_number) {
    throw new UnknownAccountError(file, null, null);
  }
  const account = ensureAccount(db, config, parsed.account_number, file);
  const booked = parsed.rows.filter((r) => !r.pending && r.date);
  const pendingCount = parsed.rows.length - booked.length;
  if (booked.length === 0) {
    return summary(
      file,
      parsed,
      parsed.account_number,
      account.owner,
      0,
      0,
      pendingCount,
      "empty",
    );
  }
  const fingerprints = await fingerprintRows(booked, parsed.account_number);
  const dates = booked.map((r) => r.date).sort();

  let inserted = 0;
  let skipped = 0;
  db.transaction(() => {
    db.exec(
      `INSERT INTO imports(file_name, file_hash, format, account_id, row_count, inserted_count, skipped_count, pending_count,
         period_start, period_end, opening_balance, opening_date, closing_balance, closing_date, total_in, total_out)
       VALUES (:file, :hash, :format, :account_id, :rows, 0, 0, :pending, :start, :end, :ob, :od, :cb, :cd, :tin, :tout)`,
      {
        file,
        hash: fileHash,
        format: parsed.format,
        account_id: account.id,
        rows: booked.length,
        pending: pendingCount,
        start: dates[0],
        end: dates[dates.length - 1],
        ob: parsed.opening_balance,
        od: parsed.opening_date,
        cb: parsed.closing_balance,
        cd: parsed.closing_date,
        tin: parsed.total_in,
        tout: parsed.total_out,
      },
    );
    const importId = db.lastInsertRowId;
    const insertTx = db.prepare(
      `INSERT OR IGNORE INTO transactions(fingerprint, account_id, import_id, date, executed_date, amount, currency,
         original_amount, original_currency, conversion_rate, description, merchant, counterparty, counterparty_account,
         bank_type, bank_subtype, message, card, raw)
       VALUES (:fingerprint, :account_id, :import_id, :date, :executed_date, :amount, :currency,
         :original_amount, :original_currency, :conversion_rate, :description, :merchant, :counterparty, :counterparty_account,
         :bank_type, :bank_subtype, :message, :card, :raw)`,
    );
    const insertLoan = db.prepare(
      `INSERT OR REPLACE INTO loan_payments(transaction_id, loan_account, principal, interest, fees)
       VALUES (:transaction_id, :loan_account, :principal, :interest, :fees)`,
    );
    try {
      booked.forEach((row: NormalizedRow, i: number) => {
        const changes = insertTx.run({
          fingerprint: fingerprints[i],
          account_id: account.id,
          import_id: importId,
          date: row.date,
          executed_date: row.executed_date,
          amount: row.amount,
          currency: row.currency,
          original_amount: row.original_amount,
          original_currency: row.original_currency,
          conversion_rate: row.conversion_rate,
          description: row.description,
          merchant: row.merchant,
          counterparty: row.counterparty,
          counterparty_account: row.counterparty_account,
          bank_type: row.bank_type,
          bank_subtype: row.bank_subtype,
          message: row.message,
          card: row.card,
          raw: JSON.stringify(row.raw),
        });
        if (changes > 0) {
          inserted++;
          if (row.loan) {
            insertLoan.run({ transaction_id: db.lastInsertRowId, ...row.loan });
          }
        } else {
          skipped++;
        }
      });
    } finally {
      insertTx.finalize();
      insertLoan.finalize();
    }
    db.exec(
      `UPDATE imports SET inserted_count = :i, skipped_count = :s WHERE id = :id`,
      { i: inserted, s: skipped, id: importId },
    );
  })();

  return summary(
    file,
    parsed,
    parsed.account_number,
    account.owner,
    inserted,
    skipped,
    pendingCount,
    "imported",
  );
}

function summary(
  file: string,
  parsed: ParsedFile,
  account: string,
  owner: string,
  inserted: number,
  skipped: number,
  pending: number,
  status: ImportSummary["status"],
): ImportSummary {
  const dates = parsed.rows.filter((r) => !r.pending && r.date).map((r) =>
    r.date
  ).sort();
  return {
    file,
    format: parsed.format,
    encoding: parsed.encoding,
    account,
    owner,
    rows: parsed.rows.length,
    inserted,
    skipped,
    pending,
    period: dates.length ? [dates[0], dates[dates.length - 1]] : null,
    status,
  };
}

/** Removes all imported data (transactions, imports) but keeps rules and manual overrides. */
export function clearImportedData(db: Database) {
  db.exec(`DELETE FROM loan_payments`);
  db.exec(`DELETE FROM transactions`);
  db.exec(`DELETE FROM imports`);
}

export async function listStatementFiles(
  dir = "./statements",
): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isFile && entry.name.toLowerCase().endsWith(".csv")) {
      files.push(`${dir}/${entry.name}`);
    }
  }
  return files.sort();
}
