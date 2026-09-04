import { parseArgs } from "@std/cli/parse-args";

const HELP = `cashflow - household bank statement analysis

Usage:
  deno task import [files...]   Import CSV exports (default: every .csv in ./statements), then categorize.
  deno task rebuild             Wipe imported data, re-import everything, re-categorize. Rules/overrides are kept.
  deno task categorize          Re-run categorization for all transactions.
  deno task serve [--port N]    Start the local web UI (default http://127.0.0.1:8000).
`;

if (import.meta.main) {
  const args = parseArgs(Deno.args, {
    string: ["port", "statements"],
    boolean: ["help"],
  });
  const [command, ...rest] = args._.map(String);

  switch (command) {
    case "import": {
      const { runImport } = await import("./cli/import.ts");
      await runImport(rest, { statementsDir: args.statements });
      break;
    }
    case "rebuild": {
      const { runImport } = await import("./cli/import.ts");
      await runImport(rest, { rebuild: true, statementsDir: args.statements });
      break;
    }
    case "categorize": {
      const { runCategorize } = await import("./cli/categorize.ts");
      await runCategorize();
      break;
    }
    case "serve": {
      const { serve } = await import("./web/server.tsx");
      await serve(args.port ? Number(args.port) : 8000);
      break;
    }
    default:
      console.log(HELP);
      if (command && command !== "help") Deno.exit(1);
  }
}
