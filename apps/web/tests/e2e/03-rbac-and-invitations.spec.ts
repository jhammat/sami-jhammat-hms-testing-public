import { expect, test } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

test.describe("RBAC Permissions and Team Invitations", () => {
  test("hospital admin can view and manage organization team members", async ({ page }) => {
    test.slow();
    // Authenticate as organization admin
    const login = await page.request.post("/api/auth/login", {
      data: { email: "admin@wonflow.local", password },
    });
    expect(login.status()).toBe(200);

    await page.goto("/admin/team");
    await page.waitForLoadState("domcontentloaded");

    // Verify team members table or page container
    await expect(page.locator("body")).toContainText(/Team|Staff|Members|Permissions|Hospital users/i);
  });

  test("doctor is blocked from accessing hospital administration endpoints", async ({ page }) => {
    test.slow();
    // Authenticate as doctor
    const login = await page.request.post("/api/auth/login", {
      data: { email: "doctor@wonflow.local", password },
    });
    expect(login.status()).toBe(200);

    // Attempt accessing organization team/users endpoints requiring admin permissions
    const teamResponse = await page.request.get("/api/v1/organization/users");
    expect([401, 403, 404]).toContain(teamResponse.status());

    const settingsResponse = await page.request.get("/api/v1/organization/policies");
    expect([401, 403, 404]).toContain(settingsResponse.status());
  });

  test("patient is strictly scoped to patient portal routes", async ({ page }) => {
    test.slow();
    // Authenticate as patient
    const login = await page.request.post("/api/auth/login", {
      data: { email: "patient@wonflow.local", password },
    });
    expect(login.status()).toBe(200);

    await page.goto("/patient");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/Appointments|Documents|Medical/i);

    // Attempt accessing clinical doctor queues
    const doctorQueueResponse = await page.request.get("/api/v1/doctor/dashboard");
    expect([401, 403, 404]).toContain(doctorQueueResponse.status());
  });
});
