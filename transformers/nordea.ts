import { formatAmounts } from "../formatting/formatAmounts.ts";
import { formatDate } from "../formatting/formatDate.ts";
import { lexer } from "../lexer/lexer.ts";
import { PartialTransaction } from "../types.ts";

export type Nordea = {
  Bokføringsdato: string;
  Beløp: string;
  Tittel: string;
  Valuta: "NOK";
  Betalingstype: string;
};

export function nordeaTransformer(
  data: Record<string, string | undefined>[]
): PartialTransaction[] {
  return (data as Nordea[]).map((element) => {
    const parsedDescription = lexer(element["Tittel"]);
    const amounts = formatAmounts(element["Beløp"]);
    return {
      date: formatDate(element["Bokføringsdato"]),
      description: parsedDescription.source,
      incoming: amounts.incoming,
      outgoing: amounts.outgoing,
      original_amount: amounts.original_amount,
      currency: element["Valuta"],
      original_currency: parsedDescription.currency,
      converstion_rate: parsedDescription.converstion_rate,
    };
  });
}
