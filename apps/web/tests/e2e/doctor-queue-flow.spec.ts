import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Proves the reception -> doctor data flow end to end against the real
 * database: reception books and checks in a real walk-in appointment, and
 * the doctor's own portal (real /api/v1/doctor/dashboard + the real queue
 * lifecycle actions added this session) picks it up, lets the doctor call,
 * start and complete the consultation, and reflects the resulting real
 * Encounter/QueueEntry/Appointment status changes.
 */

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

async function loginAs(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status(), `${email} could not authenticate`).toBe(200);
}

/**
 * Cancels the doctor's active in-person appointments so the (correct)
 * time-overlap conflict guard does not block this run's booking. ONLINE
 * appointments are left alone — the dev seed plants one dedicated "live
 * now" video consultation for this same doctor for video-consultation.spec.ts
 * to exercise, and this file must not cancel it out from under that test
 * when both run in the same suite invocation.
 */
async function clearDoctorConflicts(request: APIRequestContext, doctorId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const feed = await (await request.get(`/api/v1/reception/appointments?date=${today}`)).json() as {
    appointments: Array<{ id: string; doctorId: string | null; status: string; service: { consultationMode: string } | null }>;
  };
  for (const appointment of feed.appointments) {
    if (appointment.doctorId !== doctorId) continue;
    if (appointment.service?.consultationMode === "ONLINE") continue;
    if (!["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"].includes(appointment.status)) continue;
    await request.patch(`/api/v1/appointments/${appointment.id}`, { data: { action: "cancel", reason: "Playwright test cleanup" } });
  }
}

/**
 * A start time later today, far outside the dev seed's ~30-minute "live
 * now" online video appointment window, so booking this in-person visit
 * never collides with it (rather than cancelling that appointment, which
 * video-consultation.spec.ts depends on when both files run together).
 */
function laterTodayStartTime(): Date {
  const candidate = new Date(Date.now() + 3 * 60 * 60_000);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 30, 0, 0);
  return candidate > todayEnd ? todayEnd : candidate;
}

test("a patient reception checks in appears in the doctor's real queue and can be called, started and completed", async ({ request }) => {
  await loginAs(request, "reception@wonflow.local");

  const catalog = await (await request.get("/api/v1/reception/catalog")).json() as {
    practitioners: Array<{ id: string; displayName: string; primaryBranchId: string }>;
  };
  const doctor = catalog.practitioners.find((item) => item.displayName === "Doctor");
  expect(doctor, "the seeded doctor@wonflow.local practitioner was not found").toBeDefined();

  // Give the doctor an all-day sitting today so booking "now" succeeds
  // regardless of what earlier suites left behind.
  await loginAs(request, "doctor@wonflow.local");
  await request.put("/api/v1/doctor/sittings", {
    data: {
      branchId: doctor!.primaryBranchId,
      businessDate: new Date().toISOString().slice(0, 10),
      startsMinute: 0,
      endsMinute: 1439,
      averageConsultationMinutes: 15,
      status: "AVAILABLE",
    },
  });

  await loginAs(request, "reception@wonflow.local");
  const patientName = `Playwright Queue ${Date.now()}`;
  const registerResponse = await request.post("/api/v1/patients", {
    data: {
      givenName: patientName.split(" ")[0],
      middleName: patientName.split(" ")[1],
      familyName: patientName.split(" ")[2],
      dateOfBirth: "1995-08-13",
      sex: "Male",
      phone: "03001234567",
    },
  });
  expect(registerResponse.status()).toBe(201);
  const { patient } = await registerResponse.json() as { patient: { id: string } };

  await clearDoctorConflicts(request, doctor!.id);
  const startsAt = laterTodayStartTime();
  const endsAt = new Date(startsAt.getTime() + 15 * 60_000);
  const bookResponse = await request.post("/api/v1/appointments", {
    data: {
      patientId: patient.id,
      doctorId: doctor!.id,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      reason: "Playwright doctor-queue test visit",
      source: "reception",
      idempotencyKey: `playwright-doctor-queue-${Date.now()}`,
    },
  });
  expect(bookResponse.status(), await bookResponse.text()).toBe(201);
  const { appointment } = await bookResponse.json() as { appointment: { id: string } };

  const today = new Date().toISOString().slice(0, 10);
  const checkInResponse = await request.post(`/api/v1/appointments/${appointment.id}/check-in`, {
    data: { queueDate: today },
  });
  expect(checkInResponse.status(), await checkInResponse.text()).toBe(200);

  // The doctor's real dashboard must now show this appointment, checked in.
  await loginAs(request, "doctor@wonflow.local");
  const dashboardBeforeResponse = await request.get(`/api/v1/doctor/dashboard?date=${today}`);
  expect(dashboardBeforeResponse.status()).toBe(200);
  const dashboardBefore = await dashboardBeforeResponse.json() as {
    dashboard: { appointments: Array<{ id: string; patient: { givenName: string }; queueEntry: { status: string } | null }> };
  };
  const seenAppointment = dashboardBefore.dashboard.appointments.find((entry) => entry.id === appointment.id);
  expect(seenAppointment, "the doctor's dashboard does not show the appointment reception just checked in").toBeDefined();
  expect(seenAppointment!.queueEntry?.status).toBe("WAITING");

  // Call, start and complete the consultation through the real queue actions.
  const callResponse = await request.patch(`/api/v1/doctor/queue/${appointment.id}`, { data: { action: "call" } });
  expect(callResponse.status(), await callResponse.text()).toBe(200);
  const { appointment: calledAppointment } = await callResponse.json() as { appointment: { queueEntry: { status: string } | null } };
  expect(calledAppointment.queueEntry?.status).toBe("CALLED");

  const startResponse = await request.patch(`/api/v1/doctor/queue/${appointment.id}`, { data: { action: "start" } });
  expect(startResponse.status(), await startResponse.text()).toBe(200);
  const { appointment: startedAppointment } = await startResponse.json() as {
    appointment: { status: string; queueEntry: { status: string } | null; encounter: { id: string; status: string } | null };
  };
  expect(startedAppointment.status).toBe("IN_PROGRESS");
  expect(startedAppointment.queueEntry?.status).toBe("IN_SERVICE");
  expect(startedAppointment.encounter, "starting the consultation should create a real Encounter").toBeDefined();
  expect(startedAppointment.encounter!.status).toBe("IN_PROGRESS");

  const completeResponse = await request.patch(`/api/v1/doctor/queue/${appointment.id}`, { data: { action: "complete" } });
  expect(completeResponse.status(), await completeResponse.text()).toBe(200);
  const { appointment: completedAppointment } = await completeResponse.json() as {
    appointment: { status: string; queueEntry: { status: string } | null; encounter: { status: string } | null };
  };
  expect(completedAppointment.status).toBe("COMPLETED");
  expect(completedAppointment.queueEntry?.status).toBe("COMPLETED");
  expect(completedAppointment.encounter?.status).toBe("COMPLETED");
});

