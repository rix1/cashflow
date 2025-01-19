import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { nordeaTransformer } from "./nordea.ts";

Deno.test("Nordea transformer test suite", async (t) => {
  await t.step("should handle Avtalegiro payment", () => {
    const input = {
      Bokføringsdato: "2025/01/17",
      Beløp: "-300,00",
      Avsender: "6219.12.77436",
      Mottaker: "",
      Navn: "",
      Tittel: "TIL STIFTELSEN SOS-BARNEBYER NORGE",
      Valuta: "NOK",
      Betalingstype: "Avtalegiro",
    };

    const expected = {
      date: "2025-01-17",
      description: "TIL STIFTELSEN SOS-BARNEBYER NORGE",
      incoming: undefined,
      outgoing: -300.0,
      original_amount: -300.0,
      currency: "NOK",
      original_currency: "",
      converstion_rate: "",
    };

    const result = nordeaTransformer([input])[0];
    assertEquals(result, expected);
  });

  await t.step("should handle Visa payment", () => {
    const input = {
      Bokføringsdato: "2025/01/17",
      Beløp: "-291,13",
      Avsender: "6219.12.77436",
      Mottaker: "",
      Navn: "",
      Tittel: "OPENAI *CHATGPT SUBSCR",
      Valuta: "NOK",
      Betalingstype: "Visa varekjøp/uttak",
    };

    const expected = {
      date: "2025-01-17",
      description: "OPENAI *CHATGPT SUBSCR",
      incoming: undefined,
      outgoing: -291.13,
      original_amount: -291.13,
      currency: "NOK",
      original_currency: "",
      converstion_rate: "",
    };

    const result = nordeaTransformer([input])[0];
    assertEquals(result, expected);
  });

  await t.step("should handle small amount Visa payment", () => {
    const input = {
      Bokføringsdato: "2025/01/16",
      Beløp: "-22,00",
      Avsender: "6219.12.77436",
      Mottaker: "",
      Navn: "",
      Tittel: "VOI NO",
      Valuta: "NOK",
      Betalingstype: "Visa varekjøp/uttak",
    };

    const expected = {
      date: "2025-01-16",
      description: "VOI NO",
      incoming: undefined,
      outgoing: -22.0,
      original_amount: -22.0,
      currency: "NOK",
      original_currency: "",
      converstion_rate: "",
    };

    const result = nordeaTransformer([input])[0];
    assertEquals(result, expected);
  });

  // Test for all transactions at once
  await t.step("should handle multiple transactions", () => {
    const inputs = [
      {
        Bokføringsdato: "2025/01/17",
        Beløp: "-300,00",
        Avsender: "6219.12.77436",
        Mottaker: "",
        Navn: "",
        Tittel: "TIL STIFTELSEN SOS-BARNEBYER NORGE",
        Valuta: "NOK",
        Betalingstype: "Avtalegiro",
      },
      {
        Bokføringsdato: "2025/01/17",
        Beløp: "-291,13",
        Avsender: "6219.12.77436",
        Mottaker: "",
        Navn: "",
        Tittel: "OPENAI *CHATGPT SUBSCR",
        Valuta: "NOK",
        Betalingstype: "Visa varekjøp/uttak",
      },
      {
        Bokføringsdato: "2025/01/16",
        Beløp: "-22,00",
        Avsender: "6219.12.77436",
        Mottaker: "",
        Navn: "",
        Tittel: "VOI NO",
        Valuta: "NOK",
        Betalingstype: "Visa varekjøp/uttak",
      },
    ];

    const expected = [
      {
        date: "2025-01-17",
        description: "TIL STIFTELSEN SOS-BARNEBYER NORGE",
        incoming: undefined,
        outgoing: -300.0,
        original_amount: -300.0,
        currency: "NOK",
        original_currency: "",
        converstion_rate: "",
      },
      {
        date: "2025-01-17",
        description: "OPENAI *CHATGPT SUBSCR",
        incoming: undefined,
        outgoing: -291.13,
        original_amount: -291.13,
        currency: "NOK",
        original_currency: "",
        converstion_rate: "",
      },
      {
        date: "2025-01-16",
        description: "VOI NO",
        incoming: undefined,
        outgoing: -22.0,
        original_amount: -22.0,
        currency: "NOK",
        original_currency: "",
        converstion_rate: "",
      },
    ];

    const results = nordeaTransformer(inputs);
    assertEquals(results, expected);
  });
});
