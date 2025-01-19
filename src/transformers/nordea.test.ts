import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { parse } from "@std/csv/parse";
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
      incoming: 0,
      outgoing: -300.0,
      original_amount: -300.0,
      currency: "NOK",
      original_currency: "",
      conversion_rate: "",
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
      incoming: 0,
      outgoing: -291.13,
      original_amount: -291.13,
      currency: "NOK",
      original_currency: "",
      conversion_rate: "",
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
      incoming: 0,
      outgoing: -22.0,
      original_amount: -22.0,
      currency: "NOK",
      original_currency: "",
      conversion_rate: "",
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
        incoming: 0,
        outgoing: -300.0,
        original_amount: -300.0,
        currency: "NOK",
        original_currency: "",
        conversion_rate: "",
      },
      {
        date: "2025-01-17",
        description: "OPENAI *CHATGPT SUBSCR",
        incoming: 0,
        outgoing: -291.13,
        original_amount: -291.13,
        currency: "NOK",
        original_currency: "",
        conversion_rate: "",
      },
      {
        date: "2025-01-16",
        description: "VOI NO",
        incoming: 0,
        outgoing: -22.0,
        original_amount: -22.0,
        currency: "NOK",
        original_currency: "",
        conversion_rate: "",
      },
    ];

    const results = nordeaTransformer(inputs);
    assertEquals(results, expected);
  });
});

const sampleData = `Bokføringsdato;Beløp;Avsender;Mottaker;Navn;Tittel;Valuta;Betalingstype
2024/12/23;-1003,40;6219.12.77436;;;HYRE AS* BID:1738942;NOK;Visa varekjøp/uttak
2024/11/07;-980,50;6219.12.77436;;;HYRE AS* BID:1675766;NOK;Visa varekjøp/uttak
2024/09/26;-526,20;6219.12.77436;;;HYRE AS* BID:1612759;NOK;Visa varekjøp/uttak
2024/08/12;-587,15;6219.12.77436;;;HYRE AS* BID:1530057;NOK;Visa varekjøp/uttak
2024/08/12;-999,00;6219.12.77436;;;HYRE AS* BID:1530057;NOK;Visa varekjøp/uttak`;

Deno.test("Nordea transformer - integration test with real data", async (t) => {
  await t.step("should correctly transform HYRE transactions", () => {
    const parsedData = parse(sampleData, {
      skipFirstRow: true,
      separator: ";",
    });

    const result = nordeaTransformer(parsedData);
    const expected = [
      {
        date: "2024-12-23",
        description: "HYRE AS",
        incoming: 0,
        outgoing: -1003.4,
        original_amount: -1003.4,
        currency: "NOK",
        original_currency: "",
        conversion_rate: "",
      },
      {
        date: "2024-11-07",
        description: "HYRE AS",
        incoming: 0,
        outgoing: -980.5,
        original_amount: -980.5,
        currency: "NOK",
        original_currency: "",
        conversion_rate: "",
      },
      {
        date: "2024-09-26",
        description: "HYRE AS",
        incoming: 0,
        outgoing: -526.2,
        original_amount: -526.2,
        currency: "NOK",
        original_currency: "",
        conversion_rate: "",
      },
      {
        date: "2024-08-12",
        description: "HYRE AS",
        incoming: 0,
        outgoing: -587.15,
        original_amount: -587.15,
        currency: "NOK",
        original_currency: "",
        conversion_rate: "",
      },
      {
        date: "2024-08-12",
        description: "HYRE AS",
        incoming: 0,
        outgoing: -999.0,
        original_amount: -999.0,
        currency: "NOK",
        original_currency: "",
        conversion_rate: "",
      },
    ];

    assertEquals(result, expected);
  });
});
