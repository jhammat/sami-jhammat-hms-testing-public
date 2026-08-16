import { expect, test } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

const portals = [
  { email: "platform@wonflow.local", home: "/platform", routes: ["/platform", "/platform/organizations", "/platform/entitlements", "/platform/subscriptions", "/platform/support", "/platform/audit", "/platform/settings"] },
  { email: "admin@wonflow.local", home: "/admin", routes: ["/admin", "/admin/setup", "/admin/locations", "/admin/services", "/admin/users", "/admin/doctors", "/admin/team", "/admin/policies", "/admin/content", "/admin/audit", "/admin/settings"] },
  { email: "reception@wonflow.local", home: "/operations/reception", routes: ["/operations/reception", "/operations/patients", "/operations/patients/register", "/operations/appointments", "/operations/appointments/new"] },
  { email: "doctor@wonflow.local", home: "/doctor", routes: ["/doctor", "/doctor/appointments", "/doctor/schedule", "/doctor/patients", "/doctor/consultations", "/doctor/documents", "/doctor/results", "/doctor/radiology-results", "/doctor/follow-ups", "/doctor/profile", "/doctor/settings"] },
  { email: "patient@wonflow.local", home: "/patient", routes: ["/patient", "/patient/appointments", "/patient/appointments/book", "/patient/documents", "/patient/documents/upload", "/notifications"] },
  { email: "laboratory@wonflow.local", home: "/operations/laboratory", routes: ["/operations/laboratory"] },
  { email: "radiology@wonflow.local", home: "/operations/radiology", routes: ["/operations/radiology"] },
  { email: "pharmacy@wonflow.local", home: "/operations/pharmacy", routes: ["/operations/pharmacy", "/operations/pharmacy/inventory", "/operations/pharmacy/returns"] },
  { email: "billing@wonflow.local", home: "/operations/billing", routes: ["/operations/billing/new", "/operations/billing/refunds"] },
  { email: "management@wonflow.local", home: "/management", routes: ["/management"] },
] as const;

for (const portal of portals) {
  test(`${portal.email} can open its Phase 1 portal routes`, async ({ page }) => {
    test.slow();
    const loginResponse = await page.request.post("/api/auth/login", {
      data: { email: portal.email, password },
    });
    expect(loginResponse.status(), `${portal.email} could not authenticate`).toBe(200);
    expect((await loginResponse.json()).homePath).toBe(portal.home);

    // The declared homePath itself must actually load — a string match
    // above is not proof of that; a login landing page 404ing (as
    // /operations/billing once did) would pass the check above unnoticed.
    for (const route of [portal.home, ...portal.routes]) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response, `${route} did not return a document response`).not.toBeNull();
      expect(response?.status(), `${route} returned an HTTP error`).toBeLessThan(400);
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
      await expect(page.locator("body")).not.toContainText("This page could not be found");
      await expect(page.locator("body")).not.toContainText("First-release workspace");
    }
  });
}

const hiddenPhaseTwoRoutes = [
  { email: "reception@wonflow.local", route: "/operations/queue" },
  { email: "doctor@wonflow.local", route: "/doctor/queue" },
  { email: "doctor@wonflow.local", route: "/doctor/inpatients" },
  { email: "reception@wonflow.local", route: "/operations/inpatient/wards" },
  { email: "reception@wonflow.local", route: "/operations/insurance" },
  { email: "reception@wonflow.local", route: "/operations/surgery/operation-theatre" },
  { email: "reception@wonflow.local", route: "/operations/blood-bank" },
] as const;

for (const hidden of hiddenPhaseTwoRoutes) {
  test(`${hidden.route} stays hidden outside Phase 1 scope`, async ({ page }) => {
    const loginResponse = await page.request.post("/api/auth/login", {
      data: { email: hidden.email, password },
    });
    expect(loginResponse.status()).toBe(200);

    await page.goto(hidden.route, { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText("This page could not be found");
  });
}

test("anonymous users are redirected away from protected portals", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
});

/**
 * Route smoke coverage above only inspects server-rendered markup, so it stays
 * green even when React never hydrates and the whole product is inert. These
 * two tests assert the client actually takes over.
 */
test("the client bundle hydrates and attaches React to the document", async ({ page }) => {
  await page.goto("/login", { waitUntil: "load" });

  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          [...document.querySelectorAll("body *")].filter((element) =>
            Object.keys(element).some((key) => key.startsWith("__reactFiber$")),
          ).length,
        ),
      { message: "React never hydrated the server-rendered markup", timeout: 20_000 },
    )
    .toBeGreaterThan(0);
});

