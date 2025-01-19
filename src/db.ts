import { Database } from "jsr:@db/sqlite";
import { CompleteTransaction, PartialTransaction, UserInput } from "./types.ts";

const DB_PATH = "./cashflow.sqlite3";

export class CashflowDB {
  private db: Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.initialize();
  }

  private initialize() {
    // Create transactions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT,
        date TEXT NOT NULL,
        description TEXT,
        incoming REAL,
        outgoing REAL,
        original_amount REAL NOT NULL,
        currency TEXT NOT NULL,
        bank TEXT NOT NULL,
        account TEXT NOT NULL,
        owner TEXT NOT NULL,
        original_currency TEXT,
        conversion_rate TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        -- Create a unique constraint on the combination of fields that identify a unique transaction
        UNIQUE(date, original_amount, description, bank, account, owner)
      )
    `);

    // Create accounts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank TEXT NOT NULL,
        account TEXT NOT NULL,
        owner TEXT NOT NULL,
        current_balance REAL NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(bank, account, owner)
      )
    `);
  }

  private createTransactionId(
    transaction: PartialTransaction,
    userInput: UserInput,
  ): string {
    const uniqueString = [
      transaction.date,
      transaction.original_amount,
      transaction.description,
      userInput.bank,
      userInput.account,
      userInput.owner,
    ].join("|");

    return btoa(uniqueString);
  }

  insertTransactions(
    transactions: PartialTransaction[],
    userInput: UserInput,
  ): void {
    // Using transaction for atomic operation
    this.db.transaction(() => {
      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO transactions (
          transaction_id, date, description, incoming, outgoing, original_amount,
          currency, bank, account, owner, original_currency, conversion_rate
        ) VALUES (
          :transaction_id, :date, :description, :incoming, :outgoing, :original_amount,
          :currency, :bank, :account, :owner, :original_currency, :conversion_rate
        )
      `);

      this.db
        .prepare(
          `
        INSERT OR REPLACE INTO accounts (bank, account, owner, current_balance)
        VALUES (:bank, :account, :owner, :balance)
      `,
        )
        .run({
          bank: userInput.bank,
          account: userInput.account,
          owner: userInput.owner,
          balance: userInput.current_balance,
        });

      // Insert all transactions
      let inserted = 0;
      let skipped = 0;

      for (const transaction of transactions) {
        const transactionId = this.createTransactionId(transaction, userInput);
        const changes = insertStmt.run({
          transaction_id: transactionId,
          date: transaction.date,
          description: transaction.description,
          incoming: transaction.incoming,
          outgoing: transaction.outgoing,
          original_amount: transaction.original_amount,
          currency: transaction.currency,
          bank: userInput.bank,
          account: userInput.account,
          owner: userInput.owner,
          original_currency: transaction.original_currency,
          conversion_rate: transaction.conversion_rate,
        });

        if (changes > 0) {
          inserted++;
        } else {
          skipped++;
        }
      }

      console.log(
        `Inserted ${inserted} new transactions, skipped ${skipped} duplicates`,
      );
      insertStmt.finalize();
    })();

    console.log("Done inserting...✅");
  }

  getTransactions(): CompleteTransaction[] {
    return this.db
      .prepare(
        `
      SELECT
        date, description, incoming, outgoing, original_amount,
        currency, bank, account, owner, original_currency, conversion_rate
      FROM transactions
      ORDER BY date DESC
    `,
      )
      .all() as CompleteTransaction[];
  }

  getAccountBalances(): Array<{
    bank: string;
    account: string;
    owner: string;
    current_balance: number;
    updated_at: string;
  }> {
    return this.db
      .prepare(
        `
      SELECT bank, account, owner, current_balance, updated_at
      FROM accounts
      ORDER BY updated_at DESC
    `,
      )
      .all();
  }

  getTransactionsByAccount(bank: string, account: string, owner: string) {
    return this.db
      .prepare(
        `
      SELECT
        date, description, incoming, outgoing, original_amount,
        currency, bank, account, owner, original_currency, conversion_rate
      FROM transactions
      WHERE bank = :bank AND account = :account AND owner = :owner
      ORDER BY date DESC
    `,
      )
      .all({
        bank,
        account,
        owner,
      }) as CompleteTransaction[];
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let database: CashflowDB | null = null;

export function getDatabase(): CashflowDB {
  if (!database) {
    database = new CashflowDB();
  }
  return database;
}
