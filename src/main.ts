import { Confirm } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";

import { load } from "https://deno.land/std@0.212.0/dotenv/mod.ts";
import { walk } from "https://deno.land/std@0.212.0/fs/walk.ts";
import {
  getUserInput,
  guessUserInputFromFile,
  parseCSVFile,
  writeDataToCSV,
} from "./io.ts";
import { transformForBank } from "./transformers/mod.ts";
import { getDatabase } from "./db.ts";

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
  console.info(
    "%c%s",
    "color: #FFD700; font-weight: bold",
    `Welcome to cashflow! 💰 🏄‍♂️`,
  );

  console.info(
    "%c%s",
    "color: ##aBaBaB",
    "I'll read any CSV files in the ./statements/ directory, transform them and output them to ./out/.\n",
  );
  alert("Ready?");

  const printIndividual: boolean = await Confirm.prompt({
    message:
      "We'll automatically merge all bank statements into one. Do you want to print individual statements as well?",
  });

  for await (const entry of walk("./statements/")) {
    if (entry.isFile && entry.name.endsWith(".csv")) {
      const shouldProceed = confirm(
        `[INFO] Will start working on file "${entry.name}"`,
      );
      if (shouldProceed) {
        const userInput =
          guessUserInputFromFile(entry.name) || (await getUserInput());

        const rawData = await parseCSVFile(`./statements/${entry.name}`);
        console.log(rawData);

        const db = getDatabase();

        try {
          const transformedData = transformForBank(rawData, userInput);
          db.insertTransactions(transformedData, userInput);
        } catch (error) {
          console.error(error);
        } finally {
          db.close();
        }
      }
    }
  }
  alert(`✅ All done! See output in ./out/`);
}
