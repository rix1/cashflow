import { assertEquals, assertExists } from "@std/assert";
import { parseStatementBytes } from "./mod.ts";
import { parseNorwegianAmount } from "./amounts.ts";
import { parseLoanMessage } from "./loan.ts";
import { fingerprintRows, foldText } from "./fingerprint.ts";
import { decodeStatement } from "./encoding.ts";

const latin1 = (s: string) =>
  new TextEncoder().encode(s).length === s.length
    ? new TextEncoder().encode(s)
    : new Uint8Array([...s].map((ch) => ch.charCodeAt(0)));

const HB_V2 = [
  "Utført dato;Bokført dato;Rentedato;Beskrivelse;Type;Undertype;Fra konto;Avsender;Til konto;Mottakernavn;Beløp inn;Beløp ut;Valuta;Status;Melding/KID/Fakt.nr",
  "04.09.2026;;;JAVA ESPRESSOBAR;Varekjøp;;9053 06 20149;Pengene her forsvinner;;;;-112.000;NOK;Reservert;JAVA ESPRESSOBAR",
  "17.08.2026;17.08.2026;17.08.2026;APOTEK 1;Varekjøp;Varekjøp debetkort;9053 06 20149;Rikard;;;;-364.8;NOK;Bokført;*1630 14.08 NOK 364.80 APOTEK 1 Kurs: 1.0000",
  '17.08.2026;17.08.2026;15.08.2026;Til konto: 9053 71 01163;Betaling innland;Nedbetaling av lån;9053 06 20149;Pengene her forsvinner;9053 71 01163;;;-25131;NOK;Bokført;"Til:90537101163',
  "     Avdrag:             kr         8.393,00",
  "     Renter:             kr        16.688,00",
  '     Terminomkostninger: kr            50,00"',
  "14.08.2026;14.08.2026;14.08.2026;Lønn fra OTOVO ASA;Lønn;Lønn;1503 53 82752;;9053 06 20149;Rikard;50631.02;;NOK;Bokført;Lønn",
  "20.04.2026;20.04.2026;20.04.2026;BOLT.EUO2504202046;Varekjøp;Varekjøp debetkort;9053 06 20149;Rikard;;;;-71.56;NOK;Bokført;*6483 20.04 EUR 5.85 BOLT.EUO2504202046 Kurs: 12.2325",
  "05.11.2025;05.11.2025;05.11.2025;05.11 CORDIAL AS FROGNERVEIEN OSLO;Varekjøp;Varekjøp debetkort;9053 06 20149;Rikard;;;;-13150.5;NOK;Bokført;05.11 CORDIAL AS FROGNERVEIEN OSLO",
  ";;;;;;;;;;;;;;",
  "Inngående saldo pr. 01.01.2025:;;270 039,54 NOK;;;;;;;;;;;;",
  "Utgående  saldo pr. 04.09.2026:;;12 755,58 NOK;;;;;;;;;;;;",
].join("\n");

Deno.test("Handelsbanken v2: latin1, semicolons, multi-line messages, footer", () => {
  const parsed = parseStatementBytes(latin1(HB_V2), "test.csv");
  assertEquals(parsed.format, "handelsbanken-v2");
  assertEquals(parsed.encoding, "iso-8859-1");
  assertEquals(parsed.account_number, "90530620149");
  assertEquals(parsed.opening_balance, 270039.54);
  assertEquals(parsed.opening_date, "2025-01-01");
  assertEquals(parsed.closing_balance, 12755.58);
  assertEquals(parsed.rows.length, 6);

  const [pending, apotek, loan, salary, bolt, cordial] = parsed.rows;
  assertEquals(pending.pending, true);
  assertEquals(apotek.date, "2026-08-17");
  assertEquals(apotek.amount, -364.8);
  assertEquals(apotek.merchant, "APOTEK 1");
  assertEquals(apotek.card, "*1630");
  assertEquals(apotek.original_currency, "NOK");

  assertEquals(loan.bank_subtype, "Nedbetaling av lån");
  assertEquals(loan.counterparty_account, "90537101163");
  assertEquals(loan.loan, {
    loan_account: "90537101163",
    principal: 8393,
    interest: 16688,
    fees: 50,
  });

  assertEquals(salary.amount, 50631.02);
  assertEquals(salary.own_account, "90530620149");
  assertEquals(salary.merchant, "OTOVO ASA");
  assertEquals(salary.bank_type, "Lønn");

  assertEquals(bolt.merchant, "BOLT");
  assertEquals(bolt.original_currency, "EUR");
  assertEquals(bolt.original_amount, -5.85);
  assertEquals(bolt.conversion_rate, 12.2325);

  assertEquals(cordial.merchant, "CORDIAL AS FROGNERVEIEN");
});

const HB_V1 = [
  "Utført dato,Bokført dato,Rentedato,,Beskrivelse,Type,Undertype,Fra konto,Avsender,Til konto,Mottakernavn,Beløp inn,Beløp ut,Valuta,Status,Melding/KID/Fakt.nr",
  "19.01.2025,,,,JOKER ILA,Varekjøp,,9053 06 20149,Pengene her forsvinner,,,,-234.18,NOK,Reservert,JOKER ILA",
  "02.01.2024,02.01.2024,02.01.2024,,Lofotgata 4 Borettslag (98202695701),Betaling innland - Avtalegiro med eFaktura,Betaling med KID innland,9053 06 20149,Pengene her forsvinner,9820 26 95701,Lofotgata 4 Borettslag,,-5952.00,NOK,Bokført,Fellesutgifter lofotagata",
  "02.01.2024,02.01.2024,02.01.2024,,VINMONOPOLET,Varekjøp,Varekjøp debetkort,9053 06 20149,Rikard Bjørstad Eide,,,,-2838.30,NOK,Bokført,*6483 29.12 NOK 2838.30 VINMONOPOLET Kurs: 1.0000",
].join("\n");

