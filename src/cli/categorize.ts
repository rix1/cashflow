import { loadConfig } from "../config.ts";
import { openDatabase } from "../db/db.ts";
import { categorizeAll } from "../categorize/mod.ts";
import { syncAccountsFromConfig } from "../importers/import-service.ts";

export async function runCategorize() {
  const config = await loadConfig();
  const db = openDatabase();
  try {
    syncAccountsFromConfig(db, config);
    const result = categorizeAll(db, config);
    console.log(
      `Categorized ${result.total} transactions: ${result.uncategorized} uncategorized, ${result.transfersLinked} transfer pairs linked.`,
    );
    console.table(result.byCategory);
  } finally {
    db.close();
  }
}