test("a portal screen resolves its client-loaded data instead of hanging on a loader", async ({ page }) => {
  const loginResponse = await page.request.post("/api/auth/login", {
    data: { email: "patient@wonflow.local", password },
  });
  expect(loginResponse.status()).toBe(200);

  const worklistRequest = page.waitForRequest(
    (request) => request.url().includes("/api/v1/patient/home"),
    { timeout: 20_000 },
  );

  await page.goto("/patient", { waitUntil: "load" });
  await worklistRequest;

  // The medical record number only reaches the DOM once the client fetch resolves.
  await expect(page.getByText(/Medical record DEV-0001/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("body")).not.toContainText("Loading your secure care record");
});

test("patient profile persists and booking data is available to the authenticated patient", async ({ page }) => {
  const loginResponse = await page.request.post("/api/auth/login", {
    data: { email: "patient@wonflow.local", password },
  });
  expect(loginResponse.status()).toBe(200);

  const profileResponse = await page.request.get("/api/v1/patient/profile");
  expect(profileResponse.status()).toBe(200);
  const profileBody = await profileResponse.json();
  const patient = profileBody.home.patient;

  const updateResponse = await page.request.put("/api/v1/patient/profile", {
    data: {
      givenName: patient.givenName,
      middleName: patient.middleName,
      familyName: patient.familyName,
      dateOfBirth: patient.dateOfBirth?.slice(0, 10) ?? "",
      sex: patient.sex,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      guardianData: patient.guardianData,
      consentData: patient.consentData,
    },
  });
  expect(updateResponse.status()).toBe(200);

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const bookingResponse = await page.request.get(`/api/v1/patient/booking?date=${tomorrow}`);
  expect(bookingResponse.status()).toBe(200);
  const bookingBody = await bookingResponse.json();
  expect(bookingBody.catalog).toEqual(expect.objectContaining({ options: expect.any(Array), slots: expect.any(Array) }));
  expect(bookingBody.appointments).toEqual(expect.any(Array));
});

test("reception receives the shared appointment feed", async ({ page }) => {
  const loginResponse = await page.request.post("/api/auth/login", {
    data: { email: "reception@wonflow.local", password },
  });
  expect(loginResponse.status()).toBe(200);
  const response = await page.request.get("/api/v1/reception/appointments");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.appointments).toEqual(expect.any(Array));
});

test("video consultation endpoints require a real authorized online appointment", async ({ page }) => {
  const loginResponse = await page.request.post("/api/auth/login", {
    data: { email: "patient@wonflow.local", password },
  });
  expect(loginResponse.status()).toBe(200);
  const response = await page.request.get("/api/v1/video-consultations/00000000-0000-4000-8000-000000000000");
  expect(response.status()).toBe(404);
});

test("doctor appointment feed is live and role protected", async ({ page }) => {
  const loginResponse = await page.request.post("/api/auth/login", {
    data: { email: "doctor@wonflow.local", password },
  });
  expect(loginResponse.status()).toBe(200);
  const response = await page.request.get("/api/v1/doctor/appointments");
  expect(response.status()).toBe(200);
  expect((await response.json()).appointments).toEqual(expect.any(Array));
});


/**
 * Cross-role use case: a patient books a published slot through the portal UI
 * and the same appointment reaches the reception desk feed. Requires the
 * development seed, which publishes a bookable consultation service.
 */
test("a patient books through the portal and reception sees the appointment", async ({ page }) => {
  const patientLogin = await page.request.post("/api/auth/login", {
    data: { email: "patient@wonflow.local", password },
  });
  expect(patientLogin.status()).toBe(200);

  await page.goto("/patient/appointments/book", { waitUntil: "load" });

  const dateInput = page.locator("input[type='date']").first();
  const scheduleSelect = page.locator("select").first();
  // The select itself (with just its placeholder option) must render before
  // anything else here can work -- this only confirms the page loaded, not
  // that the default date has a published service (a specific weekday can
  // legitimately have none, e.g. a doctor with no Sunday clinic).
  await expect
    .poll(async () => scheduleSelect.locator("option").count(), {
      message: "the booking page never rendered a schedule selector",
      timeout: 20_000,
    })
    .toBeGreaterThan(0);

  /**
   * Several services can be published and earlier tests consume slots, and a
   * given weekday may have no published service at all, so walk forward
   * through days (starting from today's default date) until an available
   * time is found rather than assuming tomorrow's first schedule is free.
   */
  const slotButton = page.getByRole("button", { name: /^\d{1,2}:\d{2}\s?(AM|PM)$/i });
  let bookedTime = "";
  let bookingDate = await dateInput.inputValue();

  for (let dayOffset = 0; dayOffset <= 7 && !bookedTime; dayOffset += 1) {
    if (dayOffset > 0) {
      bookingDate = new Date(Date.now() + dayOffset * 86_400_000).toISOString().slice(0, 10);
      await dateInput.fill(bookingDate);
      await page.waitForTimeout(600);
    }

    const optionCount = await scheduleSelect.locator("option").count();
    for (let index = 1; index < optionCount; index += 1) {
      const value = await scheduleSelect.locator("option").nth(index).getAttribute("value");
      if (!value) continue;
      await scheduleSelect.selectOption(value);
      await page.waitForTimeout(400);
      if (await slotButton.count() > 0) {
        bookedTime = (await slotButton.first().textContent())?.trim() ?? "";
        await slotButton.first().click();
        break;
      }
    }
  }

  expect(bookedTime, "no published schedule had an available time to book").not.toBe("");

  const reason = `Playwright booking check ${Date.now()}`;
  await page.locator("textarea[name='reason']").fill(reason);
  await page.getByRole("button", { name: /Confirm appointment/i }).click();

  await expect(page.getByText(/Appointment confirmed/i)).toBeVisible({ timeout: 30_000 });

  // The same booking must be visible to reception on the booked day.
  const receptionLogin = await page.request.post("/api/auth/login", {
    data: { email: "reception@wonflow.local", password },
  });
  expect(receptionLogin.status()).toBe(200);

  const feed = await page.request.get(`/api/v1/reception/appointments?date=${bookingDate}`);
  expect(feed.status()).toBe(200);
  const feedBody = await feed.json();
  const reasons = (feedBody.appointments as Array<{ reason: string | null }>).map((item) => item.reason);
  expect(reasons, `reception feed for ${bookingDate} did not contain the ${bookedTime} booking`).toContain(reason);
});
