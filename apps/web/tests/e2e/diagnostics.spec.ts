import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";
const today = () => new Date().toISOString().slice(0, 10);

async function loginAs(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status(), `${email} could not authenticate`).toBe(200);
}

interface WorklistOrder {
  id: string;
  name: string;
  status: string;
  specimens: unknown[];
  results: Array<{ releasedAt: string | null }>;
}

const departments = [
  {
    type: "LABORATORY",
    email: "laboratory@wonflow.local",
    base: "/operations/laboratory",
    usesSpecimens: true,
    saveLabel: /Save preliminary result|Update preliminary result/i,
    sections: [
      ["", "Laboratory Worklist"],
      ["/collection", "Specimen Collection"],
      ["/processing", "Processing"],
      ["/release", "Pending Release"],
      ["/released", "Released Results"],
      ["/critical", "Critical Results"],
    ],
    navLabels: ["Worklist", "Specimen Collection", "Processing", "Pending Release", "Released Results", "Critical Results"],
  },
  {
    type: "RADIOLOGY",
    email: "radiology@wonflow.local",
    base: "/operations/radiology",
    usesSpecimens: false,
    saveLabel: /Save preliminary report|Update preliminary report/i,
    sections: [
      ["", "Radiology Worklist"],
      ["/processing", "Studies In Progress"],
      ["/release", "Pending Release"],
      ["/released", "Released Reports"],
      ["/critical", "Critical Findings"],
    ],
    navLabels: ["Worklist", "Studies In Progress", "Pending Release", "Released Reports", "Critical Findings"],
  },
] as const;

