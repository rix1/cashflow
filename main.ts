enum State {
  DATE,
  CURRENCY,
  VALUE,
  CONVERSION_RATE,
  SOURCE,
  ID,
  DONE,
  ERROR,
}

type Token = {
  currency: string;
  value: string;
  date: string;
  source: string;
  converstion_rate: string;
  raw: string;
};

type TokenKey = keyof Token | "skip";

export function lexer(input: string, debug = false) {
  // the line have the following format:  "*6483 16.12 NOK 688.00 BUSTER HUND OG Kurs: 1.0000",
  // we want to extract the following tokens: 6483, 16.12 (date), NOK (currency), 688.00 (value), BUSTER HUND OG, 1.0000 (currency rate)
  if (debug) {
    console.log(`\n===> working on new description`);
  }
  let currentState = State.DATE as State;
  let workingInput = input;
  const token = {
    raw: input,
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
      if (field !== "skip") {
        token[field] = currentMatch[0].trim();
      }
      workingInput = workingInput.replace(currentMatch[0], "");
      log(before, nextState);
      currentState = nextState;
    } else {
      currentState = State.ERROR;
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
          /((NOK|EUR|USD|DKK)\s\d+\.\d+\s)/,
          State.CONVERSION_RATE
        );
        break;
      case State.CONVERSION_RATE:
        handleTransition("converstion_rate", /Kurs\:\s\d{1,}\.\d+/, State.ID);
        break;
      case State.ID:
        handleTransition("skip", /^\*\d{4}/, State.SOURCE);
        break;
      case State.SOURCE:
        handleTransition("source", /.+/, State.DONE);
        break;
      case State.ERROR: {
        const paidMatch = /Betalt\:\s\d{2}\.\d{2}\.\d{2}$/.exec(input);
        if (paidMatch) {
          token.date = paidMatch[0].replace("Betalt: ", "");

          workingInput = workingInput.replace(paidMatch[0], "");
          token.source = workingInput.trim();
          currentState = State.DONE;
        } else {
          token.source = workingInput.trim();
          currentState = State.DONE;
        }
        break;
      }
      default:
        currentState = State.DONE;
        break;
    }
  }

  // // let's start with the currency
  // const currencyRegex = /(NOK|EUR|USD)\s(\d{1,}\.\d{1,})/g;
  // const match = currencyRegex.exec(input);
  // console.log(match);

  // if (match) {
  //   token.currency = match[1];
  //   token.value = match[2];
  // }

  return token;
}

if (import.meta.main) {
  const testSuite = await Deno.readTextFile("./descriptions-testsuite.txt")
    .then((text) => text.split("\n"))
    .then((lines) => lines.filter(Boolean));

  // for testing purposes I only look at the last 3
  testSuite.forEach((line) => {
    console.log(lexer(line, false));
  });
}
