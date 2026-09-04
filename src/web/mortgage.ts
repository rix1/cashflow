/** Standard annuity payment per month. */
export function annuityPayment(
  principal: number,
  annualRatePct: number,
  years: number,
): number {
  const r = annualRatePct / 100 / 12;
  const n = Math.max(1, Math.round(years * 12));
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function firstMonthInterest(
  principal: number,
  annualRatePct: number,
): number {
  return (principal * annualRatePct) / 100 / 12;
}

/** Rough outstanding balance implied by a monthly interest amount at a given nominal rate. */
export function balanceFromInterest(
  monthlyInterest: number,
  annualRatePct: number,
): number | null {
  if (annualRatePct <= 0) return null;
  return (monthlyInterest * 12) / (annualRatePct / 100);
}

export const NORWEGIAN_INTEREST_DEDUCTION = 0.22;
