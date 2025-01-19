import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { lexer } from "./lexer.ts";

const sourceTests = [
  ['="*7889 30.10 NOK 182.30 JOKER ILA Kurs: 1.0000"', "JOKER ILA"],
  ['="*7889 31.10 NOK 39.00 RUTERAPPEN Kurs: 1.0000"', "RUTERAPPEN"],
  [
    '="*6483 11.01 EUR 41.40 BOLT.EU/O/2401111200 Kurs: 11.5918"',
    "BOLT.EU/O/2401111200",
  ],
  [
    '="*7889 10.11 USD 25.00 EGGHEAD.IO TRAINING Kurs: 10.5508"',
    "EGGHEAD.IO TRAINING",
  ],
  ['="*7889 31.10 NOK 39.00 RUTERAPPEN Kurs: 1.0000"', "RUTERAPPEN"],
  ['="*4288 26.08 DKK 40.40 OK Ejby Kurs: 1.5881"', "OK Ejby"],
  ["PLUS.EXCALIDRAW.COM", "PLUS.EXCALIDRAW.COM"],
  ["AniCura Grunerløkka Betalt: 29.08.23", "AniCura Grunerløkka"],
  [
    '="*6483 11.01 NOK 230.00 Vipps*FLYTOGET AS Kurs: 1.0000"',
    "Vipps*FLYTOGET AS",
  ],
  [
    '="*6483 11.01 EUR 41.40 BOLT.EU/O/2401111200 Kurs: 11.5918"',
    "BOLT.EU/O/2401111200",
  ],
  ['="*6483 11.01 NOK 1104.00 DUTY-FREE 7103 Kurs: 1.0000"', "DUTY-FREE 7103"],
  ['="*6483 11.01 NOK 604.00 Wolt Kurs: 1.0000"', "Wolt"],
  ['="RUTERAPPEN"', "RUTERAPPEN"],
  ['="Fellesutgifter lofotagata"', "Fellesutgifter lofotagata"],
  ['="*7889 23.06 HUF 19895.00 Satchmo Kurs: 0.0326"', "Satchmo"],
  [
    '="*7889 04.09 SEK 23.00 CIRCLE K UDDEVALLA Kurs: 1.0026"',
    "CIRCLE K UDDEVALLA",
  ],
  [
    '="*7889 14.07 GBP 9.99 GOOGLE YouTube Videos Kurs: 13.4675"',
    "GOOGLE YouTube Videos",
  ],
];

Deno.test("Lexer:Source", async (t) => {
  for (let index = 0; index < sourceTests.length; index++) {
    const [input, expected] = sourceTests[index];
    await t.step(`formats ${input}`, () => {
      const result = lexer(input, true);
      assertEquals(result.source, expected);
    });
  }
});

const paid_to_tests = [
  [
    "Nettgiro til: Skatteetaten-Skatteinnkreving Betalt: 28.08.23",
    "Skatteetaten-Skatteinnkreving",
  ],
  ['=" Nettgiro til: 2320.84.07473 Betalt: 20.12.22"', "23208407473"],
];

Deno.test("Lexer:To", async (t) => {
  for (let index = 0; index < paid_to_tests.length; index++) {
    const [input, expected] = paid_to_tests[index];
    await t.step(`formats ${input}`, () => {
      const result = lexer(input, true);
      assertEquals(result.paid_to, expected);
    });
  }
});

const paid_from_tests = [
  ['=" Nettgiro fra: Siri Holtnæs Betalt: 22.12.22"', "Siri Holtnæs"],
];

Deno.test("Lexer:From", async (t) => {
  for (let index = 0; index < paid_from_tests.length; index++) {
    const [input, expected] = paid_from_tests[index];
    await t.step(`formats ${input}`, () => {
      const result = lexer(input, true);
      assertEquals(result.from, expected);
    });
  }
});
