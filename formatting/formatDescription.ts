import { Token } from "../lexer/lexer.ts";

const mapping = {
  "23202319467": "Sparebank 1 Hallingdal - Aksjelån", // TODO - verify account
  "23208407473": "Sparebank 1 Hallingdal - Aksjelån",
  "62191277436": "Rix1 brukskonto Nordea",
  "90530541990": "Eva Bjørstad",
  "90530620149": "Rix handelsbanken brukskonto",
  "90537051980": "Lofotgata boliglån",
  "90537058152": "Lofotgata boliglån",
};

export function formatDescription(description: Token): string {
  const desc = description.paid_to || description.from || description.source;

  if (desc.includes("BUSTER")) {
    return "BUSTER HUND OG KATT";
  }

  if (desc.includes("Vipps*Ruter")) {
    return "RUTERAPPEN";
  }

  if (desc.toLowerCase().includes("spotify")) {
    return "SPOTIFY";
  }

  if (desc.includes("Oda.com")) {
    return "Oda.com";
  }
  if (desc.toLowerCase().includes("netflix")) {
    return "Netflix";
  }

  // replace any match in mapping
  for (const [key, value] of Object.entries(mapping)) {
    const match = new RegExp(key, "g").exec(desc);
    if (match) {
      return desc.replace(match[0], value);
    }
  }
  return desc;
}
