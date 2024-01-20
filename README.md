# Cashflow - Bank Statement Parser

Cashflow is a tool designed to simplify the management of personal finances by
parsing and normalizing CSV exports from Norwegian bank statements. The primary
goal of Cashflow is to transform messy and inconsistent transaction descriptions
into a uniform, non-unique format. This normalization makes it significantly
easier to categorize and summarize expenses for household finance management
across different accounts and banks.

## Goals and Features

- **Exstensible Description Parsing**: Handles transaction descriptions from
  different banks. The aim is to make it relatively easy to add custom parsers
  in the future.
- **Normalize Transaction Sources**: Converts similar transaction descriptions
  to a non-unique source name, facilitating easier categorization.
- **Support for Multiple Currencies**: Parses and extracts transactions in
  different currencies.
- **Deno-Based**: Written in Deno, providing a modern and secure runtime for
  JavaScript and TypeScript.
- **Debugging Support**: Includes a debug mode for detailed logging of the
  parsing process.

## How it Works

Cashflow's _description parser_ uses a lexer-based approach, inspired by
programming language compilers, to parse the transaction descriptions. The lexer
function breaks down the parsing process into distinct stages, each responsible
for extracting specific information like date, currency, value, source, and
conversion rate. This method avoids the complexity and maintainability issues
often associated with regular expressions for complex parsing tasks.

## Example

Given these inputs descriptions

- `="AniCura Grunerløkka Betalt: 29.12.23"`
- `="*6483 19.10 NOK 112.80 JOKER ILA Kurs: 1.0000"`
- `="*7889 25.08 DKK 120.00 REFFEN Kurs: 1.5879"`

the lexer output the following:

```javascript
{
  raw: '="AniCura Grunerløkka Betalt: 29.12.23"',
  currency: "",
  local_value: "",
  initiated_month: "",
  initiated_day: "",
  source: "AniCura Grunerløkka",
  converstion_rate: "",
  card: "",
  paid_date: "2023-12-29",
  paid_to: ""
}
{
  raw: '="*6483 19.10 NOK 112.80 JOKER ILA Kurs: 1.0000"',
  currency: "NOK",
  local_value: "112.80",
  initiated_month: "10",
  initiated_day: "19",
  source: "JOKER ILA",
  converstion_rate: "1.0000",
  card: "*6483",
  paid_date: "",
  paid_to: ""
}
{
  raw: '="*7889 25.08 DKK 120.00 REFFEN Kurs: 1.5879"',
  currency: "DKK",
  local_value: "120.00",
  initiated_month: "08",
  initiated_day: "25",
  source: "REFFEN",
  converstion_rate: "1.5879",
  card: "*7889",
  paid_date: "",
  paid_to: ""
}
```

## Long-Term Goal

The long-term vision for Cashflow is to evolve into a collection of tools that
can transform CSV bank statements from various accounts into a standardized
format. This standardized data can then be easily imported into Excel/Google
Sheets for in-depth analysis and financial tracking.

## Usage

Currently, Cashflow is tailored for personal use, focusing on the specific needs
of household finance management. Future updates may expand its applicability to
a broader audience.

### Supported banks

We support CSV exports from the following Norwegian banks:

- [Handelsbanken](https://www.handelsbanken.no/no/)
- [Nordea](https://www.nordea.no/)
- [DNB](https://www.dnb.no/)

### Available commands

- `deno task run`: This will first clean the `./out/` directory before starting
  the CLI.
- `deno task dev`: This will start the CLI, watching for file changes.
- `deno task lexer`: For iterating on the lexer. See details below.

### Developing locally

The following assumes you have Deno v1.39 or newer installed.

1. Clone this repo.
2. Make a CSV export of your bank statement and place them in `./statements/`.

#### Developing the lexer

To iterate on the description lexer, copy the "description" (or similar) column
from a CSV and save it as `./lexer/descriptions-testsuite.txt`.

To see the output of parsing these lines, run `deno task lexer`. This will start
a process that reads each line from the test suite and pass them through the
lexer, printing the result.

We also have a test suite to ensure that we don't break anything. To run tests,
simply run `deno test --watch`.

## Contributing

As Cashflow is in its early stages, contributions, suggestions, and feedback are
highly welcomed. Whether it's extending the parser to handle new formats,
improving existing features, or providing ideas for future development, your
input is invaluable.

## License

Cashflow is released under MIT. For more details, see the LICENSE file in the
repository.
