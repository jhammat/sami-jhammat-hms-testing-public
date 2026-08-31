import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "..", "..", "hpbspscreenshots", "13-registration");

test("the patient registration screen", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });

  await page.goto("/patient/register");
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(600);

  // The hospital resolved from the hostname, not from a guess.
  // Named in both the badge and the description, so match the first.
  await expect(page.getByText("Sami Jhammat Hospital").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();

  await page.screenshot({ path: join(OUT, "01-empty.png"), fullPage: true });

  // Client-side validation before anything reaches the server.
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your first name.")).toBeVisible();
  await page.screenshot({ path: join(OUT, "02-validation.png"), fullPage: true });

  const email = `e2e.patient.${Date.now()}@example.com`;
  await page.getByLabel("First name").fill("Sami");
  await page.getByLabel("Family name").fill("Jhammat");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Mobile number").fill("+923160418059");
  await page.getByLabel("Date of birth").fill("1990-04-12");
  await page.getByLabel("Password", { exact: true }).fill("As12344321@@x");
  await page.getByLabel("Confirm password").fill("As12344321@@x");
  await page.screenshot({ path: join(OUT, "03-filled.png"), fullPage: true });

  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Your account is ready")).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: join(OUT, "04-done.png"), fullPage: true });

  // And the account it created actually signs in.
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: "As12344321@@x" },
  });
  expect(login.status()).toBe(200);
  expect((await login.json()).homePath).toBe("/patient");
});
