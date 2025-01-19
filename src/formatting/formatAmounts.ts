export function formatAmounts(amount: string | undefined) {
  const num = Number((amount || "").replace(",", "."));
  return {
    incoming: num > 0 ? num : 0,
    outgoing: num < 0 ? num : 0,
    original_amount: num,
  };
}
