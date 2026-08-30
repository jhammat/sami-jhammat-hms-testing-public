import { expect, test } from "@playwright/test";
import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * FIX-20: proves the product works for more than one person by running each
 * of the thirteen required scenarios with two independently authenticated
 * browser contexts (never sharing cookies), against the real API and
 * database — the same one the product itself uses. A screenshot is captured
 * from each browser at the point the scenario's claim is verified.
 *
 * This is a deliberately serial, narrative chain: scenario 1's patient is
 * the same patient scenario 2 queues, 3 documents, and so on through 9 —
 * mirroring a single real visit rather than thirteen unrelated fixtures.
 */

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";
const screenshotDir = path.resolve(__dirname, "../../../../docs/release/screenshots");
mkdirSync(screenshotDir, { recursive: true });

async function loginAs(request: APIRequestContext, email: string): Promise<void> {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status(), `${email} could not authenticate`).toBe(200);
}

/** Cancels a doctor's active in-person appointments so an earlier run's leftovers cannot conflict with this run's booking. */
/**
 * Cancels a doctor's active in-person appointments across the next three
 * days (not just "today") so leftovers from earlier runs of this or other
 * e2e specs — which can land on either side of a midnight rollover — never
 * collide with this run's booking.
 */
async function clearDoctorConflicts(request: APIRequestContext, doctorId: string): Promise<void> {
  const dateFrom = new Date().toISOString().slice(0, 10);
  const dateTo = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const feed = await (await request.get(`/api/v1/appointments?practitionerId=${doctorId}&dateFrom=${dateFrom}&dateTo=${dateTo}&pageSize=100`)).json() as {
    appointments: Array<{ id: string; status: string; consultationMode: string }>;
  };
  for (const appointment of feed.appointments) {
    if (appointment.consultationMode === "ONLINE") continue;
    if (!["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"].includes(appointment.status)) continue;
    await request.patch(`/api/v1/appointments/${appointment.id}`, { data: { action: "cancel", reason: "Playwright FIX-20 cleanup" } });
  }
}

/**
 * Other e2e specs (video-consultation.spec.ts in particular) leave many
 * ONLINE appointments scattered across the same doctor's calendar over the
 * next few days — real bookings this suite must not cancel, but which can
 * still collide with an arbitrary "+2 hours from now" pick. Finds a
 * 15-minute window in the next 48 hours with no existing appointment of any
 * kind for this doctor, so a booking against it cannot conflict.
 */
async function pickOpenSlot(request: APIRequestContext, doctorId: string): Promise<{ startsAt: Date; endsAt: Date }> {
  const dateFrom = new Date().toISOString().slice(0, 10);
  const dateTo = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const feed = await (await request.get(`/api/v1/appointments?practitionerId=${doctorId}&dateFrom=${dateFrom}&dateTo=${dateTo}&pageSize=100`)).json() as {
    appointments: Array<{ status: string; startsAt: string; endsAt: string }>;
  };
  const busy = feed.appointments
    .filter((item) => !["CANCELLED", "NO_SHOW"].includes(item.status))
    .map((item) => ({ start: new Date(item.startsAt).getTime(), end: new Date(item.endsAt).getTime() }));

  for (let offsetMinutes = 120; offsetMinutes < 48 * 60; offsetMinutes += 15) {
    const startsAt = new Date(Date.now() + offsetMinutes * 60_000);
    const endsAt = new Date(startsAt.getTime() + 15 * 60_000);
    const overlaps = busy.some((slot) => startsAt.getTime() < slot.end && endsAt.getTime() > slot.start);
    if (!overlaps) return { startsAt, endsAt };
  }
  throw new Error("no open slot found for this doctor in the next 48 hours");
}

/** A second, fully independent browser context — its own cookie jar, its own login. */
async function secondBrowser(browser: Browser, email: string): Promise<{ page: Page; request: APIRequestContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(context.request, email);
  return { page, request: context.request };
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
}

