import { ask, parseCSVFile, writeDataToCSV } from "./io.ts";
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
  console.log("Welcome to cashflow!");

  const userInput: UserInput = {
    bank: ask("Please specify bank name", "nordea"),
    account: ask("What's the account name?", "brukskonto"),
    owner: ask("And who's the owner?", "rix1"),
    current_balance: ask("Lastly, what's the current balance?", "123123"),
  };

  const rawData = await parseCSVFile("./statements/rix-nordea.csv");

  const transformedData = transformForBank(rawData, userInput);

  writeDataToCSV(
    `${userInput.owner}-${userInput.bank}-${userInput.account}.csv`,
    transformedData
  );
}
