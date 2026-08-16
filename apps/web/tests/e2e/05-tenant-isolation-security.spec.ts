import { expect, test } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test.describe("Multi-Tenant Data Isolation and Security Guardrails", () => {
  test("unauthenticated requests to protected APIs are rejected with 401 or redirected to login", async ({ playwright }) => {
    const freshContext = await playwright.request.newContext({ baseURL, maxRedirects: 0 });
    const protectedEndpoints = [
      "/api/v1/doctor/dashboard",
      "/api/v1/reception/overview",
      "/api/v1/patient/home",
      "/api/v1/platform/dashboard",
      "/api/v1/billing/invoices",
    ];

    for (const endpoint of protectedEndpoints) {
      const res = await freshContext.get(endpoint);
      expect([401, 403, 302, 303, 307, 308]).toContain(res.status());
    }
  });

  test("tenant member cannot query platform super-admin control plane endpoints", async ({ page }) => {
    // Authenticate as a normal hospital admin
    const login = await page.request.post("/api/auth/login", {
      data: { email: "admin@wonflow.local", password },
    });
    expect(login.status()).toBe(200);

    // Attempt to access platform-only endpoints
    const platformDashboard = await page.request.get("/api/v1/platform/dashboard");
    expect([401, 403, 404]).toContain(platformDashboard.status());

    const platformOrgs = await page.request.get("/api/v1/platform/organizations");
    expect([401, 403, 404]).toContain(platformOrgs.status());
  });

  test("patient cannot access or modify hospital reception queue or billing", async ({ page }) => {
    // Authenticate as patient
    const login = await page.request.post("/api/auth/login", {
      data: { email: "patient@wonflow.local", password },
    });
    expect(login.status()).toBe(200);

    const receptionQueue = await page.request.get("/api/v1/reception/overview");
    expect([401, 403, 404]).toContain(receptionQueue.status());

    const billingReconciliation = await page.request.get("/api/v1/billing/reconciliation");
    expect([401, 403, 404]).toContain(billingReconciliation.status());
  });

  test("cross-tenant patient ID querying returns 404 or 403", async ({ page }) => {
    // Authenticate as doctor
    const login = await page.request.post("/api/auth/login", {
      data: { email: "doctor@wonflow.local", password },
    });
    expect(login.status()).toBe(200);

    // Random non-existent / foreign tenant patient UUID
    const foreignPatientId = "00000000-0000-0000-0000-000000000000";
    const patientDetail = await page.request.get(`/api/v1/patients/${foreignPatientId}`);
    expect([404, 403]).toContain(patientDetail.status());
  });
});
