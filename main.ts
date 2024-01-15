import { walk } from "https://deno.land/std@0.212.0/fs/walk.ts";
import { assert } from "https://deno.land/std@0.212.0/assert/assert.ts";
import { ask, getUserInput, parseCSVFile, writeDataToCSV } from "./io.ts";
import { transformForBank } from "./transformers/mod.ts";
import { UserInput } from "./types.ts";
import { load } from "https://deno.land/std@0.212.0/dotenv/mod.ts";

const env = await load();
const DEBUG = env["DEBUG"];
Deno.env.set("DEBUG", DEBUG || "false");

// const flags = parseArgs(Deno.args, {
//   boolean: ["help"],
//   string: ["version"],
//   default: { color: true },
//   negatable: ["color"],
// });

if (import.meta.main) {
  alert(
    `Welcome to cashflow! 💰 🏄‍♂️\nI'll read any CSV files in the ./statements/ directory, transform them and output them to ./out/.\n\nReady?`
  );

  for await (const entry of walk("./statements/")) {
    if (entry.isFile && entry.name.endsWith(".csv")) {
      const shouldProceed = confirm(
        `[INFO] Will start working on file "${entry.name}"`
      );
      if (shouldProceed) {
        const userInput = await getUserInput();
        const rawData = await parseCSVFile(`./statements/${entry.name}`);
        const transformedData = transformForBank(rawData, userInput);
        writeDataToCSV(
          `${userInput.owner}-${userInput.bank}-${userInput.account}.csv`,
          transformedData
        );
      }
    }
  }
  alert(`✅ All done! See output in ./out/`);
}
