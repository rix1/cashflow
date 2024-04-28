import { parseCSVFile } from "../io.ts";
import { handelsbankenTransformer } from "./handesbanken.ts";

Deno.test("Transformer", async (t) => {
  const file = await parseCSVFile("./test.csv");
  const transformed = handelsbankenTransformer(file);

  console.log(transformed);
});
