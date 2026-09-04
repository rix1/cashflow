/**
 * Turns noisy bank descriptions into a stable merchant key so that
 * categorization rules stay short and the review queue groups well.
 *
 *   "Vipps*FLYTOGET AS"            -> "FLYTOGET AS"
 *   "Spotify P411AB172B"           -> "SPOTIFY"
 *   "27.10 JOKER MØLLERGAT ... OSLO" -> "JOKER MØLLERGAT MØLLERGATA 3"
 *   "TIL STIFTELSEN SOS-BARNEBYER"  -> "SOS-BARNEBYER"
 */

/** Whole-string canonicalization: first matching pattern wins. */
export const MERCHANT_CANONICAL: [RegExp, string][] = [
  [/^SPOTIFY/, "SPOTIFY"],
  [/^NETFLIX/, "NETFLIX"],
  [/^HYRE\b/, "HYRE"],
  [/^VOI\b/, "VOI"],
  [/^RYDE\b/, "RYDE"],
  [/^TIER\b/, "TIER"],
  [/^BOLT\.EU/, "BOLT"],
  [/^UBER\b/, "UBER"],
  [/^RUTER(APPEN| APP)?\b/, "RUTER"],
  [/^VY( APP)?\b/, "VY"],
  [/^FLYTOGET/, "FLYTOGET"],
  [/^APPLE\.COM/, "APPLE"],
  [/^GOOGLE\b/, "GOOGLE"],
  [/^OPENAI/, "OPENAI"],
  [/^ANTHROPIC/, "ANTHROPIC"],
  [/^PATREON/, "PATREON"],
  [/^SOUNDCLOUD/, "SOUNDCLOUD"],
  [/^AMZN|^AMAZON/, "AMAZON"],
  [/^EASYPARK/, "EASYPARK"],
  [/^AIMO PARK/, "AIMO PARK"],
  [/^CIRCLE K\b/, "CIRCLE K"],
  [/^10 (Å|A)PENT BAKERI/, "ÅPENT BAKERI"],
  [/^JAVA ESPRESSOBA/, "JAVA ESPRESSOBAR"],
  [/^VITUSAPOTEK/, "VITUSAPOTEK"],
  [/^APOTEK 1\b/, "APOTEK 1"],
  [/^COOP MEGA ALEXANDER K/, "COOP MEGA ALEXANDER KIELLAND"],
  [/^(STATENS )?L(Å|A)NEKAS/, "LÅNEKASSEN"],
  [/^LEGER UTEN GRENSER/, "LEGER UTEN GRENSER"],
  [/^UNICEF/, "UNICEF"],
  [/^REDD BARNA/, "REDD BARNA"],
  [/^(STIFTELSEN )?SOS[- ]BARNEBYER/, "SOS-BARNEBYER"],
  [/^NOAH\b/, "NOAH"],
  [/^(STIFTELSEN )?FLYKTNINGHJELPEN/, "FLYKTNINGHJELPEN"],
  [/^ELVIA\b/, "ELVIA"],
  [/^TIBBER/, "TIBBER"],
  [/^GJENSIDIGE FORSIKRING/, "GJENSIDIGE FORSIKRING"],
  [/^STOREBRAND/, "STOREBRAND"],
  [/^WOLT\b/, "WOLT"],
  [/^FOODORA/, "FOODORA"],
  [/^VINMONOPOLET/, "VINMONOPOLET"],
  [/^OSLO TAXI/, "OSLO TAXI"],
  [/^AIRBNB/, "AIRBNB"],
  [/^SAS(\b|\d)|^SCANDINAVIAN AIRL/, "SAS"],
  [/^STEEN (AND|&) STR(Ø|O)M/, "STEEN & STRØM"],
  [/^DEN NORSKE OPER/, "DEN NORSKE OPERA"],
  [/^UBER\b|PENDING\.UBER/, "UBER"],
  [/^TESLA/, "TESLA"],
  [/^PRIME VIDEO|^AMAZON PRIME/, "PRIME VIDEO"],
  [/^NORWEGIAN/, "NORWEGIAN"],
  [/^WIDER(Ø|O)E/, "WIDERØE"],
  [/^(H ?& ?M|H M\b|HM\b|HENNES)/, "H&M"],
  [/^ELKJ(Ø|O|OE)P/, "ELKJØP"],
  [/^CLAS OHL/, "CLAS OHLSON"],
  [/^(BILK\*|SHARING\*)?BILKOLL/, "BILKOLLEKTIVET"],
  [/^TEKNA/, "TEKNA"],
  [/^S.STRENE GRENE/, "SØSTRENE GRENE"],
  [/^F.RS.KRINGSAKTI/, "FORSIKRINGSAKTI"],
  [/^\d{4} [?ØÅ]P\b/, "ØKERN PORTAL"],
  [/^MCD(ONALD|S|\s)/, "MCDONALDS"],
  [/^\d*BOOTS\b/, "BOOTS APOTEK"],
  [/^(WWW\.)?SM(Å|A|\?) ?SPOR/, "SMÅ SPOR"],
  [/^PRINC(ESS|ECC)\b/, "PRINCESS"],
  [/^KAPPAHL/, "KAPPAHL"],
  [/^GINA TRICOT/, "GINA TRICOT"],
  [/^TARGET\b/, "TARGET"],
  [/^HELP\.HBOMAX|^HBO ?MAX/, "HBO MAX"],
  [/^SPRELL/, "SPRELL"],
  [/^4SERVICE/, "4SERVICE KANTINE"],
  [/^(CHATGPT|OPENAI)/, "OPENAI"],
  [/^(CLAUDE\.AI|ANTHROPIC)/, "ANTHROPIC"],
  [/^(STRIPE - )?ZED (PRO|INDUSTRIES)/, "ZED"],
  [/^MUBI/, "MUBI"],
  [/^IKEA\b/, "IKEA"],
  [/^KIWI\b/, "KIWI"],
  [/^MENY\b/, "MENY"],
  [/^BUNNPRIS/, "BUNNPRIS"],
  [/^REMA 1000/, "REMA 1000"],
  [/^KLARNA/, "KLARNA"],
  [/^7[- ]?ELEVEN/, "7-ELEVEN"],
  [/^NARVESEN/, "NARVESEN"],
  [/^DELI DE LUCA/, "DELI DE LUCA"],
];