Deno.test("Handelsbanken v1: commas, utf-8, extra empty column", () => {
  const parsed = parseStatementBytes(new TextEncoder().encode(HB_V1));
  assertEquals(parsed.format, "handelsbanken-v1");
  assertEquals(parsed.rows.length, 3);
  assertEquals(parsed.rows[0].pending, true);
  const fees = parsed.rows[1];
  assertEquals(fees.merchant, "LOFOTGATA 4 BORETTSLAG");
  assertEquals(fees.counterparty, "Lofotgata 4 Borettslag");
  assertEquals(fees.counterparty_account, "98202695701");
  assertEquals(fees.message, "Fellesutgifter lofotagata");
  assertEquals(parsed.rows[2].merchant, "VINMONOPOLET");
  assertEquals(parsed.rows[2].executed_date, "2024-01-02");
});

const NORDEA = [
  "﻿Bokføringsdato;Beløp;Avsender;Mottaker;Navn;Tittel;Valuta;Betalingstype",
  "Reservert;-115,70;6219.12.77436;;;JOKER ILA             OSLO            NO;NOK;Varekjøp",
  "2026/09/03;-300,00;6219.12.77436;;;Brage Alrik Daae;NOK;Straksutbetaling",
  "2026/08/17;10000,00;;6219.12.77436;;Rikard Bjørstad Eide;NOK;Overførsel",
  "2024/12/23;-1003,40;6219.12.77436;;;HYRE AS* BID:1738942;NOK;Visa varekjøp/uttak",
  "2025/03/05;-169,00;6219.12.77436;;;SpotifySE;NOK;Visa varekjøp/uttak",
].join("\n");

Deno.test("Nordea: BOM, semicolons, pending rows, own account by direction", () => {
  const parsed = parseStatementBytes(new TextEncoder().encode(NORDEA));
  assertEquals(parsed.format, "nordea");
  assertEquals(parsed.encoding, "utf-8");
  assertEquals(parsed.account_number, "62191277436");
  assertEquals(parsed.rows[0].pending, true);
  assertEquals(parsed.rows[0].merchant, "JOKER ILA");
  const out = parsed.rows[1];
  assertEquals(out.date, "2026-09-03");
  assertEquals(out.amount, -300);
  assertEquals(out.own_account, "62191277436");
  assertEquals(out.bank_type, "Straksutbetaling");
  const inn = parsed.rows[2];
  assertEquals(inn.amount, 10000);
  assertEquals(inn.own_account, "62191277436");
  assertEquals(parsed.rows[3].merchant, "HYRE");
  assertEquals(parsed.rows[4].merchant, "SPOTIFY");
});

Deno.test("unknown header fails loudly", () => {
  let threw = false;
  try {
    parseStatementBytes(new TextEncoder().encode("Date,Amount\n2024-01-01,10"));
  } catch (e) {
    threw = String(e).includes("could not detect bank format");
  }
  assertEquals(threw, true);
});

Deno.test("parseNorwegianAmount", () => {
  assertEquals(parseNorwegianAmount("-1003,40"), -1003.4);
  assertEquals(parseNorwegianAmount("-150.00"), -150);
  assertEquals(parseNorwegianAmount("8.393,00"), 8393);
  assertEquals(parseNorwegianAmount("270 039,54 NOK"), 270039.54);
  assertEquals(parseNorwegianAmount("-112.000"), -112);
  assertEquals(parseNorwegianAmount(""), null);
  assertEquals(parseNorwegianAmount(undefined), null);
});

Deno.test("parseLoanMessage", () => {
  assertEquals(
    parseLoanMessage(
      "Til:90537101163\n     Avdrag:             kr         8.393,00\n     Renter:             kr        16.688,00\n     Terminomkostninger: kr            50,00",
    ),
    {
      loan_account: "90537101163",
      principal: 8393,
      interest: 16688,
      fees: 50,
    },
  );
  assertEquals(parseLoanMessage("Fellesutgifter"), null);
});

Deno.test("encoding sniffing", () => {
  assertEquals(
    decodeStatement(new TextEncoder().encode("﻿Beløp")).text,
    "Beløp",
  );
  assertEquals(
    decodeStatement(new Uint8Array([0x42, 0x65, 0x6c, 0xf8, 0x70])).text,
    "Beløp",
  );
  assertEquals(
    decodeStatement(new Uint8Array([0x61, 0x0d, 0x0a, 0x62])).text,
    "a\nb",
  );
});

Deno.test("fingerprints: identical rows get distinct ordinals, re-exports match, mangled chars fold", async () => {
  const parsed = parseStatementBytes(new TextEncoder().encode(HB_V1));
  const rows = parsed.rows.filter((r) => !r.pending);
  const twice = [...rows, ...rows];
  const fps = await fingerprintRows(twice, "90530620149");
  assertEquals(new Set(fps).size, 4);
  assertEquals(
    fps.slice(0, 2),
    (await fingerprintRows(rows, "90530620149")).slice(0, 2),
  );
  assertExists(fps[0]);
  assertEquals(foldText("F?RS?KRINGSAKTI"), foldText("F™RSŽKRINGSAKTI"));
  assertEquals(foldText("Beløp Årsgebyr"), "Beløp Årsgebyr");
});
