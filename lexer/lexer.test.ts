import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { lexer } from "./lexer.ts";

const testCases = [
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
    "Nettgiro til: Skatteetaten-Skatteinnkreving Betalt: 28.08.23",
    "Nettgiro til: Skatteetaten-Skatteinnkreving",
  ],
  [
    "Nettgiro til: Skatteetaten-Skatteinnkreving Betalt: 28.08.23",
    "Nettgiro til: Skatteetaten-Skatteinnkreving",
  ],
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
];

for (const [input, expected] of testCases) {
  Deno.test(" Lexer format source correctly", () => {
    const result = lexer(input);
    assertEquals(result.source, expected);
  });
}
