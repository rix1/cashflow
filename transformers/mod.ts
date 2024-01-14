import { UserInput } from "../types.ts";
import { nordeaTransformer } from "./nordea.ts";

export function transformForBank(
  data: Record<string, string | undefined>[],
  userInput: UserInput
) {
  switch (userInput.bank) {
    case "nordea":
      return nordeaTransformer(data).map((el) => ({ ...el, ...userInput }));
    case "dnb":
    case "handelsbanken":
    default:
      throw new Error(`Bank ${userInput.bank} is not supported`);
  }
}
