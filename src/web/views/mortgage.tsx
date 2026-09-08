import type { FC } from "hono/jsx";
import { monthLabel, nok } from "../format.ts";
import {
  annuityPayment,
  balanceFromInterest,
  firstMonthInterest,
  NORWEGIAN_INTEREST_DEDUCTION,
} from "../mortgage.ts";
import type { Averages, LoanMonth, MortgageMonth } from "../queries.ts";
import { ChartScript } from "./layout.tsx";

type Props = {
  loanMonths: LoanMonth[];
  mortgageMonths: MortgageMonth[];
  averages: Averages;
  whatIf: { amount: number; rate: number; years: number; currentRate: number };
};

export const MortgagePage: FC<Props> = (
  { loanMonths, mortgageMonths, averages, whatIf },
) => {
  const last12 = loanMonths.slice(-12);
  const avg = (
    f: (m: LoanMonth) => number,
  ) => (last12.length
    ? last12.reduce((s, m) => s + f(m), 0) / last12.length
    : 0);
  const avgInterest = avg((m) => m.interest);
  const avgPrincipal = avg((m) => m.principal);
  const avgTotal = avg((m) => m.total);
  const latest = loanMonths[loanMonths.length - 1];
  const impliedBalance = latest
    ? balanceFromInterest(latest.interest, whatIf.currentRate)
    : null;

  const newPayment = annuityPayment(whatIf.amount, whatIf.rate, whatIf.years);
  const newInterest = firstMonthInterest(whatIf.amount, whatIf.rate);
  const taxBack = newInterest * NORWEGIAN_INTEREST_DEDUCTION;
  const currentMortgage = -averages.mortgage;
  const delta = newPayment - currentMortgage;
  const headroomNow = averages.income + averages.expenseExMortgage -
    currentMortgage;
  const headroomNew = averages.income + averages.expenseExMortgage - newPayment;

  const chart = {
    type: "bar",
    data: {
      labels: loanMonths.map((m) => monthLabel(m.month)),
      datasets: [
        {
          label: "Renter",
          data: loanMonths.map((m) => Math.round(m.interest)),
          backgroundColor: "#b3402f",
        },
        {
          label: "Avdrag",
          data: loanMonths.map((m) => Math.round(m.principal)),
          backgroundColor: "#2f5d8a",
        },
        {
          label: "Gebyr",
          data: loanMonths.map((m) => Math.round(m.fees)),
          backgroundColor: "#a1660f",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { x: { stacked: true }, y: { stacked: true } },
    },
  };

  const sensitivity = [-1, 0, 1, 2, 3].map((d) => ({
    rate: whatIf.rate + d,
    payment: annuityPayment(whatIf.amount, whatIf.rate + d, whatIf.years),
  }));

  return (
    <>
      <h1>Boliglån</h1>
      <div class="tiles">
        <div class="tile">
          <div class="label">Betalt til lån / mnd (12 mnd)</div>
          <div class="value neg">{nok(currentMortgage)}</div>
          <div class="sub">alle transaksjoner i kategorien boliglån</div>
        </div>
        <div class="tile">
          <div class="label">Herav renter / mnd</div>
          <div class="value">{nok(avgInterest)}</div>
          <div class="sub">
            avdrag {nok(avgPrincipal)} · fra terminmeldinger
          </div>
        </div>
        <div class="tile">
          <div class="label">Anslått restgjeld</div>
          <div class="value">{impliedBalance ? nok(impliedBalance) : "–"}</div>
          <div class="sub">
            siste måneds renter ÷ {whatIf.currentRate} % nominell rente
          </div>
        </div>
        <div class="tile">
          <div class="label">Igjen etter alle utgifter / mnd</div>
          <div class={`value ${headroomNow >= 0 ? "pos" : "neg"}`}>
            {nok(headroomNow)}
          </div>
          <div class="sub">
            inntekt − utgifter (siste 12 mnd, husholdning)
          </div>
        </div>
      </div>

      <h2>Hva om: nytt lån</h2>
      <div class="card">
        <form class="filters" method="get" action="/mortgage">
          <label>
            Lånebeløp
            <input
              type="number"
              name="amount"
              value={String(whatIf.amount)}
              step="1000"
              min="0"
            />
          </label>
          <label>
            Nominell rente %
            <input
              type="number"
              name="rate"
              value={String(whatIf.rate)}
              step="0.01"
              min="0"
            />
          </label>
          <label>
            Nedbetalingstid (år)
            <input
              type="number"
              name="years"
              value={String(whatIf.years)}
              step="1"
              min="1"
              max="40"
            />
          </label>
          <label>
            Rente på dagens lån %
            <input
              type="number"
              name="currentRate"
              value={String(whatIf.currentRate)}
              step="0.01"
              min="0"
            />
          </label>
          <button type="submit">Regn ut</button>
        </form>
        <div class="tiles">
          <div class="tile">
            <div class="label">Ny terminbetaling / mnd</div>
            <div class="value">{nok(newPayment)}</div>
            <div class="sub">annuitet, {whatIf.years} år, {whatIf.rate} %</div>
          </div>
          <div class="tile">
            <div class="label">Herav renter første mnd</div>
            <div class="value">{nok(newInterest)}</div>
            <div class="sub">
              ≈ {nok(taxBack)} tilbake via rentefradrag (22 %)
            </div>
          </div>
          <div class="tile">
            <div class="label">Endring fra i dag</div>
            <div class={`value ${delta > 0 ? "neg" : "pos"}`}>
              {delta > 0 ? "+" : ""}
              {nok(delta)}
            </div>
            <div class="sub">per måned mot dagens {nok(currentMortgage)}</div>
          </div>
          <div class="tile">
            <div class="label">Igjen per mnd med nytt lån</div>
            <div class={`value ${headroomNew >= 0 ? "pos" : "neg"}`}>
              {nok(headroomNew)}
            </div>
            <div class="sub">
              inntekt {nok(averages.income)} − andre utgifter{" "}
              {nok(-averages.expenseExMortgage)} − ny termin
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Rente</th>
              <th class="num">Termin / mnd</th>
              <th class="num">Igjen per mnd</th>
            </tr>
          </thead>
          <tbody>
            {sensitivity.map((s) => (
              <tr>
                <td>{s.rate.toFixed(1)} %</td>
                <td class="num">{nok(s.payment)}</td>
                <td class="num">
                  {nok(
                    averages.income + averages.expenseExMortgage - s.payment,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p class="muted small">
          Inntekt = lønn, renter og refusjoner; engangsinntekter, salg av
          sparing og utlegg for andre holdes utenfor. Andre utgifter = snitt av
          alle utgifter unntatt boliglån de siste 12 månedene, inkludert
          fellesutgifter. Sjekk at fellesutgiftene for den nye leiligheten ikke
          er høyere enn dagens.
        </p>
      </div>

      <h2>Renter og avdrag per termin</h2>
      <div class="card">
        <div class="chart">
          <canvas id="loan-chart"></canvas>
        </div>
        <ChartScript id="loan-chart" config={chart} />
      </div>
      <div class="grid2">
        <div class="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Måned</th>
                <th class="num">Renter</th>
                <th class="num">Avdrag</th>
                <th class="num">Gebyr</th>
                <th class="num">Totalt</th>
              </tr>
            </thead>
            <tbody>
              {[...loanMonths].reverse().map((m) => (
                <tr>
                  <td>{monthLabel(m.month)}</td>
                  <td class="num">{nok(m.interest)}</td>
                  <td class="num">{nok(m.principal)}</td>
                  <td class="num">{nok(m.fees)}</td>
                  <td class="num">{nok(m.total)}</td>
                </tr>
              ))}
              <tr class="subtotal">
                <td>Snitt 12 mnd</td>
                <td class="num">{nok(avgInterest)}</td>
                <td class="num">{nok(avgPrincipal)}</td>
                <td class="num">{nok(avg((m) => m.fees))}</td>
                <td class="num">{nok(avgTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="tablewrap">
          <h3 style="margin-top:0">
            Alle betalinger kategorisert som boliglån
          </h3>
          <table>
            <thead>
              <tr>
                <th>Måned</th>
                <th class="num">Beløp</th>
                <th class="num">Antall</th>
              </tr>
            </thead>
            <tbody>
              {[...mortgageMonths].reverse().map((m) => (
                <tr>
                  <td>
                    <a
                      href={`/transactions?category=housing%3Amortgage&from=${m.month}&to=${m.month}`}
                    >
                      {monthLabel(m.month)}
                    </a>
                  </td>
                  <td class="num">{nok(m.amount)}</td>
                  <td class="num">{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
