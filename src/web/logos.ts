/**
 * Merchant logos: a known-domain map plus domains embedded in merchant names.
 * The server fetches favicons once into .cache/logos/ and falls back to an SVG
 * monogram, so rendered pages never talk to third parties themselves.
 */

const KNOWN: [RegExp, string][] = [
  [/^SPOTIFY/, "spotify.com"],
  [/^NETFLIX/, "netflix.com"],
  [/^APPLE\b/, "apple.com"],
  [/^GOOGLE/, "google.com"],
  [/^OPENAI/, "openai.com"],
  [/^ANTHROPIC/, "anthropic.com"],
  [/^PATREON/, "patreon.com"],
  [/^SOUNDCLOUD/, "soundcloud.com"],
  [/^AMAZON/, "amazon.com"],
  [/^PRIME VIDEO/, "primevideo.com"],
  [/^HBO MAX/, "max.com"],
  [/^MUBI/, "mubi.com"],
  [/^ZED\b/, "zed.dev"],
  [/^GITHUB/, "github.com"],
  [/^NOTION/, "notion.so"],
  [/^CLEANSHOT/, "cleanshot.com"],
  [/^RUTER/, "ruter.no"],
  [/^VY\b/, "vy.no"],
  [/^FLYTOGET/, "flytoget.no"],
  [/^VOI\b/, "voi.com"],
  [/^BOLT\b/, "bolt.eu"],
  [/^HYRE/, "hyre.no"],
  [/^EASYPARK/, "easypark.com"],
  [/^AIMO PARK/, "aimopark.no"],
  [/^CIRCLE K/, "circlek.no"],
  [/^BILKOLLEKTIVET/, "bilkollektivet.no"],
  [/^WOLT/, "wolt.com"],
  [/^FOODORA/, "foodora.no"],
  [/^VINMONOPOLET/, "vinmonopolet.no"],
  [/^JOKER/, "joker.no"],
  [/^KIWI/, "kiwi.no"],
  [/^REMA 1000/, "rema.no"],
  [/^MENY/, "meny.no"],
  [/^COOP/, "coop.no"],
  [/^BUNNPRIS/, "bunnpris.no"],
  [/^MATKROKEN/, "matkroken.no"],
  [/^IKEA/, "ikea.com"],
  [/^CLAS OHLSON/, "clasohlson.com"],
  [/^ELKJØP/, "elkjop.no"],
  [/^H&M/, "hm.com"],
  [/^ZARA/, "zara.com"],
  [/^XXL/, "xxl.no"],
  [/^TIBBER/, "tibber.com"],
  [/^ELVIA/, "elvia.no"],
  [/^GJENSIDIGE/, "gjensidige.no"],
  [/^STOREBRAND/, "storebrand.no"],
  [/^LÅNEKASSEN/, "lanekassen.no"],
  [/^TEKNA/, "tekna.no"],
  [/^SATS/, "sats.no"],
  [/^VITUSAPOTEK/, "vitusapotek.no"],
  [/^APOTEK 1/, "apotek1.no"],
  [/^BOOTS/, "boots.no"],
  [/^TELIA/, "telia.no"],
  [/^TELENOR/, "telenor.no"],
  [/^AIRBNB/, "airbnb.com"],
  [/^SAS\b/, "flysas.com"],
  [/^NORWEGIAN/, "norwegian.com"],
  [/^WIDERØE/, "wideroe.no"],
  [/^UBER/, "uber.com"],
  [/^OSLO TAXI/, "oslotaxi.no"],
  [/^VIPPS/, "vipps.no"],
  [/^KLARNA/, "klarna.com"],
  [/^ÅPENT BAKERI/, "apentbakeri.no"],
  [/^MCDONALDS/, "mcdonalds.com"],
  [/^7-ELEVEN/, "7-eleven.no"],
  [/^NARVESEN/, "narvesen.no"],
  [/^DELI DE LUCA/, "delideluca.no"],
  [/^SOS-BARNEBYER/, "sos-barnebyer.no"],
  [/^UNICEF/, "unicef.no"],
  [/^REDD BARNA/, "reddbarna.no"],
  [/^LEGER UTEN GRENSER/, "legerutengrenser.no"],
  [/^NOAH\b/, "dyrsrettigheter.no"],
  [/^FLYKTNINGHJELPEN/, "flyktninghjelpen.no"],
  [/^OTOVO/, "otovo.no"],
  [/^NETLIGHT/, "netlight.com"],
  [/^ANICURA/, "anicura.no"],
  [/^DOGMAN/, "dogman.no"],
  [/^MUSTI/, "musti.no"],
  [/^SPRELL/, "sprell.no"],
  [/^KAPPAHL/, "kappahl.com"],
  [/^GINA TRICOT/, "ginatricot.com"],
  [/^LAGERHAUS/, "lagerhaus.no"],
  [/^SØSTRENE GRENE/, "sostrenegrene.com"],
  [/^NORMAL\b/, "normal.no"],
  [/^SQUEEZE/, "squeeze.no"],
  [/^OURA/, "ouraring.com"],
  [/^STRAVA/, "strava.com"],
  [/^DUOLINGO/, "duolingo.com"],
  [/^TARGET/, "target.com"],
  [/^KROGER/, "kroger.com"],
  [/^WM SUPERCENTER|^WALMART/, "walmart.com"],
  [/^ONE\.COM/, "one.com"],
  [/^USE\.AI/, "use.ai"],
  [/^SKATTEETATEN/, "skatteetaten.no"],
  [/^ARCTIC SECURITIES/, "arctic.com"],
  [/^NORDNET/, "nordnet.no"],
  [/^HANDELSBANKEN/, "handelsbanken.no"],
  [/^NORDEA/, "nordea.no"],
];

