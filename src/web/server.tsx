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
import { isMonth, monthsBetween } from "./format.ts";
import * as q from "./queries.ts";
import { medianByKey } from "./stats.ts";
import { type Assets, Layout } from "./views/layout.tsx";
import { Dashboard } from "./views/dashboard.tsx";
import { CategoriesPage } from "./views/categories.tsx";
import { FixedPage } from "./views/fixed.tsx";
import { MortgagePage } from "./views/mortgage.tsx";
import {
  ReimbursePicker,
  TransactionsPage,
  TxTableRow,
} from "./views/transactions.tsx";
import { ReviewPage } from "./views/review.tsx";
import { RulesPage } from "./views/rules.tsx";
import { DataPage } from "./views/data.tsx";
import { VendorPage, VendorsPage } from "./views/vendors.tsx";
import { logoFor } from "./logos.ts";

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
    const medians = medianByKey(
      q.categoryByMonth(db, p).map((c) => ({
        key: c.category_key,
        month: c.month,
        sum: c.sum,
      })),
      monthsBetween(p.from, p.to),
    );
    const top = totals.filter((t) => t.sum < 0).slice(0, 14).map((t) => ({
      ...t,
      median: medians.get(t.category_key) ?? 0,
    }));
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
          heldOut={q.heldOut(db, p)}
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

  const fullPeriodOf = (
    c: { req: { query: (k: string) => string | undefined } },
  ) => {
    const d = q.fullPeriod(db);
    const from = isMonth(c.req.query("from")) ? c.req.query("from")! : d.from;
    const to = isMonth(c.req.query("to")) ? c.req.query("to")! : d.to;
    const owner = c.req.query("owner") || undefined;
    return { from: from <= to ? from : to, to: from <= to ? to : from, owner };
  };

  app.get("/vendors", (c) => {
    const p = fullPeriodOf(c);
    const qText = c.req.query("q")?.trim() || "";
    const kindParam = c.req.query("kind") ?? "";
    const kind = (["expense", "income", "all"].includes(kindParam)
      ? kindParam
      : "expense") as "expense" | "income" | "all";
    const { rows, total, months } = q.vendorList(db, {
      ...p,
      q: qText || undefined,
      kind,
      limit: 150,
    });
    return c.html(
      <Layout title="Mottakere" active="/vendors" assets={assets}>
        <VendorsPage
          rows={rows}
          total={total}
          months={months}
          {...p}
          owners={q.getOwners(db)}
          q={qText}
          kind={kind}
        />
      </Layout>,
    );
  });

  app.get("/vendors/:merchant", (c) => {
    const p = fullPeriodOf(c);
    const merchant = decodeURIComponent(c.req.param("merchant"));
    const vendor = q.vendorDetail(db, merchant, p);
    if (!vendor) {
      return c.html(
        <Layout title="Mottaker" active="/vendors" assets={assets}>
          <h1>{merchant}</h1>
          <p class="muted">
            Ingen transaksjoner i perioden. <a href="/vendors">Tilbake</a>
          </p>
        </Layout>,
        404,
      );
    }
    const { rows, total } = q.listTransactions(db, {
      merchant,
      owner: p.owner ? [p.owner] : undefined,
      from: p.from,
      to: p.to,
      pageSize: 50,
    });
    return c.html(
      <Layout title={merchant} active="/vendors" assets={assets}>
        <VendorPage
          vendor={vendor}
          months={q.vendorList(db, { ...p, limit: 0 }).months}
          {...p}
          transactions={rows}
          txTotal={total}
        />
      </Layout>,
    );
  });

  app.get("/fixed", (c) => {
    const kindParam = c.req.query("kind") ?? "all";
    const filter: q.RecurringFilter = {
      owner: c.req.query("owner") || undefined,
      q: c.req.query("q")?.trim() || undefined,
      cadence: c.req.query("cadence") || undefined,
      kind: (["all", "subscriptions", "bills", "other"].includes(kindParam)
        ? kindParam
        : "all") as q.RecurringFilter["kind"],
      includeInactive: c.req.query("inactive") === "1",
    };
    return c.html(
      <Layout title="Faste kostnader" active="/fixed" assets={assets}>
        <FixedPage
          items={q.recurringItems(db, filter)}
          filter={filter}
          owners={q.getOwners(db)}
        />
      </Layout>,
    );
  });

  app.get("/logo/:merchant", async (c) => {
    const merchant = decodeURIComponent(c.req.param("merchant"));
    const logo = await logoFor(merchant);
    return new Response(logo.body as BodyInit, {
      status: 200,
      headers: {
        "content-type": logo.contentType,
        "cache-control": logo.cache
          ? "public, max-age=604800"
          : "public, max-age=86400",
      },
    });
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
    c: {
      req: {
        query: (k: string) => string | undefined;
        queries: (k: string) => string[] | undefined;
      };
    },
  ): q.TxFilters => {
    const one = (k: string) => c.req.query(k) || undefined;
    // Checkboxes send "1"; the pager re-serializes booleans as "true".
    const flag = (k: string) => ["1", "true"].includes(c.req.query(k) ?? "");
    const many = (k: string) => {
      const values = (c.req.queries(k) ?? []).filter(Boolean);
      return values.length ? values : undefined;
    };
    // Older links pass a single ?month=; read it as from = to = that month.
    const month = isMonth(c.req.query("month"))
      ? c.req.query("month")
      : undefined;
    const direction = c.req.query("direction");
    return {
      q: one("q"),
      category: many("category"),
      group: one("group"),
      owner: many("owner"),
      account: many("account")?.map(Number).filter(Number.isInteger),
      from: one("from") ?? month,
      to: one("to") ?? month,
      direction: direction === "in" || direction === "out"
        ? direction
        : undefined,
      uncategorized: flag("uncategorized"),
      oneoff: flag("oneoff"),
      merchant: one("merchant"),
      page: Math.max(1, Number(c.req.query("page") || 1)),
      pageSize: 200,
    };
  };

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

  app.post("/transactions/:id/oneoff", async (c) => {
    const id = Number(c.req.param("id"));
    const tx = q.getTransaction(db, id);
    if (!tx) return c.text("not found", 404);
    const body = await c.req.parseBody();
    q.setOneOff(db, tx.fingerprint, String(body["one_off"] ?? "") === "1");
    categorizeAll(db, config);
    return c.html(<TxTableRow tx={q.getTransaction(db, id)!} />);
  });

  app.get("/transactions/:id/reimburse", (c) => {
    const tx = q.getTransaction(db, Number(c.req.param("id")));
    if (!tx) return c.text("not found", 404);
    return c.html(
      <ReimbursePicker
        tx={tx}
        candidates={q.reimbursementCandidates(db, tx)}
      />,
    );
  });

  app.post("/transactions/:id/reimburse", async (c) => {
    const id = Number(c.req.param("id"));
    const tx = q.getTransaction(db, id);
    if (!tx) return c.text("not found", 404);
    const body = await c.req.parseBody();
    q.linkReimbursement(
      db,
      tx.fingerprint,
      String(body["expense"] ?? "") || null,
    );
    categorizeAll(db, config);
    return c.html(<TxTableRow tx={q.getTransaction(db, id)!} />);
  });

  app.get("/review", (c) => {
    const owner = c.req.query("owner") || undefined;
    const otherIncome = q.listTransactions(db, {
      category: ["income:other"],
      owner: owner ? [owner] : undefined,
      pageSize: 100,
    }).rows;
    return c.html(
      <Layout title="Gjennomgang" active="/review" assets={assets}>
        <ReviewPage
          groups={q.reviewQueue(db, owner)}
          stats={q.uncategorizedStats(db)}
          otherIncome={otherIncome}
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
