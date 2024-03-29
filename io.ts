import {
  ensureFileSync,
  existsSync,
} from "https://deno.land/std@0.212.0/fs/mod.ts";
import {
  Input,
  Number,
} from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";
import { parse, stringify } from "https://deno.land/std@0.212.0/csv/mod.ts";
import { UserInput } from "./types.ts";
import { ensureDirSync } from "https://deno.land/std@0.212.0/fs/ensure_dir.ts";

export function ask(question: string, fallback?: string): string {
  if (Deno.env.get("DEBUG") === "true" && fallback) {
    return fallback;
  }
  return prompt(question) || "";
}

export function guessUserInputFromFile(filename: string): UserInput | void {
  const filenameparts = filename.replace(".csv", "").split("-");
  if (filenameparts.length !== 3) {
    return undefined;
  } else {
    return {
      bank: filenameparts[1],
      account: filenameparts[2],
      owner: filenameparts[0],
      current_balance: 0,
    };
  }
}

export async function getUserInput(): Promise<UserInput> {
  console.info(
    "%c%s",
    "color: ##aBaBaB",
    "We need some information about this file. Tip: You can avoid inputing this manually by naming your statement files like this: <owner>-<bank>-<account>.csv"
  );
  const bank: string = await Input.prompt({
    message: "Which bank is this export from?",
    list: true,
    id: "bank",
  });
  const account: string = await Input.prompt({
    message: "What type of account is this?",
    list: true,
    id: "account",
  });
  const owner: string = await Input.prompt({
    message: "Who's the owner of this account?",
    list: true,
    id: "owner",
  });
  const current_balance: number = await Number.prompt({
    message: "What's the current balance of this account?",
    list: true,
  });

  return {
    bank: bank,
    account: account,
    owner: owner,
    current_balance: current_balance,
  };
}

type Bank = "nordea" | "dnb" | "handelsbanken";

export async function parseCSVFile(filePath: string) {
  try {
    const csv = await Deno.readTextFile(filePath);
    return parse(csv, {
      skipFirstRow: true,
      separator: ";",
      lazyQuotes: true,
    });
  } catch (error) {
    throw new Error(`${error} - Could not read file ${filePath}`);
  }
}

const columns = [
  "date",
  "description",
  "incoming",
  "outgoing",
  "original_amount",
  "currency",
  "bank",
  "account",
  "owner",
  "original_currency",
  "conversion_rate",
];

export function writeDataToCSV(
  filename: string,
  data: any,
  individual = false
) {
  if (individual) {
    const outputCSV = stringify(data, {
      columns,
      separator: "\t",
    });

    ensureFileSync(`./out/${filename}`);
    Deno.writeTextFileSync(`./out/${filename}`, outputCSV);
  }

  ensureDirSync("./out");

  const allCombinedPath = `./out/combined.csv`;
  const isReadableFile = existsSync(allCombinedPath, {
    isReadable: true,
    isFile: true,
  });
  Deno.writeTextFileSync(
    allCombinedPath,
    stringify(data, {
      columns,
      separator: "\t",
      headers: !isReadableFile,
    }),
    {
      append: true,
    }
  );
}
