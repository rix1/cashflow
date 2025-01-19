import { formatDate } from "../formatting/formatDate.ts";

export enum State {
  MONTH_DAY,
  CURRENCY,
  VALUE,
  CONVERSION_RATE,
  CATCH_ALL,
  CARD,
  PAID_DATE,
  PAID_TO,
  FROM,
  DONE,
  ERROR,
}

export type Token = {
  currency: string | null;
  local_value: string;
  initiated_month: string;
  initiated_day: string;
  source: string;
  conversion_rate: string;
  raw: string;
  card: string;
  paid_date: string;
  paid_to: string;
  from: string;
};

type TokenKey = keyof Token;

const MERCHANT_SUBSTITUTIONS: [RegExp, string][] = [
  // Streaming services
  [/spotify(se)?(\s+p[0-9a-f]+)?/i, "SPOTIFY"],
  [/netflix[.\s]*com/i, "NETFLIX"],

  // Transport/Car sharing
  [/hyre\s*as\*(\s+bid:\d+)?/i, "HYRE"],
  [/voi\s*(no|technology|de)/i, "VOI"],
  [/bolt\.eu\/o\/\d+/i, "BOLT"],
];

function normalizeDescription(input: string): string {
  let result = input;

  // Apply each substitution pattern
  for (const [pattern, replacement] of MERCHANT_SUBSTITUTIONS) {
    result = result.replace(pattern, replacement);
  }

  return result.trim();
}

function stripUniqueIdentifiers(input: string): string {
  // Matches patterns like BID:1234567, REF:12345, etc.
  return input.replace(/[A-Z]+:\d{4,}/g, "").trim();
}

function trimWhitespace(input: string) {
  return input.trim().split(" ").filter(Boolean).join(" ");
}

function prepareInput(input: string) {
  if (input?.startsWith('="')) {
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

  let currentState = State.MONTH_DAY as State;
  let workingInput = prepareInput(_input);
  if (debug) {
    console.log(`\n===> working on new description: "${workingInput}"`);
  }
  const token = {
    raw: _input,
    currency: "",
    local_value: "",
    initiated_month: "",
    initiated_day: "",
    source: "",
    conversion_rate: "",
    card: "",
    paid_date: "",
    paid_to: "",
  } as Token;

  const transitionLog = (
    originalInput: string,
    extracted: string,
    remainingInput: string,
    nextState: State,
  ) => {
    if (debug) {
      console.log(
        `%c[${
          State[currentState]
        }] "%c${originalInput}" => "%c${extracted}%c"\n\t↳ next:${
          nextState && State[nextState]
        } "%c${remainingInput}"`,
        "color: #56575D",
        "color: white",
        "color: green",
        "color: #56575D",
        currentState === State.ERROR ? "color: red" : "",
      );
    }
  };

  function handleTransition(regex: RegExp) {
    const currentMatch = regex.exec((workingInput || "").trim());
    if (!currentMatch) {
      return undefined;
    }

    const originalInput = workingInput;
    const extracted = trimWhitespace(currentMatch[0]);
    const remainingInput = workingInput.replace(currentMatch[0], "");

    workingInput = remainingInput;
    transitionLog(originalInput, extracted, remainingInput, currentState + 1);
    return extracted;
  }

  function next(nextState: State) {
    if (debug) {
      console.log(`[NEXT]: ${State[nextState]}`);
    }

    currentState = nextState;
  }

  while (currentState !== State.DONE) {
    switch (currentState) {
      case State.MONTH_DAY: {
        const match = handleTransition(/\s\d{1,2}\.\d{1,2}\s/);
        if (match) {
          const [day, month] = match.split(".");
          token.initiated_day = day;
          token.initiated_month = month;
        }
        next(State.VALUE);
        break;
      }
      case State.VALUE: {
        const match = handleTransition(
          /((NOK|EUR|USD|DKK|HUF|GBP|SEK)\s\d+\.\d+\s)/,
        );

        if (match) {
          const [currency, value] = match.split(" ");
          token.currency = currency;
          token.local_value = value;
        }
        next(State.CONVERSION_RATE);
        break;
      }
      case State.CONVERSION_RATE: {
        const match = handleTransition(/Kurs\:\s\d{1,}\.\d+/);
        if (match) {
          token.conversion_rate = match.replace("Kurs: ", "");
        }
        next(State.CARD);
        break;
      }
      case State.CARD: {
        const match = handleTransition(/^\*\d{4}/);
        if (match) {
          token.card = match;
        }
        next(State.PAID_DATE);
        break;
      }
      case State.PAID_DATE: {
        const match = handleTransition(/Betalt\:.+$/);
        if (match) {
          token.paid_date = formatDate(match.replace("Betalt: ", ""));
        }
        next(State.PAID_TO);
        break;
      }
      case State.PAID_TO: {
        const match = handleTransition(/^(Nettgiro\s)?til\:(.+)/i);
        if (match) {
          token.paid_to = match
            .replace(/^(Nettgiro\s)?til\:\s/i, "")
            .replaceAll(".", "");
        }
        next(State.FROM);
        break;
      }
      case State.FROM: {
        const match = handleTransition(/^(Nettgiro\s)?fra\:(.+)/);
        if (match) {
          token.from = match.replace("Nettgiro fra: ", "");
        }
        next(State.CATCH_ALL);
        break;
      }
      case State.CATCH_ALL: {
        const match = handleTransition(/.+/);
        if (match) {
          token.source = normalizeDescription(match);
        }
        next(State.DONE);
        break;
      }
      default:
        console.log("%cERROR: UNKNOWN_STATE", "color: red");
        next(State.DONE);
        break;
    }
  }

  return token;
}
