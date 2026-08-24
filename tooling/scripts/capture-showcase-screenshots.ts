import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const BASE_URL = "http://localhost:3008";
const PASSWORD = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "screenshots");

interface ScreenshotTarget {
  name: string;
  path: string;
  action?: (page: import("playwright").Page) => Promise<void>;
}

interface WorkspacePlan {
  category: string;
  loginEmail: string;
  pages: ScreenshotTarget[];
}

const WORKSPACE_PLANS: WorkspacePlan[] = [
  {
    category: "01_platform_superadmin",
    loginEmail: "platform@wonflow.local",
    pages: [
      { name: "01_platform_dashboard", path: "/platform" },
      { name: "02_organizations_directory", path: "/platform/organizations" },
      {
        name: "03_organization_details_and_branches",
        path: "/platform/organizations",
        action: async (page) => {
          const orgLink = page.locator('a[href^="/platform/organizations/"]').first();
          if ((await orgLink.count()) > 0) {
            await orgLink.click();
            await page.waitForLoadState("domcontentloaded");
          }
        },
      },
      { name: "04_subscriptions_and_plans", path: "/platform/subscriptions" },
      { name: "05_module_entitlements", path: "/platform/entitlements" },
      { name: "06_audit_trail_and_security_logs", path: "/platform/audit" },
      { name: "07_platform_support_access", path: "/platform/support" },
      { name: "08_platform_system_settings", path: "/platform/settings" },
    ],
  },
  {
    category: "02_hospital_admin",
    loginEmail: "admin@wonflow.local",
    pages: [
      { name: "01_organization_admin_dashboard", path: "/organization" },
      { name: "02_doctor_service_pricing_and_fees", path: "/organization/services" },
      { name: "03_hospital_policies_and_rules", path: "/organization/policies" },
      { name: "04_payment_accounts_and_pkr_gateway", path: "/organization/settings" },
      { name: "05_staff_and_team_members", path: "/organization/staff" },
      { name: "06_hospital_operations_overview", path: "/operations" },
    ],
  },
  {
    category: "03_reception",
    loginEmail: "reception@wonflow.local",
    pages: [
      { name: "01_reception_desk_overview", path: "/operations/reception" },
      { name: "02_patient_directory_records", path: "/operations/patients" },
      { name: "03_patient_registration_form", path: "/operations/patients/register" },
      { name: "04_appointments_schedule", path: "/operations/appointments" },
      { name: "05_new_appointment_booking", path: "/operations/appointments/new" },
      {
        name: "06_live_queue_and_token_management",
        path: "/operations/reception",
        action: async (page) => {
          const queueTab = page.locator("button, a").filter({ hasText: /Queue|Token|Live/i }).first();
          if ((await queueTab.count()) > 0) {
            await queueTab.click().catch(() => {});
          }
        },
      },
    ],
  },
  {
    category: "04_doctor_portal",
    loginEmail: "doctor@wonflow.local",
    pages: [
      { name: "01_doctor_clinical_dashboard", path: "/doctor" },
      { name: "02_doctor_schedule_and_sittings", path: "/doctor/schedule" },
      { name: "03_clinical_consultations_hub", path: "/doctor/consultations" },
      { name: "04_patient_records_directory", path: "/doctor/patients" },
      {
        name: "05_patient_portal_credentials_modal",
        path: "/doctor/patients",
        action: async (page) => {
          const manageBtn = page.locator("button").filter({ hasText: /Portal|Manage Access|Credentials/i }).first();
          if ((await manageBtn.count()) > 0) {
            await manageBtn.click().catch(() => {});
            await page.waitForTimeout(600);
          }
        },
      },
      { name: "06_diagnostic_investigations_and_lab_results", path: "/doctor/results" },
      { name: "07_doctor_inbox_and_messages", path: "/doctor/inbox" },
      { name: "08_doctor_profile_and_consultation_fees", path: "/doctor/profile" },
    ],
  },
  {
    category: "05_pharmacy",
    loginEmail: "pharmacy@wonflow.local",
    pages: [
      { name: "01_pharmacy_dispensing_worklist", path: "/operations/pharmacy" },
      { name: "02_inventory_pakistani_medicines_catalog", path: "/operations/pharmacy/inventory" },
      {
        name: "03_point_of_sale_pos_cash_counter",
        path: "/operations/pharmacy",
        action: async (page) => {
          const posBtn = page.locator("button").filter({ hasText: /POS|Counter|Direct Sale|New Sale/i }).first();
          if ((await posBtn.count()) > 0) {
            await posBtn.click().catch(() => {});
            await page.waitForTimeout(600);
          }
        },
      },
      { name: "04_stock_alerts_and_expiry_tracking", path: "/operations/pharmacy/inventory" },
      { name: "05_pharmacy_returns_management", path: "/operations/pharmacy/returns" },
    ],
  },
  {
    category: "06_laboratory",
    loginEmail: "laboratory@wonflow.local",
    pages: [
      { name: "01_laboratory_worklist", path: "/operations/laboratory" },
      { name: "02_specimen_collection_and_barcoding", path: "/operations/laboratory/collection" },
      { name: "03_test_processing_and_results_entry", path: "/operations/laboratory/processing" },
      { name: "04_result_release_verification", path: "/operations/laboratory/release" },
      { name: "05_released_laboratory_reports", path: "/operations/laboratory/released" },
    ],
  },
  {
    category: "07_radiology",
    loginEmail: "radiology@wonflow.local",
    pages: [
      { name: "01_radiology_worklist", path: "/operations/radiology" },
      { name: "02_imaging_examination_processing", path: "/operations/radiology/processing" },
      { name: "03_radiologist_report_release", path: "/operations/radiology/release" },
      { name: "04_released_imaging_archives", path: "/operations/radiology/released" },
    ],
  },
  {
    category: "08_billing_and_finance",
    loginEmail: "billing@wonflow.local",
    pages: [
      { name: "01_billing_dashboard", path: "/operations/billing" },
      { name: "02_invoices_and_pkr_payment_collection", path: "/operations/billing" },
      { name: "03_create_new_invoice_form", path: "/operations/billing/new" },
      { name: "04_payment_receipts_and_refunds", path: "/operations/billing/refunds" },
    ],
  },
  {
    category: "09_patient_portal",
    loginEmail: "patient@wonflow.local",
    pages: [
      { name: "01_patient_home_dashboard", path: "/patient" },
      { name: "02_my_prescriptions_and_care_record", path: "/patient/care" },
      { name: "03_diagnostic_test_reports", path: "/patient/reports" },
      { name: "04_invoices_and_billing_history", path: "/patient/billing" },
      { name: "05_book_doctor_appointment", path: "/patient/appointments/book" },
      { name: "06_appointments_and_video_consultation", path: "/patient/appointments" },
    ],
  },
];

