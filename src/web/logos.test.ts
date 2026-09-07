import { assertEquals, assertMatch } from "@std/assert";
import { domainForMerchant, monogram, monogramSvg, sniff } from "./logos.ts";

Deno.test("domainForMerchant: known map, embedded domains, unknown", () => {
  assertEquals(domainForMerchant("SPOTIFY"), "spotify.com");
  assertEquals(domainForMerchant("COOP MEGA ALEXANDER KIELLAND"), "coop.no");
  assertEquals(domainForMerchant("PLUS.EXCALIDRAW.COM"), "plus.excalidraw.com");
  assertEquals(domainForMerchant("APPLE.COM/BILL"), "apple.com");
  assertEquals(domainForMerchant("SNUZ.CO.UK"), "snuz.co.uk");
  assertEquals(domainForMerchant("JAVA ESPRESSOBAR"), null);
});

Deno.test("monogram", () => {
  assertEquals(monogram("JAVA ESPRESSOBAR"), "JE");
  assertEquals(monogram("WOLT"), "WO");
  assertEquals(monogram("ÅPENT BAKERI"), "ÅB");
  assertEquals(monogram("***"), "?");
  assertMatch(monogramSvg("Java Espressobar"), /<svg[^>]*>.*JE.*<\/svg>/s);
});

Deno.test("sniff accepts real image signatures only", () => {
  assertEquals(
    sniff(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])),
    "image/png",
  );
  assertEquals(sniff(new Uint8Array([0, 0, 1, 0, 0, 0, 0, 0])), "image/x-icon");
  assertEquals(
    sniff(new TextEncoder().encode("<html><body>404</body></html>")),
    null,
  );
  assertEquals(sniff(new Uint8Array()), null);
});
