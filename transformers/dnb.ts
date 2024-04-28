import { formatDate } from "../formatting/formatDate.ts";
import { formatDescription } from "../formatting/formatDescription.ts";
import { lexer } from "../lexer/lexer.ts";
import { PartialTransaction } from "../types.ts";

export type DNB = {
  Dato: string;
  Forklaring: string;
  Rentedato: string;
  "Inn på konto": string | undefined;
  "Ut fra konto": string | undefined;
};

export function dnbTransformer(
  data: Record<string, string | undefined>[]
): PartialTransaction[] {
  return (data as DNB[]).map((element) => {
    const parsedDescription = lexer(element["Forklaring"]);
    const originalAmount = element["Ut fra konto"]
      ? -Number(element["Ut fra konto"])
      : Number(element["Inn på konto"] || 0);
    return {
      converstion_rate: parsedDescription.converstion_rate,
      currency: "NOK",
      date: formatDate(element["Dato"]),
      description: formatDescription(parsedDescription),
      incoming: Number(element["Inn på konto"]) || undefined,
      original_amount: originalAmount,
      original_currency: parsedDescription.currency,
      outgoing: -Number(element["Ut fra konto"]) || undefined,
    };
  });
}
