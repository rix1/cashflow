export enum State {
  DATE,
  CURRENCY,
  VALUE,
  CONVERSION_RATE,
  SOURCE,
  CARD,
  DONE,
  ERROR,
}

export type Token = {
  currency: string | undefined;
  value: string;
  date: string;
  source: string;
  converstion_rate: string;
  raw: string;
  card: string;
};

type TokenKey = keyof Token;

function trimWhitespace(input: string) {
  return input.split(" ").filter(Boolean).join(" ");
}

function prepareInput(input: string) {
  if (input.startsWith('="')) {
    return input.replace(/="(.+)"/, "$1");
  }
  return input;
}

export function lexer(_input: string, debug = false) {
  /**
   * Given the transaction description
   *    "*6483 16.12 NOK 688.00 BUSTER HUND OG Kurs: 1.0000"
   * We want to extract the following tokens:
   * - 16.12 (date)
   * - NOK (currency)
   * - 688.00 (value)
   * - BUSTER HUND OG (non-unique source)
   * - 1.0000 (currency rate)
   */
  if (debug) {
    console.log(`\n===> working on new description`);
  }
  let currentState = State.DATE as State;
  let workingInput = prepareInput(_input);
  const token = {
    raw: _input,
  } as Token;

  const log = (msg?: string, nextState?: State) => {
    if (debug) {
      console.log(
        `%c[${State[currentState]}] ${msg || ""}\n\t↳ [${
          nextState && State[nextState]
        }] ${workingInput}`,
        currentState === State.ERROR ? "color: red" : ""
      );
    }
  };

  function handleTransition(field: TokenKey, regex: RegExp, nextState: State) {
    const before = workingInput;
    const currentMatch = regex.exec(workingInput);
    if (currentMatch) {
      token[field] = trimWhitespace(currentMatch[0].trim());
      workingInput = workingInput.replace(currentMatch[0], "");
      log(before, nextState);
      currentState = nextState;
    } else {
      currentState = State.ERROR;
      log(before, nextState);
    }
  }

  while (currentState !== State.DONE) {
    switch (currentState) {
      case State.DATE: {
        handleTransition("date", /\s\d{1,2}\.\d{1,2}\s/, State.VALUE);
        break;
      }
      case State.VALUE:
        handleTransition(
          "value",
          /((NOK|EUR|USD|DKK|HUF|GBP|SEK)\s\d+\.\d+\s)/,
          State.CONVERSION_RATE
        );
        break;
      case State.CONVERSION_RATE:
        handleTransition("converstion_rate", /Kurs\:\s\d{1,}\.\d+/, State.CARD);
        break;
      case State.CARD:
        handleTransition("card", /^\*\d{4}/, State.SOURCE);
        break;
      case State.SOURCE:
        handleTransition("source", /.+/, State.DONE);
        break;
      case State.ERROR: {
        const paidMatch = /Betalt.+$/.exec(workingInput);
        if (paidMatch) {
          token.date = paidMatch[0].replace("Betalt: ", "");
          workingInput = workingInput.replace(paidMatch[0], "");
          token.source = trimWhitespace(workingInput.trim());
          currentState = State.DONE;
        } else {
          token.source = trimWhitespace(workingInput.trim());
          currentState = State.DONE;
        }
        break;
      }
      default:
        currentState = State.DONE;
        break;
    }
  }

  return token;
}
