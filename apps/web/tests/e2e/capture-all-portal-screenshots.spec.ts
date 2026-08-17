import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

const screenshotDir = "C:/Users/MR.Laptops/.gemini/antigravity-ide/brain/9e5c8626-0a51-4244-b016-7ca1c3f87403/screenshots";

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const portals = [
  {
    name: "01-platform-admin",
    email: "platform@wonflow.local",
    home: "/platform",
    routes: [
      "/platform",
      "/platform/organizations",
      "/platform/entitlements",
      "/platform/subscriptions",
      "/platform/support",
      "/platform/audit",
      "/platform/settings",
    ],
  },
  {
    name: "02-hospital-admin",
    email: "admin@wonflow.local",
    home: "/admin",
    routes: [
      "/admin",
      "/admin/setup",
      "/admin/locations",
      "/admin/services",
      "/admin/users",
      "/admin/doctors",
      "/admin/team",
      "/admin/policies",
      "/admin/content",
      "/admin/audit",
      "/admin/settings",
    ],
  },
  {
    name: "03-reception",
    email: "reception@wonflow.local",
    home: "/operations/reception",
    routes: [
      "/operations/reception",
      "/operations/patients",
      "/operations/patients/register",
      "/operations/appointments",
      "/operations/appointments/new",
    ],
  },
  {
    name: "04-doctor",
    email: "doctor@wonflow.local",
    home: "/doctor",
    routes: [
      "/doctor",
      "/doctor/appointments",
      "/doctor/schedule",
      "/doctor/patients",
      "/doctor/consultations",
      "/doctor/documents",
      "/doctor/results",
      "/doctor/radiology-results",
      "/doctor/follow-ups",
      "/doctor/profile",
      "/doctor/settings",
    ],
  },
  {
    name: "05-patient",
    email: "patient@wonflow.local",
    home: "/patient",
    routes: [
      "/patient",
      "/patient/appointments",
      "/patient/appointments/book",
      "/patient/documents",
      "/patient/documents/upload",
      "/notifications",
    ],
  },
  {
    name: "06-laboratory",
    email: "laboratory@wonflow.local",
    home: "/operations/laboratory",
    routes: [
      "/operations/laboratory",
      "/operations/laboratory/collection",
      "/operations/laboratory/processing",
      "/operations/laboratory/release",
    ],
  },
  {
    name: "07-radiology",
    email: "radiology@wonflow.local",
    home: "/operations/radiology",
    routes: [
      "/operations/radiology",
      "/operations/radiology/processing",
      "/operations/radiology/release",
    ],
  },
  {
    name: "08-pharmacy",
    email: "pharmacy@wonflow.local",
    home: "/operations/pharmacy",
    routes: [
      "/operations/pharmacy",
      "/operations/pharmacy/inventory",
      "/operations/pharmacy/returns",
    ],
  },
  {
    name: "09-billing",
    email: "billing@wonflow.local",
    home: "/operations/billing",
    routes: [
      "/operations/billing",
      "/operations/billing/new",
      "/operations/billing/refunds",
    ],
  },
  {
    name: "10-management",
    email: "management@wonflow.local",
    home: "/management",
    routes: [
      "/management",
    ],
  },
] as const;

test.describe("Portal Screen Inspection & Screenshot Capture", () => {
  for (const portal of portals) {
    test(`capture screenshots for ${portal.name} (${portal.email})`, async ({ page }) => {
      test.slow();
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      const loginResponse = await page.request.post("/api/auth/login", {
        data: { email: portal.email, password },
      });
      expect(loginResponse.status(), `${portal.email} failed to authenticate`).toBe(200);

      const portalDir = path.join(screenshotDir, portal.name);
      if (!fs.existsSync(portalDir)) {
        fs.mkdirSync(portalDir, { recursive: true });
      }

      let routeIndex = 1;
      for (const route of portal.routes) {
        const response = await page.goto(route, { waitUntil: "load" });
        await page.waitForTimeout(500);
        expect(response?.status(), `Route ${route} returned HTTP error`).toBeLessThan(400);

        await expect(page.locator("body")).not.toContainText("Application error");
        await expect(page.locator("body")).not.toContainText("Internal Server Error");
        await expect(page.locator("body")).not.toContainText("This page could not be found");

        const fileName = `${String(routeIndex).padStart(2, "0")}_${route.replace(/[\/\?]/g, "_").replace(/^_+/, "") || "root"}.png`;
        const filePath = path.join(portalDir, fileName);

        await page.screenshot({ path: filePath, fullPage: true });
        routeIndex += 1;
      }
    });
  }
});
