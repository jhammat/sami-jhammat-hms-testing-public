import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A sweep of every portal in Sami Jhammat Hospital.
 *
 * This is not a pass/fail suite in the usual sense. It signs in as each of
 * the eleven roles, walks every page that role can reach, and writes three
 * things per page: a full-page screenshot, the HTTP status, and every
 * console error and failed request the page produced.
 *
 * The screenshots are for judging design. The error log is for finding the
 * bugs that a screenshot cannot show — a 500 behind a panel that renders an
 * empty state, a React key warning, a fetch to a route that does not exist.
 * Those are invisible to the eye and obvious in the console.
 *
 * Run it with:  pnpm --filter web exec playwright test hpbsp-portal-sweep
 */

const PASSWORD = process.env.WONFLOW_DEMO_PASSWORD ?? "WonFlowDemo2026!";
const DOMAIN = "samijhammat.local";
const OUT_ROOT = join(process.cwd(), "..", "..", "hpbspscreenshots");

interface PageTarget {
  /** File-name slug. */
  slug: string;
  path: string;
  /** Optional interactions to run before the screenshot. */
  prepare?: (page: Page) => Promise<void>;
}

interface PortalTarget {
  portal: string;
  account: string;
  /** Which portal to open when the account holds several. */
  role: string;
  pages: PageTarget[];
}

/**
 * Signs in, completing the portal-selection step when the account holds more
 * than one.
 *
 * The surgeon deliberately holds Doctor, Hospital Administration and Billing
 * on one login, so this path runs on every sweep rather than being a scenario
 * nobody exercises. An account with a single portal is signed straight in and
 * never reaches the second call.
 */
async function signIn(page: Page, email: string, role: string): Promise<void> {
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
  });

  expect(login.status(), `${email} could not sign in`).toBe(200);

  const body = (await login.json()) as {
    homePath?: string;
    requiresContextSelection?: boolean;
    contexts?: { role: string; membershipId: string | null; tenantId: string | null; patientId?: string | null }[];
  };

  if (!body.requiresContextSelection) return;

  const context = body.contexts?.find((candidate) => candidate.role === role);
  expect(context, `${email} does not hold the ${role} portal`).toBeTruthy();

  const selected = await page.request.post("/api/auth/select-context", {
    data: {
      role: context!.role,
      membershipId: context!.membershipId,
      tenantId: context!.tenantId,
      patientId: context!.patientId ?? null,
    },
  });

  expect(selected.status(), `${email} could not open the ${role} portal`).toBe(200);
}

/** Click a control by accessible name if it exists, and wait for the paint. */
async function clickIfPresent(page: Page, name: RegExp | string): Promise<boolean> {
  const control = page.getByRole("button", { name }).first();
  if ((await control.count()) === 0) return false;
  if (!(await control.isVisible().catch(() => false))) return false;
  await control.click().catch(() => undefined);
  await page.waitForTimeout(700);
  return true;
}

