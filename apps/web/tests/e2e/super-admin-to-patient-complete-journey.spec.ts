import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

const baseScreenshotsDir = path.resolve(process.cwd(), "..", "..", "samiscreenshots");

const folders = {
  superAdmin: path.join(baseScreenshotsDir, "01_super_admin"),
  hospitalAdmin: path.join(baseScreenshotsDir, "02_hospital_admin"),
  reception: path.join(baseScreenshotsDir, "03_reception"),
  doctor: path.join(baseScreenshotsDir, "04_doctor_consultation"),
  billing: path.join(baseScreenshotsDir, "05_billing_counter"),
  laboratory: path.join(baseScreenshotsDir, "06_laboratory"),
  radiology: path.join(baseScreenshotsDir, "07_radiology"),
  pharmacy: path.join(baseScreenshotsDir, "08_pharmacy"),
  patientPortal: path.join(baseScreenshotsDir, "09_patient_portal"),
};

test.beforeAll(() => {
  for (const dirPath of Object.values(folders)) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

async function loginAs(page: Page, request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(response.status(), `${email} could not log in`).toBe(200);

  const storage = await request.storageState();
  await page.context().clearCookies();
  await page.context().addCookies(storage.cookies);
}

test("Super Admin to Patient Complete Hospital Demo Journey Viewport Screenshots", async ({ page, request }) => {
  test.setTimeout(300_000);

  // Set precise 1440x900 desktop viewport for clean website showcase screens
  await page.setViewportSize({ width: 1440, height: 900 });

  // =========================================================================
  // FOLDER 1: SUPER ADMIN (PLATFORM ADMINISTRATION)
  // =========================================================================
  await loginAs(page, request, "platform@wonflow.local");

  // 01. Platform Dashboard
  await page.goto("/platform", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.superAdmin, "01_platform_dashboard.png"), fullPage: false });

  // 02. Hospital Tenants Management
  await page.goto("/platform/organizations", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.superAdmin, "02_hospital_tenants_list.png"), fullPage: false });

  // 03. Entitlements & Subscription Management
  await page.goto("/platform/subscriptions", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.superAdmin, "03_subscriptions_entitlements.png"), fullPage: false });

  // 04. System Audit Log
  await page.goto("/platform/audit", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.superAdmin, "04_platform_audit_logs.png"), fullPage: false });

  // =========================================================================
  // FOLDER 2: HOSPITAL TENANT ADMIN
  // =========================================================================
  await loginAs(page, request, "admin@wonflow.local");

  // 01. Hospital Admin Overview
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.hospitalAdmin, "01_hospital_admin_dashboard.png"), fullPage: false });

  // 02. Branch / Location Management
  await page.goto("/admin/locations", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.hospitalAdmin, "02_branches_and_locations.png"), fullPage: false });

  // 03. Clinical Services & Fee Setup
  await page.goto("/admin/services", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.hospitalAdmin, "03_services_pricing_catalog.png"), fullPage: false });

  // 04. Team Management & Customizable Hospital Credentials
  await page.goto("/admin/team", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.hospitalAdmin, "04_team_members_and_custom_credentials.png"), fullPage: false });

  // =========================================================================
  // FOLDER 3: RECEPTION DESK & PATIENT ADMISSION
  // =========================================================================
  await loginAs(page, request, "reception@wonflow.local");

  // 01. Reception Counter Overview
  await page.goto("/operations/reception", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.reception, "01_reception_desk_dashboard.png"), fullPage: false });

  // 02. Pakistani Patient Registration Form
  await page.goto("/operations/patients/register", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const givenNameInput = page.locator("input[placeholder*='Given'], input[placeholder*='First']").first();
  if (await givenNameInput.isVisible()) {
    await givenNameInput.fill("Muhammad Tariq");
  }
  const familyNameInput = page.locator("input[placeholder*='Family'], input[placeholder*='Last']").first();
  if (await familyNameInput.isVisible()) {
    await familyNameInput.fill("Khan");
  }
  const phoneInput = page.locator("input[type='tel'], input[placeholder*='Phone']").first();
  if (await phoneInput.isVisible()) {
    await phoneInput.fill("03008451234");
  }

  await page.screenshot({ path: path.join(folders.reception, "02_patient_registration_pakistani_data.png"), fullPage: false });

  // 03. Patient Directory
  await page.goto("/operations/patients", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.reception, "03_patient_directory.png"), fullPage: false });

  // 04. Appointments Schedule & Queue
  await page.goto("/operations/appointments", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.reception, "04_daily_appointments_queue.png"), fullPage: false });

  // =========================================================================
  // FOLDER 4: DOCTOR CONSULTATION WORKSPACE
  // =========================================================================
  await loginAs(page, request, "doctor@wonflow.local");

  // 01. Doctor Dashboard
  await page.goto("/doctor", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.doctor, "01_doctor_workspace_dashboard.png"), fullPage: false });

  // 02. Consultation Queue
  await page.goto("/doctor/consultations", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.doctor, "02_consultation_queue.png"), fullPage: false });

  // Open active encounter consultation page
  const encounterLink = page.locator("a[href*='/doctor/consultations/']").first();
  if (await encounterLink.isVisible()) {
    await encounterLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // 03. Compact Consultation Form (Notes, Vitals, Pharmacy Dropdown, Third-Party Isolation)
    await page.screenshot({ path: path.join(folders.doctor, "03_compact_consultation_form.png"), fullPage: false });

    // 04. Printable Patient Receipt & Consultation Summary Modal
    const printReceiptBtn = page.getByRole("button", { name: /Print Receipt & Summary/i });
    if (await printReceiptBtn.isVisible()) {
      await printReceiptBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(folders.doctor, "04_printable_consultation_summary_receipt.png"), fullPage: false });

      const closeBtn = page.getByRole("button", { name: "Close" });
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  }

  // 05. Results & Follow-ups
  await page.goto("/doctor/results", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.doctor, "05_clinical_results_review.png"), fullPage: false });

  // =========================================================================
  // FOLDER 5: BILLING COUNTER
  // =========================================================================
  await loginAs(page, request, "billing@wonflow.local");

  // 01. Billing Desk Counter
  await page.goto("/operations/billing/new", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.billing, "01_billing_counter_invoice_creation.png"), fullPage: false });

  // =========================================================================
  // FOLDER 6: LABORATORY WORKSPACE
  // =========================================================================
  await loginAs(page, request, "laboratory@wonflow.local");

  // 01. Laboratory Worklist (with Pay-First Billing Notice)
  await page.goto("/operations/laboratory", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.laboratory, "01_laboratory_worklist_billing_notice.png"), fullPage: false });

  // =========================================================================
  // FOLDER 7: RADIOLOGY WORKSPACE
  // =========================================================================
  await loginAs(page, request, "radiology@wonflow.local");

  // 01. Radiology Worklist (with Pay-First Billing Notice)
  await page.goto("/operations/radiology", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.radiology, "01_radiology_worklist_billing_notice.png"), fullPage: false });

  // =========================================================================
  // FOLDER 8: PHARMACY WORKSPACE
  // =========================================================================
  await loginAs(page, request, "pharmacy@wonflow.local");

  // 01. Pharmacy Prescriptions & Dispensing Workspace
  await page.goto("/operations/pharmacy", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.pharmacy, "01_pharmacy_dispensing_workspace.png"), fullPage: false });

  // 02. Pharmacy Inventory & Stock Management
  await page.goto("/operations/pharmacy/inventory", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.pharmacy, "02_pharmacy_inventory_catalog.png"), fullPage: false });

  // =========================================================================
  // FOLDER 9: PATIENT PORTAL
  // =========================================================================
  await loginAs(page, request, "patient@wonflow.local");

  // 01. Patient Portal Home
  await page.goto("/patient", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.patientPortal, "01_patient_portal_dashboard.png"), fullPage: false });

  // 02. Patient Documents & Released Reports
  await page.goto("/patient/documents", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(folders.patientPortal, "02_patient_health_records_reports.png"), fullPage: false });
});
