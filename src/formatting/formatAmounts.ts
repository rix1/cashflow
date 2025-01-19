export function formatAmounts(amount: string) {
  const num = Number(amount.replace(",", "."));
  return {
    incoming: num > 0 ? num : undefined,
    outgoing: num < 0 ? num : undefined,
    original_amount: num,
  };
}