const PAYMENT_PREFIX =
  /^(vipps|vfi|zettle_?|izettle|tst|sq|paypal|klarna|sumup|paddle\.net|apl|stripe|aer|spo|ubr|polar|phoenix co|sp|amzn mktp|pp|dri|msft|wpy|gog|fb|bilk|sharing)\s*\*\s*/i;
const SHOPIFY_PREFIX = /^sp\s+(?=[a-z])/i;
const LEADING_DIRECTION =
  /^(nettgiro\s+)?(til|fra|lønn fra|loenn fra)\s*:?\s+/i;
const ACCOUNT_SUFFIX = /\s*\(\d{9,11}\)\s*$/;
const REFERENCE_TOKEN = /\b[A-Z]{2,6}:\s*\d{4,}\b/gi;
const HASH_NUMBER = /#\d+/g;
const LEADING_DATE = /^\d{1,2}\.\d{1,2}\s+/;
const TRAILING_PLACE =
  /\s+(oslo|bergen|trondheim|stavanger|tromsø|drammen|norge|norway|no|nor|sverige|sweden|se|dk|danmark|denmark)$/i;
const TRAILING_CODE = /\s+(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{6,}$/;

export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function normalizeMerchant(input: string | null | undefined): string {
  const original = collapseWhitespace(input ?? "");
  let s = original;
  s = s.replace(/^="(.*)"$/, "$1");
  s = s.replace(LEADING_DATE, "");
  s = s.replace(/^www\./i, "");
  s = s.replace(/^til konto:\s*/i, "KONTO ");
  s = s.replace(LEADING_DIRECTION, "");
  s = s.replace(ACCOUNT_SUFFIX, "");
  s = s.replace(PAYMENT_PREFIX, "");
  s = s.replace(SHOPIFY_PREFIX, "");
  s = s.replace(REFERENCE_TOKEN, "");
  s = s.replace(HASH_NUMBER, "");
  s = collapseWhitespace(s);
  for (let i = 0; i < 2; i++) s = s.replace(TRAILING_PLACE, "");
  s = s.replace(TRAILING_CODE, "");
  s = s.replace(/[\s*.,\-]+$/, "");
  s = collapseWhitespace(s).toUpperCase();
  if (/^KONTO [\d\s]+$/.test(s)) s = "KONTO " + s.replace(/\D/g, "");
  for (const [pattern, canonical] of MERCHANT_CANONICAL) {
    if (pattern.test(s)) return canonical;
  }
  return s || original.toUpperCase() || "UNKNOWN";
}