const PORTALS: PortalTarget[] = [
  {
    portal: "01-reception",
    account: "reception",
    role: "reception",
    pages: [
      { slug: "01-desk", path: "/operations/reception" },
      { slug: "02-overview", path: "/operations" },
      { slug: "03-patients", path: "/operations/patients" },
      { slug: "04-register-patient", path: "/operations/patients/register" },
      { slug: "05-appointments", path: "/operations/appointments" },
      { slug: "06-appointment-new", path: "/operations/appointments/new" },
      { slug: "07-billing-counter", path: "/operations/billing/new" },
      { slug: "08-billing-list", path: "/operations/billing" },
    ],
  },
  {
    portal: "02-doctor",
    account: "surgeon",
    role: "doctor",
    pages: [
      { slug: "01-dashboard", path: "/doctor" },
      { slug: "02-consultations", path: "/doctor/consultations" },
      { slug: "03-patients", path: "/doctor/patients" },
      { slug: "04-schedule", path: "/doctor/schedule" },
      { slug: "05-careplans", path: "/doctor/careplans" },
      { slug: "06-drains", path: "/doctor/drains" },
      { slug: "07-results", path: "/doctor/results" },
      { slug: "08-radiology-results", path: "/doctor/radiology-results" },
      { slug: "09-inbox", path: "/doctor/inbox" },
      { slug: "10-follow-ups", path: "/doctor/follow-ups" },
      { slug: "11-history", path: "/doctor/history" },
      { slug: "12-documents", path: "/doctor/documents" },
      { slug: "13-fees", path: "/doctor/fees" },
      { slug: "15-messages", path: "/doctor/messages" },
      { slug: "16-countersignatures", path: "/doctor/countersignatures" },
      { slug: "17-register-patient", path: "/doctor/register-patient" },
      { slug: "19-profile", path: "/doctor/profile" },
      { slug: "20-settings", path: "/doctor/settings" },
    ],
  },
  {
    portal: "03-physiotherapy",
    account: "physio",
    role: "physiotherapist",
    pages: [
      // The sections used to be reached by clicking a rail above the content.
      // They are sidebar links on the same page now, so each one is simply a
      // URL - which is also what the sidebar links to.
      { slug: "01-caseload", path: "/operations/physiotherapy?view=caseload" },
      {
        slug: "02-recovery-deck",
        path: "/operations/physiotherapy?view=caseload",
        prepare: async (page) => {
          // A patient still has to be chosen first; that is the whole point.
          await clickIfPresent(page, /Work with this patient/i);
          await page.goto("/operations/physiotherapy?view=overview");
        },
      },
      {
        slug: "03-exercise-studio",
        path: "/operations/physiotherapy?view=caseload",
        prepare: async (page) => {
          await clickIfPresent(page, /Work with this patient/i);
          await page.goto("/operations/physiotherapy?view=studio");
        },
      },
      {
        slug: "04-assess-measure",
        path: "/operations/physiotherapy?view=caseload",
        prepare: async (page) => {
          await clickIfPresent(page, /Work with this patient/i);
          await page.goto("/operations/physiotherapy?view=assessment");
        },
      },
      {
        slug: "05-precaution-orders",
        path: "/operations/physiotherapy?view=caseload",
        prepare: async (page) => {
          await clickIfPresent(page, /Work with this patient/i);
          await page.goto("/operations/physiotherapy?view=orders");
        },
      },
      { slug: "06-pathways", path: "/operations/physiotherapy?view=pathways" },
      { slug: "07-profile", path: "/operations/physiotherapy/profile" },
    ],
  },
  {
    portal: "04-nutrition",
    account: "dietitian",
    role: "nutritionist",
    pages: [
      { slug: "01-studio", path: "/operations/nutrition" },
      { slug: "02-pert", path: "/operations/nutrition?view=calculators" },
      {
        slug: "03-enteral",
        path: "/operations/nutrition?view=caseload",
        prepare: async (page) => {
          await clickIfPresent(page, /Work with this patient/i);
          await page.goto("/operations/nutrition?view=plan");
        },
      },
      { slug: "04-profile", path: "/operations/nutrition/profile" },
    ],
  },
  {
    portal: "05-laboratory",
    account: "laboratory",
    role: "laboratory",
    pages: [
      { slug: "01-worklist", path: "/operations/laboratory" },
      { slug: "02-collection", path: "/operations/laboratory/collection" },
      { slug: "03-processing", path: "/operations/laboratory/processing" },
      { slug: "04-release", path: "/operations/laboratory/release" },
      { slug: "05-released", path: "/operations/laboratory/released" },
      { slug: "06-critical", path: "/operations/laboratory/critical" },
    ],
  },
  {
    portal: "06-radiology",
    account: "radiology",
    role: "radiology",
    pages: [
      { slug: "01-worklist", path: "/operations/radiology" },
      { slug: "02-processing", path: "/operations/radiology/processing" },
      { slug: "03-release", path: "/operations/radiology/release" },
      { slug: "04-released", path: "/operations/radiology/released" },
      { slug: "05-critical", path: "/operations/radiology/critical" },
    ],
  },
  {
    portal: "07-pharmacy",
    account: "pharmacy",
    role: "pharmacy",
    pages: [
      { slug: "01-dispensing", path: "/operations/pharmacy" },
      { slug: "02-inventory", path: "/operations/pharmacy/inventory" },
      { slug: "03-returns", path: "/operations/pharmacy/returns" },
    ],
  },
  {
    portal: "08-billing",
    account: "billing",
    role: "billing",
    pages: [
      { slug: "01-invoices", path: "/operations/billing" },
      { slug: "02-counter", path: "/operations/billing/new" },
      { slug: "03-refunds", path: "/operations/billing/refunds" },
    ],
  },
  {
    portal: "09-admin",
    account: "admin",
    role: "admin",
    pages: [
      { slug: "01-overview", path: "/admin" },
      { slug: "02-team", path: "/admin/team" },
      { slug: "03-users", path: "/admin/users" },
      { slug: "04-staff", path: "/admin/staff" },
      { slug: "05-doctors", path: "/admin/doctors" },
      { slug: "06-departments", path: "/admin/departments" },
      { slug: "07-services", path: "/admin/services" },
      { slug: "08-catalogue", path: "/admin/catalogue" },
      { slug: "09-schedules", path: "/admin/schedules" },
      { slug: "10-locations", path: "/admin/locations" },
      { slug: "11-payment-accounts", path: "/admin/payment-accounts" },
      { slug: "12-policies", path: "/admin/policies" },
      { slug: "13-content", path: "/admin/content" },
      { slug: "14-audit", path: "/admin/audit" },
      { slug: "15-settings", path: "/admin/settings" },
      { slug: "16-setup", path: "/admin/setup" },
      { slug: "17-organization", path: "/organization" },
      { slug: "18-organization-services", path: "/organization/services" },
      { slug: "19-organization-team", path: "/organization/team" },
    ],
  },
  {
    portal: "10-management",
    account: "management",
    role: "management",
    pages: [
      { slug: "01-dashboard", path: "/management" },
    ],
  },
  {
    portal: "11-patient",
    account: "patient",
    role: "patient",
    pages: [
      { slug: "01-dashboard", path: "/patient" },
      { slug: "02-appointments", path: "/patient/appointments" },
      { slug: "03-book", path: "/patient/appointments/book" },
      { slug: "04-documents", path: "/patient/documents" },
      { slug: "05-messages", path: "/patient/messages" },
    ],
  },
];