const EMBEDDED_DOMAIN =
  /\b([A-Z0-9][A-Z0-9-]*(?:\.[A-Z0-9-]+)*\.(?:COM|NO|IO|APP|DEV|EU|SE|DK|NET|ORG|AI|SO|CO\.UK|TV|FM|ME))\b/;

export function domainForMerchant(merchant: string): string | null {
  const m = merchant.toUpperCase();
  for (const [re, domain] of KNOWN) if (re.test(m)) return domain;
  const embedded = EMBEDDED_DOMAIN.exec(m)?.[1];
  if (embedded) return embedded.toLowerCase().replace(/^www\./, "");
  return null;
}

export function monogram(merchant: string): string {
  const words = merchant.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(
    Boolean,
  );
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function hueForMerchant(merchant: string): number {
  let h = 0;
  for (const ch of merchant) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
}

export function monogramSvg(merchant: string, size = 64): string {
  const hue = hueForMerchant(merchant);
  const text = monogram(merchant).replace(/[<>&]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="hsl(${hue} 45% 88%)"/>` +
    `<text x="32" y="40" text-anchor="middle" font-family="-apple-system, Inter, system-ui, sans-serif" font-size="${
      text.length > 1 ? 24 : 28
    }" font-weight="600" fill="hsl(${hue} 35% 32%)">${text}</text></svg>`;
}

const CACHE_DIR = "./.cache/logos";
const misses = new Set<string>();

export type LogoResult = {
  body: Uint8Array | string;
  contentType: string;
  cache: boolean;
};

/**
 * Favicon for a merchant's domain from the on-disk cache or DuckDuckGo's icon
 * service; an SVG monogram when there is no domain or no usable image.
 * Misses are cached as empty files so they are not refetched on every view.
 */
export async function logoFor(merchant: string): Promise<LogoResult> {
  const domain = domainForMerchant(merchant);
  const fallback = (): LogoResult => ({
    body: monogramSvg(merchant),
    contentType: "image/svg+xml",
    cache: false,
  });
  if (!domain || misses.has(domain)) return fallback();
  const safe = domain.replace(/[^a-z0-9.-]/g, "_");
  const path = `${CACHE_DIR}/${safe}.ico`;
  try {
    const body = await Deno.readFile(path);
    const type = sniff(body);
    if (type) return { body, contentType: type, cache: true };
    misses.add(domain);
    return fallback();
  } catch {
    // not cached yet
  }
  try {
    const res = await fetch(`https://icons.duckduckgo.com/ip3/${domain}.ico`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const body = new Uint8Array(await res.arrayBuffer());
    const type = sniff(body);
    await Deno.mkdir(CACHE_DIR, { recursive: true });
    await Deno.writeFile(path, type ? body : new Uint8Array());
    if (!type) throw new Error("not an image");
    return { body, contentType: type, cache: true };
  } catch {
    misses.add(domain);
    return fallback();
  }
}

/** Content type from magic bytes, or null when the payload is not an image we trust. */
export function sniff(bytes: Uint8Array): string | null {
  if (bytes.byteLength < 8) return null;
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return "image/png";
  }
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) {
    return "image/x-icon";
  }
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) {
    return "image/webp";
  }
  const head = new TextDecoder().decode(b.slice(0, 256)).trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) {
    return "image/svg+xml";
  }
  return null;
}
