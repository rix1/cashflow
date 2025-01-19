import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { formatDate } from "./formatDate.ts";

const testCases = [
  { input: "13.01.2024", expected: "2024-01-13" },
  { input: "2024/01/08", expected: "2024-01-08" },
  { input: "Reservert", expected: "Reservert" }, // Assuming formatDate returns null for invalid dates
  { input: "02.01.2024", expected: "2024-01-02" },
];

for (const { input, expected } of testCases) {
  Deno.test(` formatDate should convert '${input}' to ISO date format`, () => {
    const result = formatDate(input);
    assertEquals(result, expected);
  });
}