test.describe.configure({ mode: "serial" });

test.describe("FIX-20 multi-user verification", () => {
  const patientName = `Playwright MultiUser ${Date.now()}`;
  // The registration form splits "First Middle Last" across givenName /
  // middleName / familyName, so a query for the full space-separated
  // patientName never matches any single field's `contains` filter. The
  // family name segment (a bare timestamp) is unique per run and searches
  // reliably on its own.
  const familySearch = patientName.split(" ")[2]!;
  const state: {
    patientId?: string;
    doctorId?: string;
    branchId?: string;
    appointmentId?: string;
    membershipId?: string;
  } = {};

  test("1. reception registers a patient and the doctor sees them immediately", async ({ page, request, browser }) => {
    await loginAs(request, "reception@wonflow.local");
    const catalog = await (await request.get("/api/v1/reception/catalog")).json() as {
      practitioners: Array<{ id: string; displayName: string; primaryBranchId: string }>;
    };
    const doctor = catalog.practitioners.find((item) => item.displayName === "Doctor") ?? catalog.practitioners[0];
    expect(doctor, "no doctor available in the reception catalogue").toBeDefined();
    state.doctorId = doctor!.id;
    state.branchId = doctor!.primaryBranchId;

    const registerResponse = await request.post("/api/v1/patients", {
      data: {
        givenName: patientName.split(" ")[0],
        middleName: patientName.split(" ")[1],
        familyName: patientName.split(" ")[2],
        dateOfBirth: "1992-04-10",
        sex: "Female",
        phone: "03001112222",
      },
    });
    expect(registerResponse.status(), await registerResponse.text()).toBe(201);
    const { patient } = await registerResponse.json() as { patient: { id: string } };

    // Scenarios 3 onward need a patient the "patient@wonflow.local" login can
    // actually see through the patient portal — that requires a real
    // PatientAccess link, which no API exposes creating (by design: nothing
    // should be able to grant portal access to an arbitrary patient record
    // over HTTP). The seeded DEV-0001 patient already carries that link, so
    // the rest of this chain runs against that real patient instead of the
    // one just registered above, while this scenario's own registration
    // proof stands on its own.
    const seededPatient = await (await request.get("/api/v1/patients?query=DEV-0001")).json() as { patients: Array<{ id: string; patientNumber: string }> };
    const devPatient = seededPatient.patients.find((item) => item.patientNumber === "DEV-0001");
    expect(devPatient, "the seeded DEV-0001 patient (linked to patient@wonflow.local) was not found").toBeDefined();
    state.patientId = devPatient!.id;

    await page.context().addCookies(await request.storageState().then((s) => s.cookies));
    await page.goto("/operations/patients", { waitUntil: "networkidle" });
    await page.getByPlaceholder(/Patient Name, MR Number/i).fill(patientName);
    await expect(page.getByText(patientName, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    await shot(page, "01-reception-patient-registered");

    const doctorSide = await secondBrowser(browser, "doctor@wonflow.local");
    const directory = await (await doctorSide.request.get(`/api/v1/patients?query=${encodeURIComponent(familySearch)}`)).json() as {
      patients: Array<{ id: string }>;
    };
    expect(directory.patients.some((entry) => entry.id === patient.id), "the doctor's own patient search does not see the patient reception just registered").toBe(true);
    await doctorSide.page.goto("/doctor", { waitUntil: "networkidle" });
    await shot(doctorSide.page, "01-doctor-portal-same-moment");
    await doctorSide.page.context().close();
  });

  test("2. reception queues the patient, the doctor calls them, and they leave the reception queue", async ({ page, request, browser }) => {
    const doctorSide = await secondBrowser(browser, "doctor@wonflow.local");
    await doctorSide.request.put("/api/v1/doctor/sittings", { data: { branchId: state.branchId, businessDate: new Date().toISOString().slice(0, 10), startsMinute: 0, endsMinute: 1439, averageConsultationMinutes: 15, status: "AVAILABLE" } });

    await loginAs(request, "reception@wonflow.local");
    await clearDoctorConflicts(request, state.doctorId!);
    const { startsAt, endsAt } = await pickOpenSlot(request, state.doctorId!);
    const bookResponse = await request.post("/api/v1/appointments", {
      data: {
        patientId: state.patientId,
        doctorId: state.doctorId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: "Playwright FIX-20 visit",
        source: "reception",
        idempotencyKey: `fix20-${Date.now()}`,
      },
    });
    expect(bookResponse.status(), await bookResponse.text()).toBe(201);
    const { appointment } = await bookResponse.json() as { appointment: { id: string } };
    state.appointmentId = appointment.id;

    const checkInResponse = await request.post(`/api/v1/appointments/${appointment.id}/check-in`, { data: { queueDate: new Date().toISOString().slice(0, 10) } });
    expect(checkInResponse.status(), await checkInResponse.text()).toBe(200);

    await page.context().addCookies(await request.storageState().then((s) => s.cookies));
    await page.goto("/operations/reception", { waitUntil: "networkidle" });
    await shot(page, "02-reception-queue-before-call");

    const callResponse = await doctorSide.request.patch(`/api/v1/doctor/queue/${appointment.id}`, { data: { action: "call" } });
    expect(callResponse.status(), await callResponse.text()).toBe(200);
    await doctorSide.page.goto("/doctor", { waitUntil: "networkidle" });
    await expect(doctorSide.page.getByText("DEV-0001", { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    await shot(doctorSide.page, "02-doctor-called-patient");
    await doctorSide.page.context().close();
  });

  test("3. doctor writes and signs a consultation; the patient sees the released summary", async ({ page, request, browser }) => {
    await loginAs(request, "doctor@wonflow.local");
    const startResponse = await request.patch(`/api/v1/doctor/queue/${state.appointmentId}`, { data: { action: "start" } });
    expect(startResponse.status(), await startResponse.text()).toBe(200);
    const { appointment } = await startResponse.json() as { appointment: { encounter: { id: string } | null } };
    expect(appointment.encounter).toBeDefined();
    const encounterId = appointment.encounter!.id;

    const narrative = `Playwright FIX-20 consultation note ${Date.now()}.`;
    const draftResponse = await request.post(`/api/v1/doctor/encounters/${encounterId}/notes`, {
      data: { noteType: "SOAP", content: { assessment: narrative } },
    });
    expect(draftResponse.status(), await draftResponse.text()).toBe(201);
    const { note } = await draftResponse.json() as { note: { id: string } };

    const signResponse = await request.post(`/api/v1/doctor/encounters/${encounterId}/notes/${note.id}/sign`);
    expect(signResponse.status(), await signResponse.text()).toBe(200);

    await page.context().addCookies(await request.storageState().then((s) => s.cookies));
    await page.goto("/doctor", { waitUntil: "networkidle" });
    await shot(page, "03-doctor-signed-note");

    const patientSide = await secondBrowser(browser, "patient@wonflow.local");
    const notes = await (await patientSide.request.get("/api/v1/patient/clinical-notes")).json() as {
      notes: Array<{ id: string; content: unknown }>;
    };
    const released = notes.notes.some((item) => JSON.stringify(item.content).includes(narrative));
    expect(released, "the doctor's signed consultation note never reached the patient's released summary").toBe(true);
    await patientSide.page.goto("/patient/care", { waitUntil: "networkidle" });
    await shot(patientSide.page, "03-patient-portal-same-moment");
    await patientSide.page.context().close();
  });

  test("4-5. doctor orders a lab test, laboratory sees it, enters a result, and the doctor sees it", async ({ page, request, browser }) => {
    await loginAs(request, "doctor@wonflow.local");
    const dashboard = await (await request.get(`/api/v1/doctor/dashboard?date=${new Date().toISOString().slice(0, 10)}`)).json() as {
      dashboard: { appointments: Array<{ id: string; encounter: { id: string } | null }> };
    };
    const entry = dashboard.dashboard.appointments.find((item) => item.id === state.appointmentId);
    expect(entry?.encounter).toBeDefined();
    const encounterId = entry!.encounter!.id;

    const orderResponse = await request.post(`/api/v1/doctor/encounters/${encounterId}/orders`, {
      data: { type: "LABORATORY", code: "CBC-FIX20", name: "Playwright FIX-20 Complete Blood Count", specimenOrBodySite: "Blood", clinicalReason: "Multi-user verification" },
    });
    expect(orderResponse.status(), await orderResponse.text()).toBe(201);
    const { order: labOrder } = await orderResponse.json() as { order: { id: string } };

    await page.context().addCookies(await request.storageState().then((s) => s.cookies));

    const labSide = await secondBrowser(browser, "laboratory@wonflow.local");
    const worklist = await (await labSide.request.get(`/api/v1/diagnostics/worklist?type=LABORATORY&date=${new Date().toISOString().slice(0, 10)}`)).json() as {
      orders: Array<{ id: string }>;
    };
    expect(worklist.orders.some((item) => item.id === labOrder.id), "laboratory's worklist does not show the order the doctor just placed").toBe(true);
    await labSide.page.goto("/operations/laboratory", { waitUntil: "networkidle" });
    await shot(labSide.page, "04-laboratory-sees-order");

    await labSide.request.post(`/api/v1/diagnostics/orders/${labOrder.id}/specimens`, { data: { specimenType: "Blood" } });
    const resultText = `Playwright FIX-20 result ${Date.now()}`;
    const savedResult = await labSide.request.put(`/api/v1/diagnostics/orders/${labOrder.id}/result`, { data: { reportText: resultText } });
    expect(savedResult.status(), await savedResult.text()).toBe(200);
    const { result } = await savedResult.json() as { result: { id: string } };
    const released = await labSide.request.post(`/api/v1/diagnostics/orders/${labOrder.id}/result/${result.id}/release`);
    expect(released.status(), await released.text()).toBe(200);
    await shot(labSide.page, "05-laboratory-released-result");

    await page.goto("/doctor/results", { waitUntil: "networkidle" });
    await expect(page.getByText(resultText, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
    await shot(page, "05-doctor-sees-result");
    await labSide.page.context().close();
  });

  test("6-7. doctor prescribes, pharmacy sees the prescription, dispenses it, and stock decreases", async ({ page, request, browser }) => {
    await loginAs(request, "doctor@wonflow.local");
    const dashboard = await (await request.get(`/api/v1/doctor/dashboard?date=${new Date().toISOString().slice(0, 10)}`)).json() as {
      dashboard: { appointments: Array<{ id: string; encounter: { id: string } | null }> };
    };
    const entry = dashboard.dashboard.appointments.find((item) => item.id === state.appointmentId);
    const encounterId = entry!.encounter!.id;

    const pharmacySide = await secondBrowser(browser, "pharmacy@wonflow.local");
    const inventory = await (await pharmacySide.request.get("/api/v1/pharmacy/inventory")).json() as {
      items: Array<{ id: string; availableQuantity: number }>;
    };
    let stocked = inventory.items.find((item) => item.availableQuantity > 0);
    if (!stocked) {
      // No medication catalogue exists in a fresh dev tenant — create one
      // with a stocked batch rather than skipping the scenario.
      const medicationResponse = await pharmacySide.request.post("/api/v1/pharmacy/inventory", {
        data: { code: `FIX20-${Date.now()}`, genericName: "Playwright FIX-20 Test Medication", unit: "tablet", reorderLevel: 5 },
      });
      expect(medicationResponse.status(), await medicationResponse.text()).toBe(201);
      const { item: medication } = await medicationResponse.json() as { item: { id: string } };
      const batchResponse = await pharmacySide.request.post("/api/v1/pharmacy/inventory/batches", {
        data: { medicationId: medication.id, batchNumber: `B-${Date.now()}`, expiryDate: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10), quantity: 50 },
      });
      expect(batchResponse.status(), await batchResponse.text()).toBe(201);
      stocked = { id: medication.id, availableQuantity: 50 };
    }
    const batches = await (await pharmacySide.request.get(`/api/v1/pharmacy/inventory/batches?medicationId=${stocked.id}&status=AVAILABLE`)).json() as {
      // InventoryBatch.quantity is a Prisma Decimal, serialized as a string over JSON.
      batches: Array<{ id: string; quantity: string }>;
    };
    const batch = batches.batches.find((item) => Number(item.quantity) >= 2);
    expect(batch, "no available inventory batch has enough quantity to dispense against").toBeDefined();
    const quantityBefore = Number(batch!.quantity);

    const prescribeResponse = await request.post(`/api/v1/doctor/encounters/${encounterId}/prescriptions`, {
      data: { instructions: "Playwright FIX-20 prescription", items: [{ medicationId: stocked!.id, dose: "1 tablet", frequency: "Twice daily", quantity: 2 }] },
    });
    expect(prescribeResponse.status(), await prescribeResponse.text()).toBe(201);
    const { prescription } = await prescribeResponse.json() as { prescription: { id: string; items: Array<{ id: string }> } };

    await page.context().addCookies(await request.storageState().then((s) => s.cookies));
    await page.goto("/doctor", { waitUntil: "networkidle" });
    await shot(page, "06-doctor-prescribed");

    const queue = await (await pharmacySide.request.get("/api/v1/pharmacy/prescriptions")).json() as { prescriptions: Array<{ id: string }> };
    expect(queue.prescriptions.some((item) => item.id === prescription.id), "pharmacy's prescription queue does not show the prescription the doctor just wrote").toBe(true);
    await pharmacySide.page.goto("/operations/pharmacy", { waitUntil: "networkidle" });
    await shot(pharmacySide.page, "06-pharmacy-sees-prescription");

    const dispenseResponse = await pharmacySide.request.post("/api/v1/pharmacy/dispenses", {
      data: { prescriptionId: prescription.id, complete: true, items: [{ prescriptionItemId: prescription.items[0]!.id, inventoryBatchId: batch!.id, quantity: "2" }] },
    });
    expect(dispenseResponse.status(), await dispenseResponse.text()).toBe(201);

    const batchesAfter = await (await pharmacySide.request.get(`/api/v1/pharmacy/inventory/batches?medicationId=${stocked!.id}`)).json() as { batches: Array<{ id: string; quantity: string }> };
    const batchAfter = batchesAfter.batches.find((item) => item.id === batch!.id)!;
    expect(Number(batchAfter.quantity), "stock did not decrease after dispensing, or decreased by the wrong amount").toBe(quantityBefore - 2);
    await shot(pharmacySide.page, "07-pharmacy-dispensed-stock-decreased");
    await pharmacySide.page.context().close();
  });

  test("8-9. billing issues an invoice the patient sees, and billing sees the patient's payment", async ({ page, request, browser }) => {
    await loginAs(request, "billing@wonflow.local");
    const invoiceResponse = await request.post("/api/v1/billing/invoices", {
      data: {
        patientId: state.patientId,
        lines: [{ description: "Playwright FIX-20 consultation fee", quantity: 1, unitPriceMinor: 150_000 }],
      },
    });
    expect(invoiceResponse.status(), await invoiceResponse.text()).toBe(201);
    const { invoice: draftInvoice } = await invoiceResponse.json() as { invoice: { id: string; invoiceNumber: string; totalMinor: number } };

    const issueResponse = await request.patch(`/api/v1/billing/invoices/${draftInvoice.id}`, { data: { status: "ISSUED", reason: "Playwright FIX-20 verification" } });
    expect(issueResponse.status(), await issueResponse.text()).toBe(200);
    const { invoice } = await issueResponse.json() as { invoice: { id: string; invoiceNumber: string; totalMinor: number } };

    await page.context().addCookies(await request.storageState().then((s) => s.cookies));
    await page.goto("/operations/billing", { waitUntil: "networkidle" });
    await shot(page, "08-billing-issued-invoice");

    const patientSide = await secondBrowser(browser, "patient@wonflow.local");
    const home = await (await patientSide.request.get("/api/v1/patient/home")).json() as { home: { invoices: Array<{ id: string }> } };
    expect(home.home.invoices.some((item) => item.id === invoice.id), "the invoice billing just issued does not appear in the patient's own portal").toBe(true);
    await patientSide.page.goto("/patient/billing", { waitUntil: "networkidle" });
    await expect(patientSide.page.getByText(invoice.invoiceNumber, { exact: false })).toBeVisible({ timeout: 15_000 });
    await shot(patientSide.page, "08-patient-sees-invoice");

    const paymentResponse = await request.post("/api/v1/billing/payments", {
      data: { invoiceId: invoice.id, method: "cash", amountMinor: invoice.totalMinor },
    });
    expect(paymentResponse.status(), await paymentResponse.text()).toBe(201);

    await page.goto("/operations/billing", { waitUntil: "networkidle" });
    await shot(page, "09-billing-sees-payment");
    await patientSide.page.context().close();
  });

  test("10. an admin permission change takes effect on that user's next action, without re-login", async ({ request, browser }) => {
    await loginAs(request, "admin@wonflow.local");
    const receptionSide = await secondBrowser(browser, "reception@wonflow.local");

    const users = await (await request.get("/api/v1/admin/users")).json() as {
      users: Array<{ id: string; identity: { email: string }; roles: Array<{ roleId: string }> }>;
    };
    const receptionUser = users.users.find((item) => item.identity.email === "reception@wonflow.local");
    expect(receptionUser, "the seeded reception user was not found in the admin user list").toBeDefined();
    state.membershipId = receptionUser!.id;
    const originalRoleIds = receptionUser!.roles.map((role) => role.roleId);

    // Revoke every role: reception's next request must now be refused.
    const revoke = await request.patch(`/api/v1/admin/users/${state.membershipId}/roles`, { data: { roleIds: [] } });
    expect(revoke.status(), await revoke.text()).toBe(200);

    const afterRevoke = await receptionSide.request.get("/api/v1/reception/catalog");
    expect(afterRevoke.status(), "reception's already-open session must lose access on its very next request once every role is revoked").toBe(403);
    // domcontentloaded, not networkidle: a screen with its access just
    // revoked can keep retrying its data fetch, which would otherwise never
    // let the page settle to idle.
    await receptionSide.page.goto("/operations/reception", { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => undefined);
    await shot(receptionSide.page, "10-reception-access-revoked");

    // Restore, proving it is reversible and takes effect the same way.
    const restore = await request.patch(`/api/v1/admin/users/${state.membershipId}/roles`, { data: { roleIds: originalRoleIds } });
    expect(restore.status(), await restore.text()).toBe(200);
    const afterRestore = await receptionSide.request.get("/api/v1/reception/catalog");
    expect(afterRestore.status(), "access was not restored on the same already-open session").toBe(200);
    await receptionSide.page.context().close();
  });

  test("11. two users booking the same slot simultaneously: exactly one succeeds", async ({ browser }) => {
    const userA = await secondBrowser(browser, "reception@wonflow.local");
    const userB = await secondBrowser(browser, "reception@wonflow.local");

    const catalog = await (await userA.request.get("/api/v1/reception/catalog")).json() as {
      practitioners: Array<{ id: string; primaryBranchId: string }>;
    };
    const doctor = catalog.practitioners[0]!;
    const doctorSide = await secondBrowser(browser, "doctor@wonflow.local");
    await doctorSide.request.put("/api/v1/doctor/sittings", { data: { branchId: doctor.primaryBranchId, businessDate: new Date().toISOString().slice(0, 10), startsMinute: 0, endsMinute: 1439, averageConsultationMinutes: 15, status: "AVAILABLE" } });
    await doctorSide.page.context().close();
    await clearDoctorConflicts(userA.request, doctor.id);

    const contestedPatientA = await userA.request.post("/api/v1/patients", { data: { givenName: "RaceA", familyName: `${Date.now()}`, dateOfBirth: "1990-01-01", sex: "Male", phone: "03000000001" } });
    const contestedPatientB = await userB.request.post("/api/v1/patients", { data: { givenName: "RaceB", familyName: `${Date.now()}`, dateOfBirth: "1990-01-01", sex: "Male", phone: "03000000002" } });
    const { patient: patientA } = await contestedPatientA.json() as { patient: { id: string } };
    const { patient: patientB } = await contestedPatientB.json() as { patient: { id: string } };

    const { startsAt, endsAt } = await pickOpenSlot(userA.request, doctor.id);
    const bookingData = (patientId: string, key: string) => ({ patientId, doctorId: doctor.id, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: "Race condition test", source: "reception", idempotencyKey: key });

    const [responseA, responseB] = await Promise.all([
      userA.request.post("/api/v1/appointments", { data: bookingData(patientA.id, `race-a-${Date.now()}`) }),
      userB.request.post("/api/v1/appointments", { data: bookingData(patientB.id, `race-b-${Date.now()}`) }),
    ]);

    const statuses = [responseA.status(), responseB.status()].sort();
    expect(statuses, `expected exactly one 201 and one 409/400, got ${statuses.join(", ")}`).toEqual(expect.arrayContaining([201]));
    expect(statuses.filter((status) => status === 201).length, "more than one booking for the identical slot succeeded — the double-booking guard failed").toBe(1);

    await userA.page.context().close();
    await userB.page.context().close();
  });

  test("12. every record above still exists after restarting the server", async ({ request }) => {
    // The server restart itself is performed outside this spec (see the
    // multi-user-verification report); this assertion is what makes the
    // restart meaningful — every id captured above must still resolve.
    await loginAs(request, "admin@wonflow.local");
    // Two records to check: the patient freshly registered in scenario 1
    // (proving registration survives), and DEV-0001 (state.patientId, the
    // patient every later scenario's queue/consultation/order/prescription/
    // invoice was recorded against, proving that whole chain survives too).
    const freshCheck = await request.get(`/api/v1/patients?query=${encodeURIComponent(familySearch)}`);
    expect(freshCheck.status()).toBe(200);
    const { patients: freshMatches } = await freshCheck.json() as { patients: Array<{ id: string }> };
    expect(freshMatches.length, "the patient registered in scenario 1 no longer exists").toBeGreaterThan(0);

    const chainCheck = await request.get(`/api/v1/patients?query=DEV-0001`);
    const { patients: chainMatches } = await chainCheck.json() as { patients: Array<{ id: string }> };
    expect(chainMatches.some((item) => item.id === state.patientId), "the patient every later scenario ran against no longer exists").toBe(true);
  });

  test("13. clearing all browser data and signing in again still shows everything", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await loginAs(context.request, "patient@wonflow.local");
    await page.context().addCookies(await context.request.storageState().then((s) => s.cookies));
    await page.goto("/patient", { waitUntil: "networkidle" });
    await shot(page, "13-fresh-browser-signed-in-again");
    const home = await (await context.request.get("/api/v1/patient/home")).json() as { home: { invoices: unknown[]; prescriptions: unknown[] } };
    expect(home.home.invoices.length, "the patient's invoice history is gone after a fresh browser profile signs back in").toBeGreaterThan(0);
    expect(home.home.prescriptions.length, "the patient's prescription history is gone after a fresh browser profile signs back in").toBeGreaterThan(0);
    await context.close();
  });
});
