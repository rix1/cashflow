# Cashflow - Bank Statement Parser

Cashflow is a tool designed to simplify the management of personal finances by
parsing and normalizing descriptions from Norwegian bank statements. The primary
goal of Cashflow is to transform messy and inconsistent transaction descriptions
into a uniform, non-unique format. This normalization makes it significantly
easier to categorize and summarize expenses for household finance management.

## Goals and Features

- **Exstensible Description Parsing**: Handles transaction descriptions from
  different banks. It should be relatively easy to add custom parsers in the
  future.
- **Normalize Transaction Sources**: Converts similar transaction descriptions
  to a non-unique source name, facilitating easier categorization.
- **Support for Multiple Currencies**: Parses and extracts transactions in
  different currencies.
- **Deno-Based**: Written in Deno, providing a modern and secure runtime for
  JavaScript and TypeScript.
- **Debugging Support**: Includes a debug mode for detailed logging of the
  parsing process.

## How it Works

Cashflow's description parser uses a lexer-based approach, inspired by
programming language compilers, to parse the transaction descriptions. The lexer
function breaks down the parsing process into distinct stages, each responsible
for extracting specific information like date, currency, value, source, and
conversion rate. This method avoids the complexity and maintainability issues
often associated with regular expressions for complex parsing tasks.

## Example

Given these inputs

- `AniCura Grunerløkka Betalt: 29.08.23`
- `*7889 30.10 NOK 182.30 JOKER ILA Kurs: 1.0000`

the lexer output the following:

```javascript
{
  raw: "AniCura Grunerløkka Betalt: 29.08.23",
  date: "29.08.23",
  source: "AniCura Grunerløkka"
}
{
  raw: "*7889 30.10 NOK 182.30 JOKER ILA Kurs: 1.0000",
  date: "30.10",
  value: "NOK 182.30",
  converstion_rate: "Kurs: 1.0000",
  source: "JOKER ILA"
}
```

Note that date, currency and conversion rate are not made usable right now. I
mostly care about getting a clean `source` attribute right now. I might
implement a small transformer that fixes this later.

## Long-Term Goal

The long-term vision for Cashflow is to evolve into a collection of tools that
can transform CSV bank statements from various accounts into a standardized
format. This standardized data can then be easily imported into Excel/Google
Sheets for in-depth analysis and financial tracking.

## Usage

Currently, Cashflow is tailored for personal use, focusing on the specific needs
of household finance management. Future updates may expand its applicability to
a broader audience.

### Running locally

The following assumes you have Deno v1.39 or newer installed.

1. Clone this repo.
2. Make an export of your bank statement in any format you like.
3. Copy the "description" (or similar) column and save it as
   `./lexer/descriptions-testsuite.txt`.
4. Run the `lexer.debug` file with `deno task lexer` or `deno run --watch
--allow-read lexer/lexer.debug.ts`
5. To run tests, simply run `deno test --watch` to start watching for test
   changes.

## Contributing

As Cashflow is in its early stages, contributions, suggestions, and feedback are
highly welcomed. Whether it's extending the parser to handle new formats,
improving existing features, or providing ideas for future development, your
input is invaluable.

## License

Cashflow is released under MIT. For more details, see the LICENSE file in the
repository.
