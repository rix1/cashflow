export type UserInput = {
  bank: Bank;
  account: string;
  owner: string;
  current_balance: number;
};

export type PartialTransaction = {
  date: string;
  original_amount: number;
  incoming: number;
  outgoing: number;
  description: string;
  currency: string;
  original_currency: null | string;
  conversion_rate: string;
};

export type CompleteTransaction = PartialTransaction &
  Omit<UserInput, "current_balance">;

export type Bank = "nordea" | "dnb" | "handelsbanken";
