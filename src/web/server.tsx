import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { existsSync } from "@std/fs";
import { loadConfig } from "../config.ts";
import { openDatabase } from "../db/db.ts";
import {
  categorizeAll,
  exactPattern,
  syncSeedData,
  USER_PRIORITY_DEFAULT,
} from "../categorize/mod.ts";
import { isMonth } from "./format.ts";
import * as q from "./queries.ts";
import { type Assets, Layout } from "./views/layout.tsx";
import { Dashboard } from "./views/dashboard.tsx";
import { CategoriesPage } from "./views/categories.tsx";
import { FixedPage } from "./views/fixed.tsx";
import { MortgagePage } from "./views/mortgage.tsx";
import { TransactionsPage, TxTableRow } from "./views/transactions.tsx";
import { ReviewPage } from "./views/review.tsx";
import { RulesPage } from "./views/rules.tsx";
import { DataPage } from "./views/data.tsx";

const STATIC_DIR = new URL("./static/", import.meta.url);

/** Vendored copies in src/web/static win; otherwise load from cdnjs. */
function resolveAssets(): Assets {
  const local = (file: string) => existsSync(new URL(file, STATIC_DIR));
  return {
    htmx: local("htmx.min.js")
      ? "/static/htmx.min.js"
      : "https://cdnjs.cloudflare.com/ajax/libs/htmx/2.0.4/htmx.min.js",
    chart: local("chart.umd.min.js")
      ? "/static/chart.umd.min.js"
      : "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.1/chart.umd.min.js",
  };
}

