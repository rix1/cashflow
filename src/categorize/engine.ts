import {
  type Config,
  normalizeAccountNumber,
  ownerForName,
} from "../config.ts";
import { CATEGORY_BY_KEY } from "./categories.ts";
import type { RuleField } from "./seed-rules.ts";

export type TxForCategorization = {
  id: number;
  fingerprint: string;
  account_id: number;
  owner: string;
  amount: number;
  merchant: string;
  description: string;
  counterparty: string | null;
  counterparty_account: string | null;
  bank_type: string | null;
  bank_subtype: string | null;
  message: string | null;
};

export type CompiledRule = {
  id: number;
  priority: number;
  name: string;
  field: RuleField;
  regex: RegExp;
  category_key: string;
  source: string;
};

export type KnownAccount = { id: number; owner: string; kind: string };

export type CategorizationContext = {
  config: Config;
  accountsByNumber: Map<string, KnownAccount>;
  rules: CompiledRule[];
  overrides: Map<string, string>;
  /** Merchants that have paid salary; positive amounts from them are expense refunds. */
  salaryPayers: Set<string>;
};

export type CategorizationResult = { category_key: string; source: string };

/**
 * Order: manual override, bank-provided signals, transfer detection
 * (incl. own-account fallback), employer refunds, rules, uncategorized.
 */
export function categorizeTransaction(
  tx: TxForCategorization,
  ctx: CategorizationContext,
): CategorizationResult {
  return withSign(tx, categorizeInner(tx, ctx));
}

function categorizeInner(
  tx: TxForCategorization,
  ctx: CategorizationContext,
): CategorizationResult {
  const override = ctx.overrides.get(tx.fingerprint);
  if (override && CATEGORY_BY_KEY.has(override)) {
    return { category_key: override, source: "manual" };
  }

  const signal = bankSignal(tx, ctx);
  if (signal) return signal;

  const transfer = detectTransfer(tx, ctx);
  if (transfer) return transfer;

  // Non-salary money from an employer is an expense refund, not income.
  if (tx.amount > 0 && ctx.salaryPayers.has(tx.merchant)) {
    return { category_key: "income:refund", source: "employer" };
  }
  for (const rule of ctx.rules) {
    if (rule.regex.test(fieldValue(tx, rule.field))) {
      return { category_key: rule.category_key, source: `rule:${rule.id}` };
    }
  }
  return { category_key: "uncategorized", source: "none" };
}

/** Savings categories are direction-dependent; rules only name one of them. */
function withSign(
  tx: TxForCategorization,
  result: CategorizationResult,
): CategorizationResult {
  if (result.category_key === "savings:deposit" && tx.amount > 0) {
    return { ...result, category_key: "savings:withdrawal" };
  }
  if (result.category_key === "savings:withdrawal" && tx.amount < 0) {
    return { ...result, category_key: "savings:deposit" };
  }
  return result;
}

export function isSalary(
  tx: Pick<TxForCategorization, "bank_type" | "amount">,
): boolean {
  return (tx.bank_type ?? "").toLowerCase() === "lønn" && tx.amount > 0;
}

function bankSignal(
  tx: TxForCategorization,
  ctx: CategorizationContext,
): CategorizationResult | null {
  const type = (tx.bank_type ?? "").toLowerCase();
  const subtype = (tx.bank_subtype ?? "").toLowerCase();
  const src = "bank";
  if (isSalary(tx)) return { category_key: "income:salary", source: src };
  if (subtype === "utstedt tilbakebetaling av lån") {
    return { category_key: "loans:disbursement", source: src };
  }
  if (
    subtype === "nedbetaling av lån" || subtype === "tilbakebetaling av lån"
  ) {
    const account = ctx.accountsByNumber.get(
      normalizeAccountNumber(tx.counterparty_account),
    );
    const looksLikeMortgage = account?.kind === "loan" ||
      /avdrag/i.test(tx.message ?? "") || /bolig/i.test(tx.description);
    return {
      category_key: looksLikeMortgage ? "housing:mortgage" : "loans:other",
      source: src,
    };
  }
  if (type === "omkostning" || type === "omkostninger") {
    return { category_key: "fees", source: src };
  }
  if (type === "renter" && tx.amount > 0) {
    return { category_key: "income:interest", source: src };
  }
  if (type === "cash" || subtype.includes("kontant")) {
    return { category_key: "cash", source: src };
  }
  return null;
}

function detectTransfer(
  tx: TxForCategorization,
  ctx: CategorizationContext,
): CategorizationResult | null {
  const account = ctx.accountsByNumber.get(
    normalizeAccountNumber(tx.counterparty_account),
  );
  if (account) {
    if (account.kind === "loan") {
      // A regular term payment is a housing cost; a lump sum to a loan account is a payoff/refinancing.
      const isTerm = /lån/i.test(tx.bank_subtype ?? "") ||
        Math.abs(tx.amount) < 100_000;
      return {
        category_key: isTerm ? "housing:mortgage" : "loans:payoff",
        source: "transfer:account",
      };
    }
    if (account.kind === "savings") {
      return { category_key: "savings:deposit", source: "transfer:account" };
    }
    return {
      category_key: account.owner === tx.owner
        ? "transfer:own"
        : "transfer:partner",
      source: "transfer:account",
    };
  }
  const owner = ownerForName(ctx.config, tx.counterparty) ??
    ownerForName(ctx.config, tx.description);
  if (owner) {
    return {
      category_key: owner === tx.owner ? "transfer:own" : "transfer:partner",
      source: "transfer:name",
    };
  }
  const subtype = (tx.bank_subtype ?? "").toLowerCase();
  if (subtype === "overføring til egen konto") {
    return { category_key: "transfer:own", source: "transfer:bank" };
  }
  return null;
}

export function fieldValue(tx: TxForCategorization, field: RuleField): string {
  switch (field) {
    case "merchant":
      return tx.merchant;
    case "description":
      return tx.description;
    case "counterparty":
      return tx.counterparty ?? "";
    case "message":
      return tx.message ?? "";
    case "bank_type":
      return tx.bank_type ?? "";
    case "bank_subtype":
      return tx.bank_subtype ?? "";
    case "any":
      return [
        tx.merchant,
        tx.description,
        tx.counterparty ?? "",
        tx.message ?? "",
      ].join(" \n ");
  }
}

export function compileRule(
  rule: {
    id: number;
    priority: number;
    name: string;
    field: string;
    pattern: string;
    category_key: string;
    source: string;
  },
): CompiledRule | null {
  try {
    return {
      ...rule,
      field: rule.field as RuleField,
      regex: new RegExp(rule.pattern, "i"),
    };
  } catch {
    console.warn(
      `Skipping rule "${rule.name}": invalid pattern ${rule.pattern}`,
    );
    return null;
  }
}

/** Escapes a literal merchant key so it can be stored as an exact-match rule. */
export function exactPattern(value: string): string {
  return "^" + value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$";
}
