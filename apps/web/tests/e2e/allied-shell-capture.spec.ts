import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Captures the two allied portals after the section tabs moved into the
 * sidebar, so the result can be looked at rather than assumed.
 */

const PASSWORD = "WonFlowDemo2026!";

const OUT = join(process.cwd(), "..", "..", "hpbspscreenshots");

async function signIn(page: Page, email: string, role: string): Promise<void> {
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
  });

  expect(login.status(), `${email} could not sign in`).toBe(200);

  const body = (await login.json()) as {
    requiresContextSelection?: boolean;
    contexts?: {
      role: string;
      membershipId: string | null;
      tenantId: string | null;
      patientId?: string | null;
    }[];
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

  expect(selected.status()).toBe(200);
}

async function shoot(page: Page, folder: string, name: string): Promise<void> {
  mkdirSync(join(OUT, folder), { recursive: true });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, folder, `${name}.png`), fullPage: true });
}

test("physiotherapy portal after the rail moved into the sidebar", async ({ page }) => {
  await signIn(page, "physio@samijhammat.local", "PHYSIOTHERAPIST");

  await page.goto("/operations/physiotherapy");
  await shoot(page, "03-physiotherapy", "01-caseload");

  // The sidebar must be the thing that navigates now.
  const sidebar = page.getByRole("navigation").first();
  await expect(sidebar.getByRole("link", { name: "Caseload" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Exercise Studio" })).toBeVisible();

  // ...and the horizontal rail must be gone.
  await expect(page.getByRole("navigation", { name: "Physiotherapy sections" })).toHaveCount(0);

  await page.getByRole("link", { name: "Recovery Pathways" }).click();
  await expect(page).toHaveURL(/view=pathways/);
  await shoot(page, "03-physiotherapy", "06-pathways");

  await page.goto("/operations/physiotherapy?view=studio");
  await shoot(page, "03-physiotherapy", "03-exercise-studio");
});

test("dietetics portal after the rail moved into the sidebar", async ({ page }) => {
  await signIn(page, "dietitian@samijhammat.local", "NUTRITIONIST");

  await page.goto("/operations/nutrition");
  await shoot(page, "04-nutrition", "01-studio");

  const sidebar = page.getByRole("navigation").first();
  await expect(sidebar.getByRole("link", { name: "Caseload" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "PERT & Feeding" })).toBeVisible();

  await expect(page.getByRole("navigation", { name: "Dietetics sections" })).toHaveCount(0);

  await page.getByRole("link", { name: "PERT & Feeding" }).click();
  await expect(page).toHaveURL(/view=calculators/);
  await shoot(page, "04-nutrition", "02-pert");
});

test("choosing a patient names them in the sidebar and unlocks the sections", async ({
  page,
}) => {
  await signIn(page, "physio@samijhammat.local", "PHYSIOTHERAPIST");

  await page.goto("/operations/physiotherapy?view=studio");

  const sidebar = page.getByRole("navigation").first();
  await expect(sidebar.getByText("No patient chosen")).toBeVisible();

  // An in-content jump has to move the sidebar with it, or the two disagree
  // about which section is open.
  await page.getByRole("button", { name: "Open the caseload" }).click();
  await expect(page).toHaveURL(/view=caseload/);

  await page.getByRole("button", { name: "Work with this patient" }).first().click();

  await expect(sidebar.getByText("No patient chosen")).toHaveCount(0);
  await expect(sidebar.getByText(/Rukhsana|Arshad|Nasreen|Muhammad|Zainab/)).toBeVisible();

  await page.getByRole("link", { name: "Recovery Deck" }).click();
  await expect(page).toHaveURL(/view=overview/);

  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(900);
  await shoot(page, "03-physiotherapy", "02-recovery-deck");
});

test("the physiotherapy portal on a phone", async ({ browser }) => {
  // The install toggle promises a responsive app; this is that claim checked.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  await signIn(page, "physio@samijhammat.local", "PHYSIOTHERAPIST");
  await page.goto("/operations/physiotherapy?view=caseload");
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(800);

  // Nothing may overflow sideways on a phone.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "the page scrolls horizontally on a 390px screen").toBeLessThanOrEqual(1);

  await shoot(page, "12-responsive", "01-physio-phone");

  // The sidebar is a drawer at this width; the sections must still be in it.
  await page.getByRole("button", { name: /menu|navigation/i }).first().click();
  await page.waitForTimeout(600);
  await shoot(page, "12-responsive", "02-physio-phone-nav");

  await context.close();
});

test("the dietetics portal in dark mode", async ({ page }) => {
  await signIn(page, "dietitian@samijhammat.local", "NUTRITIONIST");

  await page.addInitScript(() => {
    window.localStorage.setItem("wonflow-color-theme", "dark");
  });

  await page.goto("/operations/nutrition?view=calculators");
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(900);

  await shoot(page, "12-responsive", "03-dietetics-dark");
});
