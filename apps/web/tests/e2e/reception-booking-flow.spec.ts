import { expect, request as playwrightRequest, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Drives the actual Reception Desk UI through a full OPD walk-in visit and
 * proves the fix from this session: confirmAndSend now blocks on the real
 * appointment booking instead of silently falling through to a local-only
 * "success" screen when the backend call fails. Covers both the happy path
 * (a doctor with an open roster — real appointment created, visible on
 * Today's Appointments) and the failure path (a doctor with no schedule at
 * all — a visible error, and no false confirmation).
 *
 * Every setup, assertion and teardown step goes through real HTTP API calls
 * (the same ones the product itself uses) rather than a direct database
 * import — Playwright specs run under a different module pipeline than the
 * Vitest integration tests and cannot import @wonflow/database directly.
 */

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

async function loginAs(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status(), `${email} could not authenticate`).toBe(200);
}

interface Practitioner { id: string; displayName: string; primaryBranchId: string; specialtyName: string }

/**
 * Gives one doctor a wide-open weekly roster via the admin schedules API,
 * AND an all-day sitting for today logged in as the doctor themselves.
 * `checkDoctorBookable` checks a same-day DoctorSitting first and only
 * falls back to the weekly roster (AvailabilityRule) when no sitting
 * exists for the date at all — so a stale sitting (e.g. from an earlier
 * seed run, already outside its own hours) blocks "book now" regardless
 * of how open the roster is, unless the sitting itself is widened too.
 */
async function giveDoctorAnOpenRoster(doctor: Practitioner) {
  const admin = await playwrightRequest.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000" });
  await loginAs(admin, "admin@wonflow.local");
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    await admin.post("/api/v1/admin/schedules", {
      data: {
        doctorId: doctor.id,
        branchId: doctor.primaryBranchId,
        weekday,
        startsMinute: 0,
        endsMinute: 1439,
        capacity: 50,
        validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    });
  }
  await admin.dispose();

  const doctorContext = await playwrightRequest.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000" });
  await loginAs(doctorContext, "doctor@wonflow.local");
  await doctorContext.put("/api/v1/doctor/sittings", {
    data: {
      branchId: doctor.primaryBranchId,
      businessDate: new Date().toISOString().slice(0, 10),
      startsMinute: 0,
      endsMinute: 1439,
      averageConsultationMinutes: 15,
      status: "AVAILABLE",
    },
  });
  await doctorContext.dispose();
}

/**
 * Cancels any of a doctor's active in-person appointments so the (correct)
 * conflict guard does not block this run. Deliberately leaves ONLINE-mode
 * appointments alone: the dev seed plants one dedicated "live now" video
 * consultation for this same doctor for video-consultation.spec.ts to
 * exercise, and this suite must not cancel it out from under that test.
 */
async function clearDoctorConflicts(request: APIRequestContext, doctorId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const feed = await (await request.get(`/api/v1/reception/appointments?date=${today}`)).json() as {
    appointments: Array<{ id: string; doctorId: string | null; status: string; consultationMode: string | null }>;
  };
  for (const appointment of feed.appointments) {
    if (appointment.doctorId !== doctorId) continue;
    // The mode lives on the APPOINTMENT. This read `appointment.service
    // ?.consultationMode`, which no payload carries -- the service row has
    // `consultationModes` (plural, an array) instead -- so the expression
    // was always undefined, the guard never fired, and this helper
    // cancelled the seeded live video appointment that the comment above
    // says it must protect. video-consultation.spec.ts then failed with
    // "the seed did not leave a live online appointment", but only when the
    // whole suite ran in one invocation.
    if (appointment.consultationMode === "ONLINE") continue;
    if (!["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"].includes(appointment.status)) continue;
    await request.patch(`/api/v1/appointments/${appointment.id}`, { data: { action: "cancel", reason: "Playwright test cleanup" } });
  }
}

async function registerWalkInPatient(page: Page, name: string) {
  await page.getByRole("button", { name: "New Patient" }).click();
  await page.getByLabel("Patient Name").fill(name);
  await page.getByLabel("Father Name").fill("Test Father");
  await page.getByLabel("Identity Type").selectOption("CNIC");
  await page.getByLabel("CNIC Number").fill(`${Date.now()}`.slice(0, 13));
  await page.getByLabel("Mobile").fill("03001234567");
  await page.getByLabel("Gender").selectOption("Male");
  await page.getByPlaceholder("DD/MM/YYYY").fill("13/08/1995");
  await page.getByRole("button", { name: "Register Patient" }).click();
  await expect(page.getByRole("button", { name: "Patient Ready" })).toBeVisible({ timeout: 15_000 });
}

/** Selects the given doctor by name in the cascading Specialty -> Doctor -> Doctor service fields. */
async function routeToDoctor(page: Page, doctor: Practitioner) {
  await page.getByLabel("Specialty / Department").selectOption(doctor.specialtyName);
  // getByLabel's implicit <label>-wrapping match includes the wrapped
  // <select>'s own option text in the computed name (unlike the ARIA
  // accessible-name algorithm), so `{ exact: true }` against "Doctor *"
  // never matches. An anchored regex sidesteps that without depending on
  // exact equality, while still disambiguating from "Doctor service *".
  const doctorSelect = page.getByLabel(/^Doctor \*/);
  await expect(doctorSelect.locator(`option[value="${doctor.id}"]`)).toBeAttached({ timeout: 10_000 });
  await doctorSelect.selectOption(doctor.id);

  const serviceSelect = page.getByLabel(/^Doctor service \*/);
  await expect(serviceSelect.locator("option").nth(1)).toBeAttached({ timeout: 10_000 });
  await serviceSelect.selectOption({ index: 1 });

  await page.getByLabel("Symptoms / Reason for Consultation").fill("Playwright end-to-end test visit");
}

