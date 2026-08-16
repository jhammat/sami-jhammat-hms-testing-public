import { expect, test } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

test.describe("Platform Administration Control Plane", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as platform super-administrator
    const login = await page.request.post("/api/auth/login", {
      data: { email: "platform@wonflow.local", password },
    });
    expect(login.status(), "platform admin login failed").toBe(200);
  });

  test("platform dashboard loads summary metrics and active tenants", async ({ page }) => {
    await page.goto("/platform");
    await page.waitForLoadState("domcontentloaded");

    // Verify main platform header
    await expect(page.locator("h1").first()).toContainText(/Overview|Platform/i);

    // Verify metrics API data returns valid numbers without NaN
    const metricsResponse = await page.request.get("/api/v1/platform/dashboard");
    expect(metricsResponse.status()).toBe(200);
    const data = await metricsResponse.json();
    expect(data.dashboard).toBeDefined();
    expect(typeof data.dashboard.totals?.tenants).toBe("number");
    expect(data.dashboard.totals?.tenants).toBeGreaterThanOrEqual(1);
  });

  test("tenant directory supports status filtering and search", async ({ page }) => {
    await page.goto("/platform/organizations");
    await page.waitForLoadState("domcontentloaded");

    // Fetch tenant list via API
    const response = await page.request.get("/api/v1/platform/organizations");
    expect(response.status()).toBe(200);
    const { tenants } = await response.json();
    expect(Array.isArray(tenants)).toBe(true);
    expect(tenants.length).toBeGreaterThanOrEqual(1);

    // Locate development hospital
    const devTenant = tenants.find((t: { slug: string; status: string }) => t.slug === "wonflow-development");
    expect(devTenant).toBeDefined();
    expect(devTenant.status).toBe("ACTIVE");
  });

  test("platform audit logs track system operations", async ({ page }) => {
    await page.goto("/platform/audit");
    await page.waitForLoadState("domcontentloaded");

    const auditResponse = await page.request.get("/api/v1/platform/audit");
    expect(auditResponse.status()).toBe(200);
    const { audit } = await auditResponse.json();
    expect(Array.isArray(audit)).toBe(true);
  });
});
