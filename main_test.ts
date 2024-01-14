import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { lexer } from "./main.ts";

Deno.test(function testLexer() {
  assertEquals(
    lexer("*7889 30.10 NOK 182.30 JOKER ILA Kurs: 1.0000").source,
    "JOKER ILA"
  );
  assertEquals(
    lexer("*7889 31.10 NOK 39.00 RUTERAPPEN Kurs: 1.0000").source,
    "RUTERAPPEN"
  );
  assertEquals(
    lexer("*6483 11.01 EUR 41.40 BOLT.EU/O/2401111200 Kurs: 11.5918").source,
    "BOLT.EU/O/2401111200"
  );
  assertEquals(
    lexer("*7889 10.11 USD 25.00 EGGHEAD.IO TRAINING Kurs: 10.5508").source,
    "EGGHEAD.IO TRAINING"
  );
  assertEquals(
    lexer("*7889 31.10 NOK 39.00 RUTERAPPEN Kurs: 1.0000").source,
    "RUTERAPPEN"
  );
  assertEquals(
    lexer("*4288 26.08 DKK 40.40 OK Ejby Kurs: 1.5881").source,
    "OK Ejby"
  );
  assertEquals(lexer("PLUS.EXCALIDRAW.COM").source, "PLUS.EXCALIDRAW.COM");
  assertEquals(
    lexer("AniCura Grunerløkka Betalt: 29.08.23").source,
    "AniCura Grunerløkka"
  );
  assertEquals(
    lexer("Nettgiro til: Skatteetaten-Skatteinnkreving Betalt: 28.08.23")
      .source,
    "Nettgiro til: Skatteetaten-Skatteinnkreving"
  );
});
