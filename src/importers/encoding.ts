export type Encoding = "utf-8" | "iso-8859-1";

/**
 * Bank exports come as UTF-8 (with or without BOM) or ISO-8859-1.
 * Strict UTF-8 decoding fails on Latin-1 bytes for ø/å, which is our signal.
 */
export function decodeStatement(
  bytes: Uint8Array,
): { text: string; encoding: Encoding } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { text: normalizeNewlines(text), encoding: "utf-8" };
  } catch {
    const text = new TextDecoder("iso-8859-1").decode(bytes);
    return { text: normalizeNewlines(text), encoding: "iso-8859-1" };
  }
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}