for (const department of departments) {
  test.describe(department.type, () => {
    for (const [suffix, heading] of department.sections) {
      test(`${department.base}${suffix} renders`, async ({ page }) => {
        await loginAs(page.request, department.email);
        const response = await page.goto(`${department.base}${suffix}`, { waitUntil: "networkidle" });
        expect(response?.status()).toBeLessThan(400);
        // Scoped to main: the shell topbar renders its own h1 with the nav label.
        await expect(page.getByRole("main").getByRole("heading", { level: 1, name: heading })).toBeVisible();
        await expect(page.locator("body")).not.toContainText("Application error");
      });
    }

    test("the sidebar exposes every section", async ({ page }) => {
      await loginAs(page.request, department.email);
      await page.goto(department.base, { waitUntil: "networkidle" });

      // Below the lg breakpoint the sidebar lives behind the navigation drawer.
      const openNavigation = page.getByRole("button", { name: "Open navigation" });
      if (await openNavigation.isVisible()) await openNavigation.click();

      for (const label of department.navLabels) {
        await expect(page.getByRole("link", { name: label, exact: true }).first()).toBeVisible();
      }
    });

    test("an order runs through to release and reaches the patient and doctor", async ({ page }) => {
      await loginAs(page.request, department.email);

      const worklist = await page.request.get(`/api/v1/diagnostics/worklist?type=${department.type}&date=${today()}`);
      expect(worklist.status()).toBe(200);
      const orders = (await worklist.json()).orders as WorklistOrder[];
      const order = orders.find((item) => item.results.every((result) => !result.releasedAt));
      expect(order, "the development seed did not leave an open order").toBeTruthy();

      if (department.usesSpecimens && order!.specimens.length === 0) {
        const collected = await page.request.post(`/api/v1/diagnostics/orders/${order!.id}/specimens`, { data: { specimenType: "Blood" } });
        expect(collected.status()).toBe(201);
      }

      await page.goto(`${department.base}/results/${order!.id}`, { waitUntil: "networkidle" });

      const narrative = `${department.type} narrative verified by Playwright ${Date.now()}.`;
      await page.locator("textarea[name='reportText']").fill(narrative);
      await page.getByRole("button", { name: department.saveLabel }).click();
      await expect(page.getByText(/saved as preliminary/i)).toBeVisible({ timeout: 20_000 });

      // Preliminary output must not be treated as released.
      await expect(page.getByText("Not released").first()).toBeVisible();

      await page.getByRole("button", { name: /Verify & release/i }).click();
      await expect(page.getByText(/released\./i).first()).toBeVisible({ timeout: 30_000 });

      await expect(page.getByText("Sent to patient").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("Sent to doctor").first()).toBeVisible();

      // The patient must now hold the released copy.
      await loginAs(page.request, "patient@wonflow.local");
      const home = await page.request.get("/api/v1/patient/home");
      expect(home.status()).toBe(200);
      const released = (await home.json()).home.diagnosticOrders as Array<{
        results: Array<{ reportText: string | null; releasedAt: string | null }>;
      }>;
      const patientCopy = released.find((item) => item.results.some((result) => result.reportText === narrative));
      expect(patientCopy, "the released output never reached the patient portal").toBeTruthy();

      await page.goto("/patient/reports", { waitUntil: "networkidle" });
      await expect(page.getByText(narrative)).toBeVisible({ timeout: 20_000 });
    });

    test("a preliminary result is never visible to the patient", async ({ page }) => {
      await loginAs(page.request, department.email);

      const worklist = await page.request.get(`/api/v1/diagnostics/worklist?type=${department.type}&date=${today()}`);
      const orders = (await worklist.json()).orders as WorklistOrder[];
      const order = orders.find((item) => item.results.every((result) => !result.releasedAt));
      expect(order, "the development seed did not leave an open order").toBeTruthy();

      if (department.usesSpecimens && order!.specimens.length === 0) {
        await page.request.post(`/api/v1/diagnostics/orders/${order!.id}/specimens`, { data: { specimenType: "Blood" } });
      }

      const secret = `Preliminary only ${department.type} ${Date.now()}`;
      const saved = await page.request.put(`/api/v1/diagnostics/orders/${order!.id}/result`, {
        data: { reportText: secret, critical: false },
      });
      expect(saved.status()).toBe(200);

      await loginAs(page.request, "patient@wonflow.local");
      const body = await (await page.request.get("/api/v1/patient/home")).text();
      expect(body, "an unreleased preliminary result leaked to the patient portal").not.toContain(secret);
    });

    test("a critical result requires notes", async ({ page }) => {
      await loginAs(page.request, department.email);
      const worklist = await page.request.get(`/api/v1/diagnostics/worklist?type=${department.type}&date=${today()}`);
      const orders = (await worklist.json()).orders as WorklistOrder[];
      expect(orders.length).toBeGreaterThan(0);

      const response = await page.request.put(`/api/v1/diagnostics/orders/${orders[0].id}/result`, {
        data: { reportText: "Critical finding", critical: true },
      });
      expect(response.status()).toBe(400);
      expect((await response.json()).error).toMatch(/critical/i);
    });

    test("the ordering doctor can review and acknowledge a released result", async ({ page }) => {
      await loginAs(page.request, department.email);

      const worklist = await page.request.get(`/api/v1/diagnostics/worklist?type=${department.type}&date=${today()}`);
      const orders = (await worklist.json()).orders as WorklistOrder[];
      const order = orders.find((item) => item.results.every((result) => !result.releasedAt));
      expect(order, "the development seed did not leave an open order").toBeTruthy();

      if (department.usesSpecimens && order!.specimens.length === 0) {
        await page.request.post(`/api/v1/diagnostics/orders/${order!.id}/specimens`, { data: { specimenType: "Blood" } });
      }

      const narrative = `Doctor review check ${department.type} ${Date.now()}`;
      const saved = await page.request.put(`/api/v1/diagnostics/orders/${order!.id}/result`, { data: { reportText: narrative } });
      expect(saved.status()).toBe(200);
      const resultId = (await saved.json()).result.id as string;

      const releaseResponse = await page.request.post(`/api/v1/diagnostics/orders/${order!.id}/result/${resultId}/release`);
      expect(releaseResponse.status()).toBe(200);

      // The ordering doctor sees it on their results screen.
      await loginAs(page.request, "doctor@wonflow.local");
      const doctorPath = department.type === "LABORATORY" ? "/doctor/results" : "/doctor/radiology-results";
      await page.goto(doctorPath, { waitUntil: "networkidle" });
      await expect(page.getByText(narrative)).toBeVisible({ timeout: 20_000 });

      const card = page.locator("article").filter({ hasText: narrative }).first();
      await card.getByRole("button", { name: /Mark as reviewed/i }).click();
      await expect(card.getByText(/Reviewed/i)).toBeVisible({ timeout: 20_000 });

      // The acknowledgement must persist.
      await page.reload({ waitUntil: "networkidle" });
      await expect(page.locator("article").filter({ hasText: narrative }).first().getByText(/Reviewed/i)).toBeVisible({ timeout: 20_000 });
    });

    test("another department cannot read this worklist", async ({ page }) => {
      // Reception holds no diagnostics permission and must be refused.
      await loginAs(page.request, "reception@wonflow.local");
      const response = await page.request.get(`/api/v1/diagnostics/worklist?type=${department.type}&date=${today()}`);
      expect(response.status()).toBe(403);
    });
  });
}
