import { UserInput } from "../types.ts";
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
    default:
      throw new Error(`Bank ${userInput.bank} is not supported`);
  }
}
