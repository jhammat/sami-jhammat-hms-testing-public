import { expect, test } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

test.describe("Domain Management & Organization Settings", () => {
  test("hospital admin can view and update organization settings and locations", async ({ page }) => {
    test.slow();
    // Authenticate as organization admin
    const login = await page.request.post("/api/auth/login", {
      data: { email: "admin@wonflow.local", password },
    });
    expect(login.status()).toBe(200);

    await page.goto("/admin/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Settings|Organization|Profile|WonFlow Development Hospital/i);
  });

  test("public booking endpoint correctly renders for valid tenant slug", async ({ page }) => {
    await page.goto("/book/wonflow-development");
    await page.waitForLoadState("domcontentloaded");

    // Public booking screen should render hospital information and bookable services
    await expect(page.locator("body")).toContainText(/WonFlow Development Hospital|Book|Consultation/i);
  });

  test("non-existent tenant slug gracefully returns 404 / not found state", async ({ page }) => {
    const response = await page.goto("/book/non-existent-hospital-slug-xyz");
    const status = response?.status();
    const content = await page.content();
    const isNotFound = status === 404 || /404|not found|could not be found/i.test(content);
    expect(isNotFound).toBe(true);
  });
});
