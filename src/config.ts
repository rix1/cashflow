/**
 * Household configuration: who the owners are and which bank accounts belong
 * to whom. Lives in ./accounts.json (gitignored). See accounts.example.json.
 */

export type AccountKind = "checking" | "savings" | "loan" | "credit";

export type AccountConfig = {
  number: string;
  owner: string;
  bank: string;
  name: string;
  kind?: AccountKind;
};

export type OwnerConfig = {
  name: string;
  aliases: string[];
};

export type Config = {
  owners: Record<string, OwnerConfig>;
  accounts: AccountConfig[];
};

export const CONFIG_PATH = "./accounts.json";

/** "9053 06 20149" and "6219.12.77436" both become plain digit strings. */
export function normalizeAccountNumber(
  input: string | null | undefined,
): string {
  return (input ?? "").replace(/\D/g, "");
}

export async function loadConfig(path = CONFIG_PATH): Promise<Config> {
  let text: string;
  try {
    text = await Deno.readTextFile(path);
  } catch {
    throw new Error(
      `Missing ${path}. Copy accounts.example.json to ${path} and fill in your owners and account numbers.`,
    );
  }
  const parsed = JSON.parse(text) as Config;
  if (!parsed.owners || !parsed.accounts) {
    throw new Error(`${path} must have "owners" and "accounts" keys.`);
  }
  for (const account of parsed.accounts) {
    if (!parsed.owners[account.owner]) {
      throw new Error(
        `${path}: account ${account.number} refers to unknown owner "${account.owner}".`,
      );
    }
    account.kind ??= "checking";
  }
  return parsed;
}

export function findAccount(
  config: Config,
  number: string | null | undefined,
): AccountConfig | undefined {
  const digits = normalizeAccountNumber(number);
  if (!digits) return undefined;
  return config.accounts.find((a) =>
    normalizeAccountNumber(a.number) === digits
  );
}

/** Returns the owner key whose alias matches the given name (case-insensitive, whitespace-collapsed). */
export function ownerForName(
  config: Config,
  name: string | null | undefined,
): string | undefined {
  const needle = collapse(name);
  if (!needle) return undefined;
  for (const [key, owner] of Object.entries(config.owners)) {
    for (const alias of [owner.name, ...owner.aliases]) {
      const a = collapse(alias);
      if (a && (needle === a || needle.includes(a))) return key;
    }
  }
  return undefined;
}

function collapse(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}
