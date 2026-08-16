import { expect, test } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

test.describe("Tenant Onboarding & Guided Provisioning", () => {
  test.beforeEach(async ({ page }) => {
    const login = await page.request.post("/api/auth/login", {
      data: { email: "platform@wonflow.local", password },
    });
    expect(login.status()).toBe(200);
  });

  test("guided onboarding wizard provisions a new hospital organization end-to-end", async ({ page }) => {
    test.slow();
    const uniqueSuffix = Date.now().toString().slice(-6);
    const orgName = `QA Enterprise Hospital ${uniqueSuffix}`;
    const slug = `qa-ent-${uniqueSuffix}`;
    const ownerEmail = `owner-${uniqueSuffix}@qa-wonflow.test`;

    await page.goto("/platform/organizations/new/flow");
    await page.waitForLoadState("domcontentloaded");

    // Step 1: Register Tenant
    await page.fill('input[placeholder="Enter organization name"]', orgName);
    await page.fill('input[placeholder="organization-slug"]', slug);
    await page.fill('input[placeholder="Enter contact email"]', `contact-${uniqueSuffix}@qa-wonflow.test`);

    // Submit Step 1
    await page.click('button:has-text("Continue to Entitlements")');

    // Step 2: Select Entitlements
    await expect(page.locator("h2:has-text('Select Entitlements')")).toBeVisible({ timeout: 10000 });
    
    // Toggle several modules
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      await checkboxes.first().check();
    }

    await page.click('button:has-text("Continue to Subscription")');

    // Step 3: Configure Subscription
    await expect(page.locator("h2:has-text('Configure Subscription')")).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Continue to Credentials")');

    // Step 4: Set Credentials
    await expect(page.locator("h2:has-text('Owner Credentials')")).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="Enter owner name"]', `Administrator ${uniqueSuffix}`);
    await page.fill('input[placeholder="Enter owner email"]', ownerEmail);
    await page.fill('input[placeholder="Main Branch"]', "Central Medical Center");

    // Activate
    await page.click('button:has-text("Activate Organization")');

    // Step 5: Complete
    await expect(page.locator("body")).toContainText("Tenant Activated Successfully", { timeout: 20000 });
    await expect(page.locator("body")).toContainText(ownerEmail);
  });
});