export function createApp(dbPath?: string) {
  const db = openDatabase(dbPath);
  syncSeedData(db);
  const assets = resolveAssets();
  const app = new Hono();

  app.use("/static/*", serveStatic({ root: "./src/web" }));

  const period = (c: { req: { query: (k: string) => string | undefined } }) => {
    const d = q.defaultPeriod(db);
    const from = isMonth(c.req.query("from")) ? c.req.query("from")! : d.from;
    const to = isMonth(c.req.query("to")) ? c.req.query("to")! : d.to;
    const owner = c.req.query("owner") || undefined;
    return { from: from <= to ? from : to, to: from <= to ? to : from, owner };
  };

  app.get("/", (c) => {
    const p = period(c);
    const flows = q.monthlyFlows(db, p);
    const avg = q.averages(db, p);
    const totals = q.categoryTotals(db, p).filter((t) =>
      ![
        "transfer:own",
        "transfer:partner",
        "loans:disbursement",
        "loans:payoff",
      ].includes(t.category_key)
    );
    const top = totals.filter((t) => t.sum < 0).slice(0, 14);
    const unc = db
      .prepare(
        `SELECT COUNT(*) AS count, IFNULL(SUM(t.amount), 0) AS sum FROM transactions t JOIN accounts a ON a.id = t.account_id
         WHERE t.category_key = 'uncategorized' AND t.date >= :from AND t.date < :to ${
          p.owner ? "AND a.owner = :owner" : ""
        }`,
      )
      .get<{ count: number; sum: number }>({
        from: `${p.from}-01`,
        to: `${p.to}-31`,
        ...(p.owner ? { owner: p.owner } : {}),
      })!;
    return c.html(
      <Layout title="Oversikt" active="/" assets={assets}>
        <Dashboard
          {...p}
          owners={q.getOwners(db)}
          flows={flows}
          averages={avg}
          topCategories={top}
          gaps={q.coverageGaps(db)}
          uncategorized={unc}
        />
      </Layout>,
    );
  });

  app.get("/categories", (c) => {
    const p = period(c);
    return c.html(
      <Layout title="Kategorier" active="/categories" assets={assets}>
        <CategoriesPage
          {...p}
          owners={q.getOwners(db)}
          cells={q.categoryByMonth(db, p)}
        />
      </Layout>,
    );
  });

  app.get("/fixed", (c) => {
    const owner = c.req.query("owner") || undefined;
    return c.html(
      <Layout title="Faste kostnader" active="/fixed" assets={assets}>
        <FixedPage
          items={q.recurringItems(db, { owner })}
          owner={owner}
          owners={q.getOwners(db)}
          showInactive={c.req.query("inactive") === "1"}
        />
      </Layout>,
    );
  });

  app.get("/mortgage", (c) => {
    const num = (k: string, d: number) => {
      const v = Number(c.req.query(k));
      return Number.isFinite(v) && c.req.query(k) !== undefined &&
          c.req.query(k) !== ""
        ? v
        : d;
    };
    const d = q.defaultPeriod(db);
    return c.html(
      <Layout title="Boliglån" active="/mortgage" assets={assets}>
        <MortgagePage
          loanMonths={q.loanByMonth(db)}
          mortgageMonths={q.mortgageByMonth(db)}
          averages={q.averages(db, d)}
          whatIf={{
            amount: num("amount", 6_000_000),
            rate: num("rate", 5.5),
            years: num("years", 30),
            currentRate: num("currentRate", 5.5),
          }}
        />
      </Layout>,
    );
  });

  const txFilters = (
    c: { req: { query: (k: string) => string | undefined } },
  ): q.TxFilters => ({
    q: c.req.query("q") || undefined,
    category: c.req.query("category") || undefined,
    group: c.req.query("group") || undefined,
    owner: c.req.query("owner") || undefined,
    account: c.req.query("account")
      ? Number(c.req.query("account"))
      : undefined,
    month: isMonth(c.req.query("month")) ? c.req.query("month") : undefined,
    from: c.req.query("from") || undefined,
    to: c.req.query("to") || undefined,
    uncategorized: c.req.query("uncategorized") === "1",
    merchant: c.req.query("merchant") || undefined,
    page: Math.max(1, Number(c.req.query("page") || 1)),
    pageSize: 200,
  });

  app.get("/transactions", (c) => {
    const filters = txFilters(c);
    const { rows, total, sum } = q.listTransactions(db, filters);
    return c.html(
      <Layout title="Transaksjoner" active="/transactions" assets={assets}>
        <TransactionsPage
          filters={filters}
          rows={rows}
          total={total}
          sum={sum}
          owners={q.getOwners(db)}
          accounts={q.getAccounts(db)}
          page={filters.page!}
          pageSize={filters.pageSize!}
        />
      </Layout>,
    );
  });

  app.post("/transactions/:id/category", async (c) => {
    const id = Number(c.req.param("id"));
    const tx = q.getTransaction(db, id);
    if (!tx) return c.text("not found", 404);
    const body = await c.req.parseBody();
    const category = String(body["category_key"] ?? "");
    q.setOverride(db, tx.fingerprint, category || null);
    categorizeAll(db, config);
    return c.html(<TxTableRow tx={q.getTransaction(db, id)!} />);
  });

  app.get("/review", (c) => {
    const owner = c.req.query("owner") || undefined;
    return c.html(
      <Layout title="Gjennomgang" active="/review" assets={assets}>
        <ReviewPage
          groups={q.reviewQueue(db, owner)}
          stats={q.uncategorizedStats(db)}
          owner={owner}
          owners={q.getOwners(db)}
        />
      </Layout>,
    );
  });

  app.post("/review/rule", async (c) => {
    const body = await c.req.parseBody();
    const merchant = String(body["merchant"] ?? "").trim();
    const category = String(body["category_key"] ?? "");
    const owner = String(body["owner"] ?? "");
    if (merchant && category && category !== "uncategorized") {
      q.createRule(db, {
        name: `Mottaker: ${merchant}`,
        field: "merchant",
        pattern: exactPattern(merchant),
        category_key: category,
        priority: USER_PRIORITY_DEFAULT,
      });
      categorizeAll(db, config);
    }
    return c.redirect(
      `/review${owner ? `?owner=${encodeURIComponent(owner)}` : ""}`,
    );
  });

  app.get("/rules", (c) => {
    const error = c.req.query("error") || undefined;
    return c.html(
      <Layout title="Regler" active="/rules" assets={assets}>
        <RulesPage rules={q.listRules(db)} error={error} />
      </Layout>,
    );
  });

  app.post("/rules", async (c) => {
    const body = await c.req.parseBody();
    try {
      q.createRule(db, {
        name: String(body["name"] ?? "").trim(),
        field: String(body["field"] ?? "merchant"),
        pattern: String(body["pattern"] ?? "").trim(),
        category_key: String(body["category_key"] ?? ""),
        priority: Number(body["priority"] || USER_PRIORITY_DEFAULT),
      });
      categorizeAll(db, config);
      return c.redirect("/rules");
    } catch (error) {
      return c.redirect(`/rules?error=${encodeURIComponent(String(error))}`);
    }
  });

  app.post("/rules/:id/delete", (c) => {
    q.deleteRule(db, Number(c.req.param("id")));
    categorizeAll(db, config);
    return c.redirect("/rules");
  });

  app.post("/categorize", (c) => {
    categorizeAll(db, config);
    return c.redirect(c.req.header("referer") ?? "/rules");
  });

  app.get("/data", (c) =>
    c.html(
      <Layout title="Data" active="/data" assets={assets}>
        <DataPage
          accounts={q.getAccounts(db)}
          imports={q.listImports(db)}
          gaps={q.coverageGaps(db)}
          unknown={q.unknownOwnAccounts(db)}
        />
      </Layout>,
    ));

  app.get("/api/monthly", (c) => c.json(q.monthlyFlows(db, period(c))));
  app.get("/api/categories", (c) => c.json(q.categoryByMonth(db, period(c))));
  app.get(
    "/api/recurring",
    (c) =>
      c.json(
        q.recurringItems(db, { owner: c.req.query("owner") || undefined }),
      ),
  );
  app.get(
    "/api/transactions",
    (c) => c.json(q.listTransactions(db, txFilters(c))),
  );

  let config = { owners: {}, accounts: [] } as Awaited<
    ReturnType<typeof loadConfig>
  >;
  const ready = loadConfig().then((cfg) => {
    config = cfg;
  });

  return { app, db, ready };
}

export async function serve(port = 8000) {
  const { app, ready } = createApp();
  await ready;
  console.log(`Cashflow UI: http://127.0.0.1:${port}`);
  await Deno.serve({ port, hostname: "127.0.0.1" }, app.fetch).finished;
}
