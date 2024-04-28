export type UserInput = {
  bank: string;
  account: string;
  owner: string;
  current_balance: number;
};

export type PartialTransaction = {
  converstion_rate: string;
  currency: "NOK";
  date: string;
  description: string;
  incoming: number | undefined;
  original_amount: number;
  original_currency: undefined | string;
  outgoing: number | undefined;
};

type CompleteTransaction = PartialTransaction &
  Omit<UserInput, "current_balance">;