interface PageReport {
  portal: string;
  slug: string;
  path: string;
  status: number | null;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  visibleErrorText: string[];
  neverWentIdle: boolean;
}

const reports: PageReport[] = [];

/** Console noise that is not a product defect and would drown the signal. */
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /webpack-hmr/i,
  /Failed to load resource: net::ERR_ABORTED/i,
  /favicon/i,
];

function isNoise(text: string): boolean {
  return IGNORED_CONSOLE.some((pattern) => pattern.test(text));
}

for (const portal of PORTALS) {
  test(`sweep ${portal.portal}`, async ({ page }) => {
    test.slow();
    test.setTimeout(240_000);

    const outDir = join(OUT_ROOT, portal.portal);
    mkdirSync(outDir, { recursive: true });

    /** Screens that never went quiet — usually a request that never settles. */
    const idleTimedOut: string[] = [];

    await signIn(page, `${portal.account}@${DOMAIN}`, portal.role);

    await page.setViewportSize({ width: 1560, height: 1080 });

    for (const target of portal.pages) {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];

      const onConsole = (message: ConsoleMessage) => {
        if (message.type() !== "error" && message.type() !== "warning") return;
        const text = message.text();
        if (isNoise(text)) return;
        consoleErrors.push(`${message.type()}: ${text}`);
      };

      const onPageError = (error: Error) => pageErrors.push(error.message);

      const onResponse = (response: { status: () => number; url: () => string }) => {
        if (response.status() < 400) return;
        if (isNoise(response.url())) return;
        failedRequests.push(`${response.status()} ${response.url()}`);
      };

      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      page.on("response", onResponse);

      let status: number | null = null;

      try {
        // `domcontentloaded` rather than `networkidle`: several screens keep a
        // long-lived request open, and waiting for idle turned a slow page
        // into a a four-minute test timeout that captured nothing at all.
        // The settle below is what actually lets the client render.
        const response = await page.goto(target.path, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        status = response?.status() ?? null;

        await page
          .waitForLoadState("networkidle", { timeout: 12_000 })
          .catch(() => idleTimedOut.push(target.slug));

        await page.waitForTimeout(1_200);

        if (target.prepare) await target.prepare(page);

        await page.screenshot({
          path: join(outDir, `${target.slug}.png`),
          fullPage: true,
        });
      } catch (error) {
        pageErrors.push(`navigation: ${(error as Error).message}`);
        await page
          .screenshot({ path: join(outDir, `${target.slug}-FAILED.png`), fullPage: true })
          .catch(() => undefined);
      }

      // Text the user would actually see if something broke.
      const visibleErrorText: string[] = [];
      for (const phrase of [
        "Application error",
        "This page could not be found",
        "Something went wrong",
        "Unhandled Runtime Error",
        "is required",
        "Failed to",
        "Could not load",
      ]) {
        const found = page.getByText(phrase, { exact: false }).first();
        if ((await found.count()) > 0 && (await found.isVisible().catch(() => false))) {
          visibleErrorText.push(`${phrase}: ${(await found.innerText().catch(() => "")).slice(0, 200)}`);
        }
      }

      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);

      reports.push({
        portal: portal.portal,
        slug: target.slug,
        path: target.path,
        status,
        consoleErrors: [...new Set(consoleErrors)].slice(0, 12),
        pageErrors: [...new Set(pageErrors)].slice(0, 12),
        failedRequests: [...new Set(failedRequests)].slice(0, 12),
        visibleErrorText,
        neverWentIdle: idleTimedOut.includes(target.slug),
      });
    }

    writeFileSync(
      join(OUT_ROOT, `report-${portal.portal}.json`),
      JSON.stringify(reports.filter((entry) => entry.portal === portal.portal), null, 2),
      "utf8",
    );
  });
}

