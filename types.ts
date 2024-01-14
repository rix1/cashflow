export type UserInput = {
  bank: string;
  account: string;
  owner: string;
  current_balance: number;
};

export type PartialTransaction = {
  date: string;
  original_amount: number;
  incoming: number | undefined;
  outgoing: number | undefined;
  description: string;
  currency: "NOK";
  original_currency: undefined | string;
  converstion_rate: string;
};

type CompleteTransaction = PartialTransaction &
  Omit<UserInput, "current_balance">;
