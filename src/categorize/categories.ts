/**
 * Kind drives the totals: income and expense are the household's own money,
 * saving and transfer move it between own accounts, and outside is money that
 * passes through (paid for others, paid back by others). Outside rows are
 * neither income nor expense; only their net is reported.
 */
export type CategoryKind =
  | "income"
  | "expense"
  | "saving"
  | "transfer"
  | "outside";

export type Category = {
  key: string;
  name: string;
  group: string;
  kind: CategoryKind;
};

const c = (
  key: string,
  name: string,
  group: string,
  kind: CategoryKind,
): Category => ({ key, name, group, kind });

export const CATEGORIES: Category[] = [
  c("income:salary", "Lønn", "Inntekt", "income"),
  c("income:refund", "Refusjon / tilbakebetaling", "Inntekt", "income"),
  c("income:interest", "Renteinntekt", "Inntekt", "income"),
  c("income:other", "Annen inntekt", "Inntekt", "income"),

  c("housing:mortgage", "Boliglån (avdrag + renter)", "Bolig", "expense"),
  c("housing:fees", "Fellesutgifter", "Bolig", "expense"),
  c("housing:electricity", "Strøm", "Bolig", "expense"),
  c("housing:other", "Bolig annet", "Bolig", "expense"),

  c("insurance", "Forsikring", "Faste", "expense"),
  c("loans:student", "Studielån", "Faste", "expense"),
  c("loans:other", "Andre lån", "Faste", "expense"),
  c("subscriptions", "Abonnementer", "Faste", "expense"),
  c("membership", "Fagforening / medlemskap", "Faste", "expense"),
  c("donations", "Veldedighet", "Faste", "expense"),
  c("fees", "Gebyrer", "Faste", "expense"),
  c("taxes", "Skatt / avgifter", "Faste", "expense"),

  c("groceries", "Dagligvarer", "Mat", "expense"),
  c("dining:canteen", "Kantine / lunsj på jobb", "Mat", "expense"),
  c("dining:cafe", "Kafé / bakeri", "Mat", "expense"),
  c("dining:restaurant", "Restaurant / bar", "Mat", "expense"),
  c("dining:delivery", "Takeaway / levering", "Mat", "expense"),
  c("alcohol", "Vinmonopolet", "Mat", "expense"),

  c("transport:public", "Kollektivt", "Transport", "expense"),
  c("transport:micro", "Sparkesykkel / bysykkel", "Transport", "expense"),
  c("transport:car", "Bil / parkering / drivstoff", "Transport", "expense"),
  c("transport:taxi", "Taxi", "Transport", "expense"),

  c("travel", "Reise", "Variabelt", "expense"),
  c("health", "Helse / apotek", "Variabelt", "expense"),
  c("pets", "Kjæledyr", "Variabelt", "expense"),
  c("kids", "Barn", "Variabelt", "expense"),
  c("shopping:clothes", "Klær / sko", "Variabelt", "expense"),
  c("shopping:home", "Hjem / interiør / oppussing", "Variabelt", "expense"),
  c("shopping:other", "Shopping annet", "Variabelt", "expense"),
  c("personal_care", "Frisør / velvære", "Variabelt", "expense"),
  c("entertainment", "Kultur / underholdning", "Variabelt", "expense"),
  c("sports", "Trening / fritid", "Variabelt", "expense"),
  c("gifts", "Gaver", "Variabelt", "expense"),
  c("people", "Vipps / betaling til personer", "Variabelt", "expense"),
  c("cash", "Kontantuttak", "Variabelt", "expense"),

  c("savings:deposit", "Til sparing / investering", "Sparing", "saving"),
  c("savings:withdrawal", "Fra sparing / investering", "Sparing", "saving"),

  c("transfer:own", "Egne kontoer", "Overføringer", "transfer"),
  c("transfer:partner", "Mellom oss", "Overføringer", "transfer"),
  c("loans:disbursement", "Låneutbetaling", "Overføringer", "transfer"),
  c(
    "loans:payoff",
    "Innfrielse / refinansiering av lån",
    "Overføringer",
    "transfer",
  ),

  // Both directions go in the same category: the purchase made for someone
  // else and the money they sent back. Whatever does not net out is the
  // household's own share, shown as the group's net.
  c("outside:others", "Utlegg for andre", "Utenfor", "outside"),
  c("outside:other", "Annet utenfor driften", "Utenfor", "outside"),

  c("uncategorized", "Ukategorisert", "Ukategorisert", "expense"),
];

export const CATEGORY_BY_KEY = new Map(CATEGORIES.map((cat) => [cat.key, cat]));

export const GROUP_ORDER = [
  "Inntekt",
  "Bolig",
  "Faste",
  "Mat",
  "Transport",
  "Variabelt",
  "Sparing",
  "Overføringer",
  "Utenfor",
  "Ukategorisert",
];
