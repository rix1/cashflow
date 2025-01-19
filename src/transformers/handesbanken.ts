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
  data: HandelsbankenTransaction[],
): PartialTransaction[] {
  return data.map((transaction) => {
    const parsedDescription = lexer(transaction["Melding/KID/Fakt.nr"]);
    const incoming = transaction["Beløp inn"]
      ? Number(transaction["Beløp inn"])
      : undefined;
    const outgoing = transaction["Beløp ut"]
      ? Number(transaction["Beløp ut"])
      : undefined;
    const original_amount = incoming ?? outgoing ?? 0;

    return {
      date: formatDate(transaction["Utført dato"]),
      description: parsedDescription.source || transaction["Mottakernavn"],
      incoming,
      outgoing,
      original_amount,
      currency: transaction["Valuta"],
      original_currency: parsedDescription.currency,
      converstion_rate: parsedDescription.converstion_rate,
    };
  });
}
