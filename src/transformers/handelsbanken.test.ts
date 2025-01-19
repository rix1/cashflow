import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { handelsbankenTransformer } from "./handesbanken.ts";

const sampleInput = {
  "Utført dato": "19.01.2025",
  "Bokført dato": "19.01.2025",
  Rentedato: "19.01.2025",
  Beskrivelse: "Varekjøp",
  Type: "Varekjøp",
  Undertype: "Kort",
  "Fra konto": "12345678903",
  Avsender: "John Doe",
  "Til konto": "",
  Mottakernavn: "REMA 1000",
  "Beløp inn": "",
  "Beløp ut": "-150.00",
  Valuta: "NOK",
  Status: "Utført",
  "Melding/KID/Fakt.nr": "*1234 15.01 NOK 150.00 REMA 1000 Kurs: 1.0000",
};

Deno.test("Handelsbanken transformer - outgoing", () => {
  const expected = {
    date: "2025-01-19",
    description: "REMA 1000",
    incoming: undefined,
    outgoing: -150.0,
    original_amount: -150.0,
    currency: "NOK",
    original_currency: "NOK",
    converstion_rate: "1.0000",
  };

  const result = handelsbankenTransformer([sampleInput])[0];
  assertEquals(result, expected);
});

Deno.test("Handelsbanken transformer - incoming", () => {
  sampleInput["Beløp inn"] = "150.00";
  sampleInput["Beløp ut"] = "";
  const expected = {
    date: "2025-01-19",
    description: "REMA 1000",
    outgoing: undefined,
    incoming: 150.0,
    original_amount: 150.0,
    currency: "NOK",
    original_currency: "NOK",
    converstion_rate: "1.0000",
  };

  const result = handelsbankenTransformer([sampleInput])[0];
  assertEquals(result, expected);
});