test.afterAll(() => {
  mkdirSync(OUT_ROOT, { recursive: true });

  const problems = reports.filter(
    (entry) =>
      (entry.status !== null && entry.status >= 400) ||
      entry.pageErrors.length > 0 ||
      entry.failedRequests.length > 0 ||
      entry.visibleErrorText.length > 0 ||
      entry.consoleErrors.length > 0 ||
      entry.neverWentIdle,
  );

  writeFileSync(join(OUT_ROOT, "sweep-report.json"), JSON.stringify(reports, null, 2), "utf8");

  const lines: string[] = [
    `# Portal sweep — ${new Date().toISOString()}`,
    "",
    `Pages visited: ${reports.length}`,
    `Pages with something to look at: ${problems.length}`,
    "",
  ];

  for (const entry of problems) {
    lines.push(`## ${entry.portal} / ${entry.slug}  (${entry.path})`);
    lines.push(`- HTTP ${entry.status ?? "no response"}`);
    if (entry.neverWentIdle) lines.push("- NEVER WENT IDLE: a request on this page never settles");
    for (const item of entry.pageErrors) lines.push(`- PAGE ERROR: ${item}`);
    for (const item of entry.failedRequests) lines.push(`- REQUEST: ${item}`);
    for (const item of entry.visibleErrorText) lines.push(`- VISIBLE: ${item}`);
    for (const item of entry.consoleErrors) lines.push(`- CONSOLE: ${item}`);
    lines.push("");
  }

  writeFileSync(join(OUT_ROOT, "sweep-report.md"), lines.join("\n"), "utf8");
});
