import { loadConfig } from "../config.ts";
import { openDatabase } from "../db/db.ts";
import {
  clearImportedData,
  importStatementFile,
  type ImportSummary,
  listStatementFiles,
  syncAccountsFromConfig,
  UnknownAccountError,
} from "../importers/import-service.ts";
import { categorizeAll } from "../categorize/mod.ts";

export async function runImport(
  files: string[],
  opts: { rebuild?: boolean; statementsDir?: string } = {},
) {
  const config = await loadConfig();
  const db = openDatabase();
  try {
    syncAccountsFromConfig(db, config);
    if (opts.rebuild) {
      clearImportedData(db);
      console.log("Cleared imported data (rules and overrides kept).");
    }
    const paths = files.length
      ? files
      : await listStatementFiles(opts.statementsDir ?? "./statements");
    if (paths.length === 0) {
      console.log("No CSV files found in ./statements.");
      return;
    }
    const summaries: ImportSummary[] = [];
    let failures = 0;
    for (const path of paths) {
      try {
        const s = await importStatementFile(db, config, path);
        summaries.push(s);
      } catch (error) {
        failures++;
        if (error instanceof UnknownAccountError) {
          console.error(`\n${error.message}\n`);
        } else console.error(`\nFailed to import ${path}:`, error, "\n");
      }
    }
    printSummaries(summaries);
    const result = categorizeAll(db, config);
    console.log(
      `Categorized ${result.total} transactions: ${result.uncategorized} uncategorized, ${result.transfersLinked} transfer pairs linked.`,
    );
    if (failures) {
      console.error(`${failures} file(s) failed. See messages above.`);
    }
  } finally {
    db.close();
  }
}

function printSummaries(summaries: ImportSummary[]) {
  const table = summaries.map((s) => ({
    file: s.file.length > 48 ? s.file.slice(0, 45) + "..." : s.file,
    format: s.format,
    enc: s.encoding,
    owner: s.owner,
    period: s.period ? `${s.period[0]} → ${s.period[1]}` : "-",
    rows: s.rows,
    new: s.inserted,
    dup: s.skipped,
    pending: s.pending,
    status: s.status,
  }));
  console.table(table);
}
