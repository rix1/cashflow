import { decodeStatement } from "./encoding.ts";
import { handelsbankenImporter } from "./handelsbanken.ts";
import { nordeaImporter } from "./nordea.ts";
import type { Importer, ParsedStatement } from "./types.ts";

export const IMPORTERS: Importer[] = [handelsbankenImporter, nordeaImporter];

export function detectImporter(text: string): Importer | undefined {
  const header = text.split("\n", 1)[0].replace(/^﻿/, "").trim();
  return IMPORTERS.find((i) => i.detect(header));
}

export type ParsedFile = ParsedStatement & { encoding: string };

export function parseStatementBytes(
  bytes: Uint8Array,
  fileName = "<bytes>",
): ParsedFile {
  const { text, encoding } = decodeStatement(bytes);
  const importer = detectImporter(text);
  if (!importer) {
    throw new Error(
      `${fileName}: could not detect bank format from header "${
        text.split("\n", 1)[0].slice(0, 80)
      }"`,
    );
  }
  return { ...importer.parse(text), encoding };
}

export async function parseStatementFile(path: string): Promise<ParsedFile> {
  const bytes = await Deno.readFile(path);
  return parseStatementBytes(bytes, path);
}
