import { parse, stringify } from "https://deno.land/std@0.212.0/csv/mod.ts";

export function ask(question: string, fallback?: string): string {
  if (Deno.env.get("DEBUG") === "true" && fallback) {
    return fallback;
  }
  return prompt(question) || "";
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

export function writeDataToCSV(filename: string, data: any) {
  const outputCSV = stringify(data, {
    columns,
    separator: "\t",
  });

  try {
    Deno.writeTextFileSync(`./out/${filename}`, outputCSV);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotADirectory)) {
      Deno.mkdirSync("./out");
      Deno.writeTextFileSync(`./out/${filename}`, outputCSV);
    }
  }
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
