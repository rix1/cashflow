import { lexer } from "./lexer.ts";

if (import.meta.main) {
  const testSuite = await Deno.readTextFile(
    "./lexer/descriptions-testsuite.txt"
  )
    .then((text) => text.split("\n"))
    .then((lines) => lines.filter(Boolean));

  testSuite.forEach((line) => {
    console.log(lexer(line, false));
  });
}