test("the doctor's Today page shows a reception-booked patient", async ({ page, request }) => {
  await loginAs(request, "reception@wonflow.local");
  const catalog = await (await request.get("/api/v1/reception/catalog")).json() as {
    practitioners: Array<{ id: string; displayName: string; primaryBranchId: string }>;
  };
  const doctor = catalog.practitioners.find((item) => item.displayName === "Doctor");
  expect(doctor).toBeDefined();

  await loginAs(request, "doctor@wonflow.local");
  await request.put("/api/v1/doctor/sittings", {
    data: {
      branchId: doctor!.primaryBranchId,
      businessDate: new Date().toISOString().slice(0, 10),
      startsMinute: 0,
      endsMinute: 1439,
      averageConsultationMinutes: 15,
      status: "AVAILABLE",
    },
  });

  await loginAs(request, "reception@wonflow.local");
  const patientName = `Playwright UIQueue ${Date.now()}`;
  const registerResponse = await request.post("/api/v1/patients", {
    data: { givenName: patientName.split(" ")[0], middleName: patientName.split(" ")[1], familyName: patientName.split(" ")[2], dateOfBirth: "1990-01-01", sex: "Female", phone: "03007654321" },
  });
  expect(registerResponse.status()).toBe(201);
  const { patient } = await registerResponse.json() as { patient: { id: string } };
  await clearDoctorConflicts(request, doctor!.id);
  const startsAt = laterTodayStartTime();
  const bookResponse = await request.post("/api/v1/appointments", {
    data: {
      patientId: patient.id,
      doctorId: doctor!.id,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 15 * 60_000).toISOString(),
      reason: "Playwright UI queue visibility test",
      source: "reception",
      idempotencyKey: `playwright-ui-queue-${Date.now()}`,
    },
  });
  expect(bookResponse.status(), await bookResponse.text()).toBe(201);
  const { appointment } = await bookResponse.json() as { appointment: { id: string } };
  const checkInResponse = await request.post(`/api/v1/appointments/${appointment.id}/check-in`, {
    data: { queueDate: new Date().toISOString().slice(0, 10) },
  });
  expect(checkInResponse.status()).toBe(200);

  await loginAs(request, "doctor@wonflow.local");
  await (page as Page).context().addCookies(await request.storageState().then((state) => state.cookies));
  await page.goto("/doctor", { waitUntil: "networkidle" });
  await expect(page.getByText(patientName, { exact: false }).first()).toBeVisible({ timeout: 15_000 });

  // Teardown: cancel the appointment this test created.
  await loginAs(request, "reception@wonflow.local");
  await request.patch(`/api/v1/appointments/${appointment.id}`, { data: { action: "cancel", reason: "Playwright test cleanup" } });
});