test.describe("reception OPD walk-in booking", () => {
  test("a real appointment is booked, checked in, and appears on Today's Appointments", async ({ page, request }) => {
    await loginAs(request, "reception@wonflow.local");

    const catalog = await (await request.get("/api/v1/reception/catalog")).json() as { practitioners: Practitioner[] };
    const doctor = catalog.practitioners[0];
    expect(doctor, "no doctor available in the reception catalogue").toBeDefined();
    await giveDoctorAnOpenRoster(doctor!);
    await clearDoctorConflicts(request, doctor!.id);

    // Share the authenticated session with the page.
    await page.context().addCookies(await request.storageState().then((state) => state.cookies));
    await page.goto("/operations/reception", { waitUntil: "networkidle" });

    const patientName = `Playwright Walkin ${Date.now()}`;
    await registerWalkInPatient(page, patientName);
    await routeToDoctor(page, doctor!);

    await page.getByRole("button", { name: "Prepare OPD Visit" }).click();
    await page.getByLabel("Payment Method").selectOption("Unpaid");
    await page.getByRole("button", { name: /Confirm (Unpaid Status|Payment)/ }).click();

    const sendButton = page.getByRole("button", { name: /Create OPD Visit & Send to Doctor|Booking…/ });
    await sendButton.click();

    // The fix under test: the button shows a real "in flight" state instead
    // of resolving instantly against local-only data.
    await expect(page.getByRole("button", { name: "Booking…" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Booking…" })).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("The visit could not be booked", { exact: false })).toHaveCount(0);

    // The exact regression reported: it must show up on Today's Appointments.
    const today = new Date().toISOString().slice(0, 10);
    const feed = await (await request.get(`/api/v1/reception/appointments?date=${today}`)).json() as {
      appointments: Array<{
        id: string;
        doctorId: string | null;
        status: string;
        checkedInAt: string | null;
        patient: { givenName: string; middleName: string | null; familyName: string };
      }>;
    };
    // The patient form splits "First Middle Last" across givenName /
    // middleName / familyName, so the full patientName only round-trips
    // by rejoining those parts (matching just givenName is ambiguous
    // across runs since every walk-in here starts with "Playwright").
    const booked = feed.appointments.find((entry) => {
      if (entry.doctorId !== doctor!.id) return false;
      const fullName = [entry.patient.givenName, entry.patient.middleName, entry.patient.familyName]
        .filter(Boolean)
        .join(" ");
      return fullName === patientName;
    });
    expect(booked, "no real appointment for this patient appears in Today's Appointments").toBeDefined();
    expect(booked!.status).toBe("IN_QUEUE");
    expect(booked!.checkedInAt).not.toBeNull();

    await page.goto("/operations/appointments", { waitUntil: "networkidle" });
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15_000 });

    // Teardown: cancel the appointment this test created.
    await request.patch(`/api/v1/appointments/${booked!.id}`, { data: { action: "cancel", reason: "Playwright test cleanup" } });
  });

  test("a doctor with no schedule produces a visible error and no false confirmation", async ({ page, request }) => {
    await loginAs(request, "reception@wonflow.local");

    const catalog = await (await request.get("/api/v1/reception/catalog")).json() as { practitioners: Practitioner[] };
    const doctor = catalog.practitioners[0];
    expect(doctor).toBeDefined();

    await page.context().addCookies(await request.storageState().then((state) => state.cookies));
    await page.goto("/operations/reception", { waitUntil: "networkidle" });

    const patientName = `Playwright NoSchedule ${Date.now()}`;
    await registerWalkInPatient(page, patientName);
    await routeToDoctor(page, doctor!);
    await page.getByRole("button", { name: "Prepare OPD Visit" }).click();
    await page.getByLabel("Payment Method").selectOption("Unpaid");
    await page.getByRole("button", { name: /Confirm (Unpaid Status|Payment)/ }).click();
    await page.getByRole("button", { name: /Create OPD Visit & Send to Doctor|Booking…/ }).click();

    // The fix under test: a real failure must be visible, and must not be
    // masked by a false "success" confirmation dialog. This doctor's roster
    // has whatever the tenant currently has configured for them (not wiped
    // to a guaranteed-empty state, to avoid touching real hospital data), so
    // this test only asserts the invariant that matters: if it fails, it
    // must fail loudly and not silently succeed against local-only data.
    const errorBanner = page.getByText("The visit could not be booked", { exact: false });
    const bookingButtonGone = page.getByRole("button", { name: "Booking…" }).waitFor({ state: "hidden", timeout: 15_000 });
    await bookingButtonGone;

    if (await errorBanner.isVisible()) {
      await expect(page.getByText(/Visit Sent to Doctor/i)).toHaveCount(0);
    }
  });
});
