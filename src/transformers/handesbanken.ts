import { formatDate } from "../formatting/formatDate.ts";
import { lexer } from "../lexer/lexer.ts";
import { PartialTransaction } from "../types.ts";

export type HandelsBanken = {
  "Utført dato": string;
  "Beløp ut": string;
  "Beløp inn": string;
  "Melding/KID/Fakt.nr": string;
};

export function handelsbankenTransformer(
  data: Record<string, string | undefined>[],
): PartialTransaction[] {
  return (data as HandelsBanken[]).map((element) => {
    const parsedDescription = lexer(element["Melding/KID/Fakt.nr"]);

    const incoming = Number(element["Beløp inn"]);
    const outgoing = Number(element["Beløp inn"]);
    console.log(element);

    return {
      date: formatDate(element["Utført dato"]),
      description: parsedDescription.source,
      incoming: incoming,
      outgoing: outgoing,
      original_amount: incoming || outgoing,
      currency: "NOK",
      original_currency: parsedDescription.currency,
      converstion_rate: parsedDescription.converstion_rate,
    };
  });
}
