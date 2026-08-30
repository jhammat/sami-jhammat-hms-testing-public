import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

async function loginAs(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status(), `${email} could not authenticate`).toBe(200);
}

/** Book an online consultation as the development patient and return its id. */
async function bookOnlineAppointment(request: APIRequestContext): Promise<string> {
  await loginAs(request, "patient@wonflow.local");

  for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
    const date = new Date(Date.now() + dayOffset * 86_400_000).toISOString().slice(0, 10);
    const catalog = await (await request.get(`/api/v1/patient/booking?date=${date}`)).json();
    // The catalog exposes `consultationModes` as an ARRAY -- a service can
    // be offered both in person and by video, so booking asks which. This
    // used to read a singular `consultationMode`, which no endpoint returns,
    // so the find always missed and every video test failed at setup with
    // "no online consultation slot was available to book".
    const online = (catalog.catalog?.options ?? []).find(
      (option: { consultationModes?: string[] }) =>
        option.consultationModes?.includes("ONLINE") ?? false,
    );
    if (!online) continue;

    // Try EVERY free slot on the rule, not just the first.
    //
    // These tests book real appointments that persist, so on a database
    // that has run the suite before, the earliest slot of each day is
    // already taken and answers 409. Taking only `.find(...)` meant the
    // helper gave up after seven collisions and reported "no online
    // consultation slot was available" when hundreds were free.
    const slots = (catalog.catalog.slots ?? []).filter(
      (item: { ruleId: string }) => item.ruleId === online.ruleId,
    );

    for (const slot of slots) {
      const booked = await request.post("/api/v1/patient/booking", {
        data: { slotId: slot.id, reason: `Video consultation check ${Date.now()}`, idempotencyKey: crypto.randomUUID() },
      });
      if (booked.status() === 201) return (await booked.json()).appointment.id as string;
    }
  }

  throw new Error("no online consultation slot was available to book");
}

test("an online booking exposes a video consultation room to its patient", async ({ page }) => {
  const appointmentId = await bookOnlineAppointment(page.request);

  const response = await page.request.get(`/api/v1/video-consultations/${appointmentId}`);
  expect(response.status()).toBe(200);
  const call = (await response.json()).call;

  expect(call.role).toBe("PATIENT");
  // The doctor initiates the offer; the patient answers.
  expect(call.initiator).toBe(false);
  expect(call.iceServers.length).toBeGreaterThan(0);
  expect(call.appointment.id).toBe(appointmentId);
});

test("the assigned doctor is the call initiator", async ({ page }) => {
  const appointmentId = await bookOnlineAppointment(page.request);

  await loginAs(page.request, "doctor@wonflow.local");
  const response = await page.request.get(`/api/v1/video-consultations/${appointmentId}`);
  expect(response.status()).toBe(200);
  const call = (await response.json()).call;

  expect(call.role).toBe("DOCTOR");
  expect(call.initiator).toBe(true);
});

test("staff who are not on the appointment cannot reach the room", async ({ page }) => {
  const appointmentId = await bookOnlineAppointment(page.request);

  for (const email of ["reception@wonflow.local", "laboratory@wonflow.local", "billing@wonflow.local", "admin@wonflow.local"]) {
    await loginAs(page.request, email);
    const response = await page.request.get(`/api/v1/video-consultations/${appointmentId}`);
    expect(response.status(), `${email} must not reach a consultation room`).toBe(403);

    const signals = await page.request.get(`/api/v1/video-consultations/${appointmentId}/signals`);
    expect(signals.status(), `${email} must not read call signals`).toBe(403);

    const join = await page.request.post(`/api/v1/video-consultations/${appointmentId}`, { data: { action: "join" } });
    expect(join.status(), `${email} must not join the call`).toBe(403);
  }
});

test("anonymous visitors cannot reach a consultation room", async ({ browser }) => {
  const context = await browser.newContext();
  const appointmentId = await bookOnlineAppointment((await browser.newContext()).request).catch(() => null);
  test.skip(!appointmentId, "no online appointment available");

  const response = await context.request.get(`/api/v1/video-consultations/${appointmentId}`);
  // The proxy redirects unauthenticated traffic to the sign-in page.
  expect(response.url()).toContain("/login");
  await context.close();
});

