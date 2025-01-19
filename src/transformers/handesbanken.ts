import { formatAmounts } from "../formatting/formatAmounts.ts";
import { formatDate } from "../formatting/formatDate.ts";
import { lexer } from "../lexer/lexer.ts";
import { PartialTransaction } from "../types.ts";

export type HandelsBanken = {
  Dato: string;
  Beløp: string;
  Beskrivelse: string;
};

export function handelsbankenTransformer(
  data: Record<string, string | undefined>[]
): PartialTransaction[] {
  return (data as HandelsBanken[]).map((element) => {
    const parsedDescription = lexer(element["Beskrivelse"]);
    const amounts = formatAmounts(element["Beløp"]);
    return {
      date: formatDate(element["Dato"]),
      description: parsedDescription.source,
      incoming: amounts.incoming,
      outgoing: amounts.outgoing,
      original_amount: amounts.original_amount,
      currency: "NOK",
      original_currency: parsedDescription.currency,
      converstion_rate: parsedDescription.converstion_rate,
    };
  });
}
