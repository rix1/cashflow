import { parseNorwegianAmount } from "./amounts.ts";
import type { LoanBreakdown } from "./types.ts";

/**
 * Handelsbanken loan repayments carry a multi-line message like
 *   Til:90537101163
 *        Avdrag:             kr         8.393,00
 *        Renter:             kr        16.688,00
 *        Terminomkostninger: kr            50,00
 */
export function parseLoanMessage(
  message: string | null | undefined,
): LoanBreakdown | null {
  if (!message) return null;
  const principal = pick(message, /Avdrag:\s*kr\s*([\d.,\s]+)/i);
  const interest = pick(message, /Renter:\s*kr\s*([\d.,\s]+)/i);
  const fees = pick(message, /Terminomkostninger:\s*kr\s*([\d.,\s]+)/i);
  if (principal == null && interest == null) return null;
  const account = /Til:\s*([\d.\s]+)/i.exec(message)?.[1]?.replace(/\D/g, "") ??
    null;
  return {
    loan_account: account || null,
    principal: principal ?? 0,
    interest: interest ?? 0,
    fees: fees ?? 0,
  };
}

function pick(text: string, re: RegExp): number | null {
  const m = re.exec(text);
  return m ? parseNorwegianAmount(m[1].trim()) : null;
}