test("an in-person appointment has no video room", async ({ page }) => {
  await loginAs(page.request, "patient@wonflow.local");

  let inPersonId: string | null = null;
  for (let dayOffset = 1; dayOffset <= 7 && !inPersonId; dayOffset += 1) {
    const date = new Date(Date.now() + dayOffset * 86_400_000).toISOString().slice(0, 10);
    const catalog = await (await page.request.get(`/api/v1/patient/booking?date=${date}`)).json();
    const inPerson = (catalog.catalog?.options ?? []).find(
      (option: { consultationModes?: string[] }) =>
        option.consultationModes?.includes("IN_PERSON") ?? false,
    );
    if (!inPerson) continue;
    const slots = (catalog.catalog.slots ?? []).filter(
      (item: { ruleId: string }) => item.ruleId === inPerson.ruleId,
    );

    for (const slot of slots) {
      const booked = await page.request.post("/api/v1/patient/booking", {
        data: { slotId: slot.id, reason: "In-person check", idempotencyKey: crypto.randomUUID() },
      });
      if (booked.status() === 201) {
        inPersonId = (await booked.json()).appointment.id;
        break;
      }
    }
  }

  expect(inPersonId, "no in-person slot was available to book").toBeTruthy();
  const response = await page.request.get(`/api/v1/video-consultations/${inPersonId}`);
  expect(response.status()).toBe(409);
  expect((await response.json()).error).toMatch(/not an online consultation/i);
});

test("call signals are rejected before the participant joins", async ({ page }) => {
  const appointmentId = await bookOnlineAppointment(page.request);

  const response = await page.request.post(`/api/v1/video-consultations/${appointmentId}/signals`, {
    data: { type: "SDP_OFFER", payload: { type: "offer", sdp: "v=0" } },
  });
  // Future appointment: the room has not opened, so signalling is refused.
  expect([409, 400]).toContain(response.status());
});

test("the consultation room page renders for its patient", async ({ page }) => {
  const appointmentId = await bookOnlineAppointment(page.request);

  const response = await page.goto(`/patient/appointments/${appointmentId}/video`, { waitUntil: "networkidle" });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1, name: /Online Video Consultation/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("body")).not.toContainText("Application error");
  // Media capture must not start before the user opts in, so the join
  // affordance has to be present and unpressed. The button reads "Join Video
  // Consultation"; this matched on /Join consultation/i, which the word
  // "Video" sitting between the two halves stops from ever matching.
  await expect(page.getByRole("button", { name: /Join .*consultation/i })).toBeVisible();
});

/** The seed keeps one online appointment live so the room is joinable. */
async function findLiveAppointment(request: APIRequestContext): Promise<string | null> {
  await loginAs(request, "doctor@wonflow.local");
  const response = await request.get("/api/v1/doctor/appointments");
  if (response.status() !== 200) return null;
  const appointments = (await response.json()).appointments as Array<{
    id: string; consultationMode: string; startsAt: string; endsAt: string; status: string;
  }>;
  const now = Date.now();
  return appointments.find((appointment) =>
    appointment.consultationMode === "ONLINE" &&
    !["CANCELLED", "NO_SHOW"].includes(appointment.status) &&
    new Date(appointment.startsAt).getTime() - 15 * 60_000 <= now &&
    new Date(appointment.endsAt).getTime() + 60 * 60_000 >= now)?.id ?? null;
}

