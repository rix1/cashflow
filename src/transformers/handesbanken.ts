import { formatAmounts } from "../formatting/formatAmounts.ts";
import { formatDate } from "../formatting/formatDate.ts";
import { lexer } from "../lexer/lexer.ts";
import { PartialTransaction } from "../types.ts";

export type HandelsbankenTransaction = {
  "Utført dato": string;
  "Bokført dato": string;
  Rentedato: string;
  Beskrivelse: string;
  Type: string;
  Undertype: string;
  "Fra konto": string;
  Avsender: string;
  "Til konto": string;
  Mottakernavn: string;
  "Beløp inn": string;
  "Beløp ut": string;
  Valuta: string;
  Status: string;
  "Melding/KID/Fakt.nr": string;
};

export function handelsbankenTransformer(
  data: Record<string, string | undefined>[],
): PartialTransaction[] {
  return (data as HandelsbankenTransaction[]).map((transaction) => {
    const parsedDescription = lexer(transaction["Melding/KID/Fakt.nr"]);

    const incomingAmount = formatAmounts(transaction["Beløp inn"]);
    const outgoingAmount = formatAmounts(transaction["Beløp ut"]);

    const original_amount =
      incomingAmount.original_amount || outgoingAmount.original_amount || 0;

    return {
      date: formatDate(transaction["Utført dato"]),
      description: parsedDescription.source || transaction["Mottakernavn"],
      incoming: incomingAmount.incoming,
      outgoing: outgoingAmount.outgoing,
      original_amount,
      currency: transaction["Valuta"] || "NOK",
      original_currency:
        parsedDescription.currency || transaction["Valuta"] || "NOK",
      conversion_rate: parsedDescription.conversion_rate || "1.0000",
    };
  });
}
