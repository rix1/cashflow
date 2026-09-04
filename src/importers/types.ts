export type LoanBreakdown = {
  loan_account: string | null;
  principal: number;
  interest: number;
  fees: number;
};

/** One bank statement line, normalized. Amount is signed in the account currency. */
export type NormalizedRow = {
  date: string;
  executed_date: string | null;
  amount: number;
  currency: string;
  original_amount: number | null;
  original_currency: string | null;
  conversion_rate: number | null;
  description: string;
  merchant: string;
  counterparty: string | null;
  counterparty_account: string | null;
  own_account: string | null;
  bank_type: string | null;
  bank_subtype: string | null;
  message: string | null;
  card: string | null;
  pending: boolean;
  loan: LoanBreakdown | null;
  raw: Record<string, string>;
};

export type ParsedStatement = {
  format: string;
  bank: string;
  rows: NormalizedRow[];
  /** Most frequent own account number in the file, digits only. */
  account_number: string | null;
  opening_balance: number | null;
  opening_date: string | null;
  closing_balance: number | null;
  closing_date: string | null;
  total_in: number | null;
  total_out: number | null;
};

export interface Importer {
  name: string;
  bank: string;
  detect(headerLine: string): boolean;
  parse(text: string): ParsedStatement;
}
