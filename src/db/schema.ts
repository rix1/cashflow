export const SCHEMA_VERSION = 2;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  bank TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'checking',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  row_count INTEGER NOT NULL,
  inserted_count INTEGER NOT NULL,
  skipped_count INTEGER NOT NULL,
  pending_count INTEGER NOT NULL,
  period_start TEXT,
  period_end TEXT,
  opening_balance REAL,
  opening_date TEXT,
  closing_balance REAL,
  closing_date TEXT,
  total_in REAL,
  total_out REAL,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  import_id INTEGER NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  executed_date TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  original_amount REAL,
  original_currency TEXT,
  conversion_rate REAL,
  description TEXT NOT NULL,
  merchant TEXT NOT NULL,
  counterparty TEXT,
  counterparty_account TEXT,
  bank_type TEXT,
  bank_subtype TEXT,
  message TEXT,
  card TEXT,
  raw TEXT NOT NULL,
  category_key TEXT REFERENCES categories(key),
  category_source TEXT,
  transfer_group TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_key);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant);

CREATE TABLE IF NOT EXISTS loan_payments (
  transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
  loan_account TEXT,
  principal REAL NOT NULL,
  interest REAL NOT NULL,
  fees REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  priority INTEGER NOT NULL,
  name TEXT NOT NULL,
  field TEXT NOT NULL,
  pattern TEXT NOT NULL,
  category_key TEXT NOT NULL REFERENCES categories(key),
  source TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source, name)
);

CREATE TABLE IF NOT EXISTS overrides (
  fingerprint TEXT PRIMARY KEY,
  category_key TEXT NOT NULL REFERENCES categories(key),
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
