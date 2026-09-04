import { assertEquals } from "@std/assert";
import { normalizeMerchant } from "./merchant.ts";

const cases: [string, string][] = [
  ["Vipps*FLYTOGET AS", "FLYTOGET"],
  ["Spotify P411AB172B", "SPOTIFY"],
  ["SpotifySE", "SPOTIFY"],
  ["27.10 JOKER MØLLERGAT MØLLERGATA 3 OSLO", "JOKER MØLLERGAT MØLLERGATA 3"],
  ["JOKER ILA OSLO NO", "JOKER ILA"],
  ["TIL STIFTELSEN SOS-BARNEBYER NORGE", "SOS-BARNEBYER"],
  ["FRA RIKARD BJØRSTAD EIDE", "RIKARD BJØRSTAD EIDE"],
  ["Lønn fra OTOVO ASA", "OTOVO ASA"],
  ["Lofotgata 4 Borettslag (98202695701)", "LOFOTGATA 4 BORETTSLAG"],
  ["HYRE AS* BID:1738942", "HYRE"],
  ["BOLT.EU/O/2401111200", "BOLT"],
  ["BOLT.EUO2504202046", "BOLT"],
  ["Zettle_*Emmas Bagels A", "EMMAS BAGELS A"],
  ["VFI*BABBO COLLECTIVE A", "BABBO COLLECTIVE A"],
  ["Vippa BZ66YK9D", "VIPPA"],
  ["WM SUPERCENTER #1076", "WM SUPERCENTER"],
  ["REMA 1000 TORGGATA", "REMA 1000"],
  ["7ELEVEN 7068 YOUNGSTOR", "7-ELEVEN"],
  ["10 APENT BAKERI", "ÅPENT BAKERI"],
  ["10 ÅPENT BAKERI", "ÅPENT BAKERI"],
  ["STATENS LÅNEKAS", "LÅNEKASSEN"],
  ["TIL STATENS LÅNEKASSE FOR UTDANNIN", "LÅNEKASSEN"],
  ["Norwegian3287392504575", "NORWEGIAN"],
  ["SAS1172544039469", "SAS"],
  ["Til konto: 9053 71 01163", "KONTO 90537101163"],
  ["BILK*BILKOLLE", "BILKOLLEKTIVET"],
  ["8508 ?P IN BETW", "ØKERN PORTAL"],
  ["8508 ØP IN BETW", "ØKERN PORTAL"],
  ["MCDSTORGATA", "MCDONALDS"],
  ["SM? SPOR AS", "SMÅ SPOR"],
  ["PADDLE.NET* CLEANSHOTX", "CLEANSHOTX"],
  ["WWW.SNUZ.CO.UK", "SNUZ.CO.UK"],
  ["WWW.USE.AI/US", "USE.AI/US"],
  ["   ", "UNKNOWN"],
];

Deno.test("normalizeMerchant", async (t) => {
  for (const [input, expected] of cases) {
    await t.step(`${JSON.stringify(input)} → ${expected}`, () => {
      assertEquals(normalizeMerchant(input), expected);
    });
  }
});