test("doctor and patient exchange WebRTC signals through the live room", async ({ browser }) => {
  const doctorContext = await browser.newContext();
  const patientContext = await browser.newContext();

  const appointmentId = await findLiveAppointment(doctorContext.request);
  expect(appointmentId, "the seed did not leave a live online appointment").toBeTruthy();

  // Doctor joins and publishes the offer.
  await loginAs(doctorContext.request, "doctor@wonflow.local");
  const doctorJoin = await doctorContext.request.post(`/api/v1/video-consultations/${appointmentId}`, { data: { action: "join" } });
  expect(doctorJoin.status()).toBe(200);

  const offer = { type: "offer", sdp: `v=0\r\no=- ${Date.now()} 2 IN IP4 127.0.0.1\r\n` };
  const sentOffer = await doctorContext.request.post(`/api/v1/video-consultations/${appointmentId}/signals`, {
    data: { type: "SDP_OFFER", payload: offer },
  });
  expect(sentOffer.status()).toBe(201);

  // Patient joins and receives the doctor's offer, not their own traffic.
  await loginAs(patientContext.request, "patient@wonflow.local");
  const patientJoin = await patientContext.request.post(`/api/v1/video-consultations/${appointmentId}`, { data: { action: "join" } });
  expect(patientJoin.status()).toBe(200);
  expect((await patientJoin.json()).session.status).toBe("ACTIVE");

  const inbound = await patientContext.request.get(`/api/v1/video-consultations/${appointmentId}/signals`);
  expect(inbound.status()).toBe(200);
  const received = (await inbound.json()).signals as Array<{ signalType: string; senderRole: string; payload: { sdp?: string } }>;
  const receivedOffer = received.find((signal) => signal.signalType === "SDP_OFFER");
  expect(receivedOffer, "the patient never received the doctor's offer").toBeTruthy();
  expect(receivedOffer!.senderRole).toBe("DOCTOR");
  expect(receivedOffer!.payload.sdp).toBe(offer.sdp);

  // A participant must never be fed their own signals back.
  expect(received.every((signal) => signal.senderRole === "DOCTOR")).toBe(true);

  // Patient answers; the doctor receives it.
  const answer = { type: "answer", sdp: `v=0\r\no=- ${Date.now()} 3 IN IP4 127.0.0.1\r\n` };
  expect((await patientContext.request.post(`/api/v1/video-consultations/${appointmentId}/signals`, {
    data: { type: "SDP_ANSWER", payload: answer },
  })).status()).toBe(201);

  const doctorInbound = await doctorContext.request.get(`/api/v1/video-consultations/${appointmentId}/signals`);
  const doctorSignals = (await doctorInbound.json()).signals as Array<{ signalType: string; senderRole: string }>;
  expect(doctorSignals.some((signal) => signal.signalType === "SDP_ANSWER" && signal.senderRole === "PATIENT")).toBe(true);

  // Ending the call closes the session for both sides.
  const ended = await doctorContext.request.post(`/api/v1/video-consultations/${appointmentId}`, { data: { action: "end" } });
  expect(ended.status()).toBe(200);
  expect((await ended.json()).session.status).toBe("ENDED");

  const afterEnd = await patientContext.request.post(`/api/v1/video-consultations/${appointmentId}/signals`, {
    data: { type: "ICE_CANDIDATE", payload: { candidate: "candidate:0 1 UDP" } },
  });
  expect(afterEnd.status(), "signalling must stop once the call has ended").toBe(409);

  await doctorContext.close();
  await patientContext.close();
});

test("oversized call signals are rejected", async ({ page }) => {
  const appointmentId = await findLiveAppointment(page.request);
  test.skip(!appointmentId, "no live online appointment available");

  await loginAs(page.request, "doctor@wonflow.local");
  await page.request.post(`/api/v1/video-consultations/${appointmentId}`, { data: { action: "join" } });

  const response = await page.request.post(`/api/v1/video-consultations/${appointmentId}/signals`, {
    data: { type: "ICE_CANDIDATE", payload: { candidate: "x".repeat(70_000) } },
  });
  expect(response.status()).toBe(413);
});

test("camera and microphone are permitted for this origin", async ({ page }) => {
  const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
  const policy = response!.headers()["permissions-policy"] ?? "";
  // `camera=()` would block getUserMedia before the browser prompt appears.
  expect(policy).toContain("camera=(self)");
  expect(policy).toContain("microphone=(self)");
});