async function captureAll(): Promise<void> {
  console.log("🚀 Starting WonFlow Automated Showcase Screenshot Capture (Production Server)...");
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Output Directory: ${SCREENSHOTS_DIR}`);

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
  });

  let capturedCount = 0;

  for (const workspace of WORKSPACE_PLANS) {
    const categoryDir = path.join(SCREENSHOTS_DIR, workspace.category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    console.log(`\n📂 [${workspace.category}] Authenticating as ${workspace.loginEmail}...`);

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2, // 2x crisp HD desktop scaling
    });

    const page = await context.newPage();

    // 1. Perform login
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#login-email", workspace.loginEmail);
    await page.fill("#login-password", PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for login redirection
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(800);

    // 2. Capture each page
    for (const target of workspace.pages) {
      const targetUrl = `${BASE_URL}${target.path}`;
      const filePath = path.join(categoryDir, `${target.name}.png`);

      console.log(`   📸 Capturing: ${target.name} (${target.path})...`);

      try {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
        await page.waitForTimeout(800); // Allow react state & animations to settle

        if (target.action) {
          await target.action(page);
          await page.waitForTimeout(600);
        }

        // Standard viewport screenshot (fullPage: false prevents ugly stretching)
        await page.screenshot({
          path: filePath,
          fullPage: false,
        });

        capturedCount++;
        console.log(`   ✓ Saved: ${path.relative(process.cwd(), filePath)}`);
      } catch (err) {
        console.error(`   ❌ Failed to capture ${target.name}:`, err instanceof Error ? err.message : err);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`\n🎉 Completed! Successfully captured ${capturedCount} screenshots into categorized folders in: ${SCREENSHOTS_DIR}`);
}

captureAll().catch((err) => {
  console.error("Fatal error during screenshot capture:", err);
  process.exit(1);
});
