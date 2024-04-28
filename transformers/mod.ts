import { UserInput } from "../types.ts";
import { dnbTransformer } from "./dnb.ts";
import { handelsbankenTransformer } from "./handesbanken.ts";
import { nordeaTransformer } from "./nordea.ts";

export function transformForBank(
  data: Record<string, string | undefined>[],
  userInput: UserInput
) {
  switch (userInput.bank) {
    case "nordea":
      return nordeaTransformer(data).map((el) => ({ ...el, ...userInput }));
    case "handelsbanken":
      return handelsbankenTransformer(data).map((el) => ({
        ...el,
        ...userInput,
      }));
    case "dnb":
      return dnbTransformer(data).map((el) => ({ ...el, ...userInput }));
    default:
      throw new Error(`Bank ${userInput.bank} is not supported`);
  }
}
