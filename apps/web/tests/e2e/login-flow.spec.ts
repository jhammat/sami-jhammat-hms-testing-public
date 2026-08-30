import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The shared sign-in flow.
 *
 * Three things have to hold: the audience step routes to the right form, an
 * ordinary single-portal account goes straight through, and an account that
 * holds several portals is ASKED rather than refused. The last one is the
 * reason this suite exists — a multi-portal account previously received a 409
 * carrying no error message, so the screen fell through to "Invalid email or
 * password" and those users could not sign in at all.
 */

const PASSWORD = process.env.WONFLOW_DEMO_PASSWORD ?? "WonFlowDemo2026!";
const DOMAIN = "samijhammat.local";
const SHOTS = join(process.cwd(), "..", "..", "hpbspscreenshots", "00-login");

test.beforeAll(() => {
  mkdirSync(SHOTS, { recursive: true });
});

test("the first step asks which side you are signing in from", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Where are you signing in?" })).toBeVisible();
  await expect(page.getByText("Hospital staff")).toBeVisible();
  await expect(page.getByText("Patient", { exact: true })).toBeVisible();

  await page.screenshot({ path: join(SHOTS, "01-choose-audience.png"), fullPage: true });
});

test("choosing the hospital side leads to the staff credential form", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByText("Hospital staff").click();

  await expect(page.getByRole("heading", { name: "Sign in to the hospital" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();

  await page.screenshot({ path: join(SHOTS, "02-hospital-credentials.png"), fullPage: true });
});

test("choosing the patient side leads to the patient credential form", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByText("Patient", { exact: true }).click();

  await expect(page.getByRole("heading", { name: "Sign in to your care record" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Register as a patient/i })).toBeVisible();

  await page.screenshot({ path: join(SHOTS, "03-patient-credentials.png"), fullPage: true });
});

test("an account holding one portal signs straight in", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByText("Hospital staff").click();

  await page.getByLabel("Email address").fill(`reception@${DOMAIN}`);
  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("**/operations/reception", { timeout: 30_000 });
});

test("an account holding several portals is asked which one", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByText("Hospital staff").click();

  // The surgeon holds Doctor, Hospital Administration and Billing on one login.
  await page.getByLabel("Email address").fill(`surgeon@${DOMAIN}`);
  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();

  // Never the old failure: correct credentials must not read as wrong ones.
  await expect(page.getByText("Invalid email or password.")).toHaveCount(0);

  for (const portal of ["Doctor Workspace", "Hospital Administration", "Billing"]) {
    await expect(page.getByText(portal, { exact: true })).toBeVisible();
  }

  await page.screenshot({ path: join(SHOTS, "04-choose-portal.png"), fullPage: true });
});

test("picking a portal opens that portal, not the primary one", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByText("Hospital staff").click();

  await page.getByLabel("Email address").fill(`surgeon@${DOMAIN}`);
  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();

  // Billing is not this account's primary workspace, so landing there proves
  // the choice was honoured rather than the default taken.
  await page.getByText("Billing", { exact: true }).click();
  await page.waitForURL("**/operations/billing**", { timeout: 30_000 });
});

test("a portal the account does not hold is refused", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: `surgeon@${DOMAIN}`, password: PASSWORD },
  });

  const body = (await login.json()) as {
    contexts?: { membershipId: string | null; tenantId: string | null }[];
  };

  const anyContext = body.contexts?.[0];
  expect(anyContext).toBeTruthy();

  // The identity id comes from the signed pending-login cookie, so the only
  // thing a caller controls is which context it names — and naming one the
  // account does not hold has to fail.
  const forged = await page.request.post("/api/auth/select-context", {
    data: {
      role: "pharmacy",
      membershipId: anyContext!.membershipId,
      tenantId: anyContext!.tenantId,
    },
  });

  expect(forged.status()).toBe(403);
});

test("selecting a portal without a pending sign-in is refused", async ({ request }) => {
  const response = await request.post("/api/auth/select-context", {
    data: { role: "doctor", membershipId: null, tenantId: null },
  });

  expect(response.status()).toBe(401);
});
