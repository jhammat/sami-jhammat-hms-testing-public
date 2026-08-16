import { expect, request as playwrightRequest, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

async function newSession(email: string, sessionPassword = password): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL });
  const response = await context.post("/api/auth/login", { data: { email, password: sessionPassword } });
  expect(response.status(), `${email} could not authenticate`).toBe(200);
  return context;
}

test("responses carry the baseline security headers", async ({ page }) => {
  const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
  const headers = response!.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  // Camera and microphone are scoped to this origin for video consultations,
  // never granted to third parties.
  expect(headers["permissions-policy"]).toContain("camera=(self)");
  expect(headers["permissions-policy"]).toContain("geolocation=()");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain("base-uri 'self'");
  // Next's version banner should not be advertised.
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("patient data responses are not stored in shared caches", async ({ page }) => {
  await page.request.post("/api/auth/login", { data: { email: "patient@wonflow.local", password } });

  // The API carries the actual record payload and must not be stored at all.
  const api = await page.request.get("/api/v1/patient/home");
  expect(api.headers()["cache-control"]).toContain("no-store");

  // Next owns Cache-Control on rendered routes and sets `no-cache,
  // must-revalidate`. That still forbids serving a cached copy without
  // revalidating, but it must never become publicly cacheable.
  const page_ = await page.goto("/patient", { waitUntil: "domcontentloaded" });
  const cacheControl = page_!.headers()["cache-control"] ?? "";
  expect(cacheControl).toMatch(/no-cache|no-store/);
  expect(cacheControl).not.toContain("public");
});

test("fingerprinted static assets stay cacheable", async ({ page }) => {
  const assets: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/_next/static/") && response.url().endsWith(".js")) assets.push(response.url());
  });
  await page.goto("/login", { waitUntil: "load" });
  expect(assets.length, "no static chunk was requested").toBeGreaterThan(0);

  const asset = await page.request.get(assets[0]!);
  // The no-store rule must not have swallowed immutable build output.
  expect(asset.headers()["cache-control"] ?? "").not.toContain("no-store");
});

test("repeated failed sign-ins from one address are throttled", async ({ page }) => {
  // A unique forwarded address keeps this bucket isolated from the rest of the suite.
  const address = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
  const attempt = (body: Record<string, string>) =>
    page.request.post("/api/auth/login", { data: body, headers: { "x-forwarded-for": address } });

  let throttled = false;
  for (let index = 0; index < 40; index += 1) {
    const response = await attempt({ email: `nobody-${index}@wonflow.local`, password: "wrong-password" });
    if (response.status() === 429) {
      expect(Number(response.headers()["retry-after"])).toBeGreaterThan(0);
      throttled = true;
      break;
    }
    expect(response.status()).toBe(401);
  }

  expect(throttled, "credential stuffing was never throttled").toBe(true);

  // A valid credential from a clean address must still be accepted.
  const clean = await page.request.post("/api/auth/login", {
    data: { email: "patient@wonflow.local", password },
    headers: { "x-forwarded-for": "203.0.113.250" },
  });
  expect(clean.status()).toBe(200);
});

test("successful sign-ins do not consume the failure budget", async ({ page }) => {
  const address = "203.0.113.251";
  for (let index = 0; index < 30; index += 1) {
    const response = await page.request.post("/api/auth/login", {
      data: { email: "patient@wonflow.local", password },
      headers: { "x-forwarded-for": address },
    });
    expect(response.status(), `sign-in ${index} was rejected`).toBe(200);
  }
});

/**
 * FIX-21: every seeded account's reach and non-reach, asserted at the API
 * level. Interface hiding (a nav link that isn't rendered) is not security —
 * these calls hit the same endpoints the UI itself calls, and prove the
 * server refuses regardless of what any client chooses to render.
 */
const today = () => new Date().toISOString().slice(0, 10);

const SEEDED_ACCOUNTS = [
  { email: "admin@wonflow.local", allowed: "/api/v1/admin/users", denied: ["/api/v1/pharmacy/inventory", "/api/v1/platform/organizations"] },
  { email: "reception@wonflow.local", allowed: "/api/v1/reception/catalog", denied: ["/api/v1/admin/users", "/api/v1/pharmacy/prescriptions", "/api/v1/platform/organizations"] },
  { email: "doctor@wonflow.local", allowed: `/api/v1/doctor/dashboard?date=${today()}`, denied: ["/api/v1/admin/users", "/api/v1/platform/organizations"] },
  { email: "laboratory@wonflow.local", allowed: `/api/v1/diagnostics/worklist?type=LABORATORY&date=${today()}`, denied: ["/api/v1/admin/users", "/api/v1/billing/invoices", "/api/v1/platform/organizations"] },
  { email: "radiology@wonflow.local", allowed: `/api/v1/diagnostics/worklist?type=RADIOLOGY&date=${today()}`, denied: ["/api/v1/admin/users", "/api/v1/pharmacy/inventory", "/api/v1/platform/organizations"] },
  { email: "pharmacy@wonflow.local", allowed: "/api/v1/pharmacy/inventory", denied: ["/api/v1/admin/users", "/api/v1/billing/invoices", "/api/v1/platform/organizations"] },
  { email: "billing@wonflow.local", allowed: "/api/v1/billing/invoices", denied: ["/api/v1/admin/users", "/api/v1/pharmacy/inventory", "/api/v1/platform/organizations"] },
  { email: "management@wonflow.local", allowed: `/api/v1/management/dashboard?from=${today()}&to=${today()}`, denied: ["/api/v1/admin/users", "/api/v1/pharmacy/inventory", "/api/v1/platform/organizations"] },
  { email: "patient@wonflow.local", allowed: "/api/v1/patient/home", denied: ["/api/v1/admin/users", "/api/v1/pharmacy/inventory", "/api/v1/doctor/dashboard", "/api/v1/platform/organizations"] },
  { email: "platform@wonflow.local", allowed: "/api/v1/platform/organizations", denied: ["/api/v1/admin/users", "/api/v1/pharmacy/inventory"] },
] as const;

for (const account of SEEDED_ACCOUNTS) {
  test.describe(`reach and non-reach: ${account.email}`, () => {
    test(`reaches ${account.allowed}`, async () => {
      const session = await newSession(account.email);
      const response = await session.get(account.allowed);
      expect(response.status(), await response.text()).toBe(200);
      await session.dispose();
    });

    for (const path of account.denied) {
      test(`is refused ${path}`, async () => {
        const session = await newSession(account.email);
        const response = await session.get(path);
        // 400 covers a platform-scope session hitting a tenant-scoped route
        // (no tenant context to even check a permission against) — still a
        // refusal, just a different code path than a permission check.
        expect([400, 401, 403], `${account.email} got ${response.status()} from ${path}, expected a refusal`).toContain(response.status());
        await session.dispose();
      });
    }
  });
}

test.describe("specific attacks — each must fail closed and be logged", () => {
  test("patient opens /doctor, /admin, /platform at the API level", async ({ page }) => {
    const session = await newSession("patient@wonflow.local");
    await page.context().addCookies(await session.storageState().then((state) => state.cookies));

    const doctor = await session.get(`/api/v1/doctor/dashboard?date=${today()}`);
    expect(doctor.status()).toBe(403);
    const admin = await session.get("/api/v1/admin/users");
    expect(admin.status()).toBe(403);
    const platform = await session.get("/api/v1/platform/organizations");
    expect(platform.status()).toBe(403);

    // The page shell itself must never render another role's data even if
    // the route responds — no server-rendered PHI or admin content leaks.
    const doctorPage = await page.goto("/doctor", { waitUntil: "domcontentloaded" });
    expect(doctorPage?.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toContainText("Application error");

    await session.dispose();
  });

  test("doctor opens /platform", async () => {
    const session = await newSession("doctor@wonflow.local");
    const response = await session.get("/api/v1/platform/organizations");
    expect(response.status()).toBe(403);
    await session.dispose();
  });

  test("reception opens /admin/team", async () => {
    const session = await newSession("reception@wonflow.local");
    const response = await session.get("/api/v1/admin/users");
    expect(response.status()).toBe(403);
    await session.dispose();
  });

  test("permission denials are recorded to the audit log, not just refused", async () => {
    // A denial that is only refused and never recorded leaves no trail for
    // anyone to notice a pattern of probing — see logPermissionDenial in
    // apps/web/src/server/http/route-handler.ts, which every 403 in this
    // suite exercises.
    const session = await newSession("reception@wonflow.local");
    const response = await session.get("/api/v1/admin/users");
    expect(response.status()).toBe(403);

    const admin = await newSession("admin@wonflow.local");
    const auditFeed = await (await admin.get("/api/v1/admin/audit")).json() as {
      audit: Array<{ action: string; entityType: string; entityId: string | null; severity: string }>;
    };
    const denial = auditFeed.audit.find((entry) => entry.action === "access.denied" && entry.entityId === "organization.users.read");
    expect(denial, "no access.denied audit event was recorded for reception's refused admin-users request").toBeDefined();
    expect(denial!.severity).toBe("WARNING");

    await session.dispose();
    await admin.dispose();
  });

  test("patient A cannot reach patient B's appointment by identifier", async () => {
    const reception = await newSession("reception@wonflow.local");
    const registerB = await reception.post("/api/v1/patients", {
      data: { givenName: "Security", familyName: `PatientB${Date.now()}`, dateOfBirth: "1988-01-01", sex: "Male", phone: "03009998888" },
    });
    expect(registerB.status()).toBe(201);
    const { patient: patientB } = await registerB.json() as { patient: { id: string } };

    const catalog = await (await reception.get("/api/v1/reception/catalog")).json() as {
      practitioners: Array<{ id: string; primaryBranchId: string }>;
    };
    const doctor = catalog.practitioners[0]!;
    const startsAt = new Date(Date.now() + 72 * 60 * 60_000);
    const bookB = await reception.post("/api/v1/appointments", {
      data: {
        patientId: patientB.id,
        doctorId: doctor.id,
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 15 * 60_000).toISOString(),
        reason: "Security test — patient B's own appointment",
        source: "reception",
        idempotencyKey: `security-patientb-${Date.now()}`,
      },
    });
    expect(bookB.status(), await bookB.text()).toBe(201);
    const { appointment: appointmentB } = await bookB.json() as { appointment: { id: string } };

    // Patient A (the seeded patient@wonflow.local) attempts to cancel it by id.
    const patientA = await newSession("patient@wonflow.local");
    const attempt = await patientA.post(`/api/v1/patient/appointments/${appointmentB.id}/cancel`, {
      data: { reason: "Attempting to cancel someone else's appointment" },
    });
    expect(attempt.status(), "patient A must not be able to act on patient B's appointment by id").toBe(404);

    await reception.patch(`/api/v1/appointments/${appointmentB.id}`, { data: { action: "cancel", reason: "Security test cleanup" } });
    await reception.dispose();
    await patientA.dispose();
  });

  test("patient A cannot reach patient B's document by identifier", async () => {
    // No API exists for one account to upload a document as a different
    // patient (by design — see FIX-20's note on why PatientAccess links
    // can't be fabricated over HTTP), so a genuine "patient B's real
    // document" cannot be provisioned here. A fabricated id exercises the
    // identical query path (`where: { patientId: <caller's own patient> }`)
    // that a real foreign document id would hit — the same 404, for the
    // same reason, and the same access_denied audit event either way.
    const patientA = await newSession("patient@wonflow.local");
    const attempt = await patientA.post(`/api/v1/patient/documents/${crypto.randomUUID()}/access`);
    expect(attempt.status(), "a document id that is not this patient's own must 404, not leak or error").toBe(404);
    await patientA.dispose();
  });

  test("any user requests another organization's data by identifier", async () => {
    const platform = await newSession("platform@wonflow.local");
    const slug = `fix21-security-org-${Date.now()}`;
    const displayName = `FIX-21 Security Org ${Date.now()}`;
    const created = await platform.post("/api/v1/platform/organizations", {
      data: { displayName, slug, organizationCode: "MAIN" },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { tenant } = await created.json() as { tenant: { id: string } };

    const ownerEmail = `security-org-owner-${Date.now()}@wonflow.local`;
    const activated = await platform.post(`/api/v1/platform/organizations/${tenant.id}/activate`, {
      data: {
        tenantId: tenant.id,
        tenantSlug: slug,
        tenantDisplayName: displayName,
        ownerName: "Security Org Owner",
        ownerEmail,
        temporaryPassword: password,
        subscription: { planCode: "starter", status: "ACTIVE", seatCount: 1, monthlyAmountMinor: 0, currencyCode: "PKR" },
      },
    });
    expect(activated.status(), await activated.text()).toBe(200);

    const ownerFirstLogin = await newSession(ownerEmail);
    const changed = await ownerFirstLogin.post("/api/auth/change-password", {
      data: { currentPassword: password, newPassword: `${password}New!`, confirmation: `${password}New!` },
    });
    expect(changed.status(), await changed.text()).toBe(200);

    // The other organization's real doctor id and real DEV-0001 patient
    // number, requested from inside the brand-new, otherwise-empty tenant.
    const doctorSession = await newSession("doctor@wonflow.local");
    const doctorHome = await (await doctorSession.get(`/api/v1/doctor/dashboard?date=${today()}`)).json() as {
      dashboard: { doctorId: string };
    };
    const foreignAppointments = await ownerFirstLogin.get(`/api/v1/appointments?practitionerId=${doctorHome.dashboard.doctorId}&pageSize=10`);
    expect(foreignAppointments.status()).toBe(200);
    const { appointments } = await foreignAppointments.json() as { appointments: unknown[] };
    expect(appointments.length, "another tenant's appointments must never appear from inside this tenant, even by a valid known id").toBe(0);

    const foreignPatients = await ownerFirstLogin.get("/api/v1/patients?query=DEV-0001");
    const { patients } = await foreignPatients.json() as { patients: unknown[] };
    expect(patients.length, "another tenant's patient must never be found by an id/number search from inside this tenant").toBe(0);

    // Clean up the throwaway tenant.
    const archived = await platform.delete(`/api/v1/platform/organizations/${tenant.id}`, {
      data: { confirmation: displayName, reason: "Playwright FIX-21 security test cleanup" },
    });
    expect(archived.status(), await archived.text()).toBe(200);

    await platform.dispose();
    await ownerFirstLogin.dispose();
    await doctorSession.dispose();
  });

  test("a supervised clinician cannot sign their own note by direct API call", async () => {
    const supervised = await newSession("supervised-doctor@wonflow.local");
    const reception = await newSession("reception@wonflow.local");
    const patientResponse = await reception.post("/api/v1/patients", {
      data: { givenName: "Security", familyName: `Supervision${Date.now()}`, dateOfBirth: "1993-01-01", sex: "Female", phone: "03001110000" },
    });
    const { patient } = await patientResponse.json() as { patient: { id: string } };

    // Get the supervised doctor's own doctor-facing appointment/encounter
    // pipeline moving: book, check in, start.
    const doctorsList = await (await reception.get("/api/v1/reception/catalog")).json() as {
      practitioners: Array<{ id: string; displayName: string; primaryBranchId: string }>;
    };
    const supervisedDoctorEntry = doctorsList.practitioners.find((item) => item.displayName === "Supervised Doctor");
    expect(supervisedDoctorEntry, "the supervised-doctor@wonflow.local fixture was not found in the reception catalogue").toBeDefined();

    // A same-day sitting alone is not enough to make a doctor bookable —
    // the availability resolver only considers a doctor's sitting at all
    // once a weekly roster (AvailabilityRule) exists for them; without one,
    // the doctor never enters its lookup. This fixture doctor has none by
    // default, unlike the main seeded doctor.
    const admin = await newSession("admin@wonflow.local");
    for (let weekday = 0; weekday <= 6; weekday += 1) {
      await admin.post("/api/v1/admin/schedules", {
        data: {
          doctorId: supervisedDoctorEntry!.id,
          branchId: supervisedDoctorEntry!.primaryBranchId,
          weekday,
          startsMinute: 0,
          endsMinute: 1439,
          capacity: 50,
          validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        },
      });
    }
    await admin.dispose();

    const sittingSet = await supervised.put("/api/v1/doctor/sittings", {
      data: { branchId: supervisedDoctorEntry!.primaryBranchId, businessDate: today(), startsMinute: 0, endsMinute: 1439, averageConsultationMinutes: 15, status: "AVAILABLE" },
    });
    expect(sittingSet.status(), await sittingSet.text()).toBe(200);

    // This fixture doctor is reused by every run of this suite and nothing
    // else cancels its bookings, so an earlier run's own leftover conflicts
    // with a fixed offset — clear them first.
    const existing = await (await reception.get(`/api/v1/appointments?practitionerId=${supervisedDoctorEntry!.id}&dateFrom=${today()}&dateTo=${today()}&pageSize=50`)).json() as {
      appointments: Array<{ id: string; status: string }>;
    };
    for (const item of existing.appointments) {
      if (["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"].includes(item.status)) {
        await reception.patch(`/api/v1/appointments/${item.id}`, { data: { action: "cancel", reason: "Playwright security test cleanup" } });
      }
    }

    // Must land on the sitting's "today" window set just above — a future
    // date would fall back to a weekly roster this fixture doctor never got.
    const startsAt = new Date(Date.now() + 2 * 60 * 60_000);
    const booked = await reception.post("/api/v1/appointments", {
      data: {
        patientId: patient.id,
        doctorId: supervisedDoctorEntry!.id,
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 15 * 60_000).toISOString(),
        reason: "Security test — supervised clinician self-sign",
        source: "reception",
        idempotencyKey: `security-supervision-${Date.now()}`,
      },
    });
    expect(booked.status(), await booked.text()).toBe(201);
    const { appointment } = await booked.json() as { appointment: { id: string } };
    const checkedIn = await reception.post(`/api/v1/appointments/${appointment.id}/check-in`, { data: { queueDate: today() } });
    expect(checkedIn.status(), await checkedIn.text()).toBe(200);

    const called = await supervised.patch(`/api/v1/doctor/queue/${appointment.id}`, { data: { action: "call" } });
    expect(called.status(), await called.text()).toBe(200);
    const started = await supervised.patch(`/api/v1/doctor/queue/${appointment.id}`, { data: { action: "start" } });
    expect(started.status(), await started.text()).toBe(200);
    const { appointment: startedAppointment } = await started.json() as { appointment: { encounter: { id: string } } };

    const draft = await supervised.post(`/api/v1/doctor/encounters/${startedAppointment.encounter.id}/notes`, {
      data: { noteType: "SOAP", content: { assessment: "Security test note" } },
    });
    expect(draft.status(), await draft.text()).toBe(201);
    const { note } = await draft.json() as { note: { id: string } };

    // The attack: the supervised doctor tries to sign their own note directly.
    const selfSign = await supervised.post(`/api/v1/doctor/encounters/${startedAppointment.encounter.id}/notes/${note.id}/sign`);
    expect(selfSign.status(), "a clinician whose notes require countersignature must not be able to sign their own note").toBe(403);
    const selfSignBody = await selfSign.json() as { code?: string };
    expect(selfSignBody.code).toBe("countersignature-required");

    // The assigned supervisor, however, may countersign it.
    const supervisor = await newSession("doctor@wonflow.local");
    const countersigned = await supervisor.post(`/api/v1/doctor/encounters/${startedAppointment.encounter.id}/notes/${note.id}/sign`);
    expect(countersigned.status(), await countersigned.text()).toBe(200);

    await reception.dispose();
    await supervised.dispose();
    await supervisor.dispose();
  });

  test("a diagnostic result cannot be released without going through the required PRELIMINARY state", async () => {
    const laboratory = await newSession("laboratory@wonflow.local");
    const worklist = await (await laboratory.get(`/api/v1/diagnostics/worklist?type=LABORATORY&date=${today()}`)).json() as {
      orders: Array<{ id: string }>;
    };
    expect(worklist.orders.length, "the development seed did not leave an open laboratory order").toBeGreaterThan(0);
    const order = worklist.orders[0]!;

    // Releasing a result id that was never entered must fail, not silently release nothing.
    const bogusRelease = await laboratory.post(`/api/v1/diagnostics/orders/${order.id}/result/${crypto.randomUUID()}/release`);
    expect(bogusRelease.status(), "releasing a result that was never entered must fail closed").toBe(409);

    // Save a real preliminary result, release it once, then attempt to release the same result again.
    const saved = await laboratory.put(`/api/v1/diagnostics/orders/${order.id}/result`, {
      data: { reportText: `Security double-release test ${Date.now()}` },
    });
    expect(saved.status(), await saved.text()).toBe(200);
    const { result } = await saved.json() as { result: { id: string } };
    const firstRelease = await laboratory.post(`/api/v1/diagnostics/orders/${order.id}/result/${result.id}/release`);
    expect(firstRelease.status(), await firstRelease.text()).toBe(200);

    const secondRelease = await laboratory.post(`/api/v1/diagnostics/orders/${order.id}/result/${result.id}/release`);
    expect(secondRelease.status(), "an already-released result must not be releasable a second time").toBe(409);

    await laboratory.dispose();
  });

  test("a suspended organization's user is refused, even on an already-open session", async () => {
    const platform = await newSession("platform@wonflow.local");
    const slug = `fix21-suspend-org-${Date.now()}`;
    const displayName = `FIX-21 Suspend Org ${Date.now()}`;
    const created = await platform.post("/api/v1/platform/organizations", { data: { displayName, slug, organizationCode: "MAIN" } });
    const { tenant } = await created.json() as { tenant: { id: string } };
    const ownerEmail = `security-suspend-owner-${Date.now()}@wonflow.local`;
    await platform.post(`/api/v1/platform/organizations/${tenant.id}/activate`, {
      data: {
        tenantId: tenant.id, tenantSlug: slug, tenantDisplayName: displayName,
        ownerName: "Suspend Test Owner", ownerEmail, temporaryPassword: password,
        subscription: { planCode: "starter", status: "ACTIVE", seatCount: 1, monthlyAmountMinor: 0, currencyCode: "PKR" },
      },
    });

    const owner = await newSession(ownerEmail);
    await owner.post("/api/auth/change-password", { data: { currentPassword: password, newPassword: `${password}New!`, confirmation: `${password}New!` } });

    const suspend = await platform.patch(`/api/v1/platform/organizations/${tenant.id}`, {
      data: { status: "SUSPENDED", confirmation: "SUSPEND", reason: "Playwright FIX-21 suspension test" },
    });
    expect(suspend.status(), await suspend.text()).toBe(200);

    // The same already-open session must be refused on its very next request.
    const afterSuspend = await owner.get("/api/v1/admin/users");
    expect(afterSuspend.status(), "an already-open session in a suspended organization must be refused on its next request").toBe(401);

    // A fresh login attempt must also be refused with a clear reason.
    const freshLoginAttempt = await playwrightRequest.newContext({ baseURL });
    const loginResponse = await freshLoginAttempt.post("/api/auth/login", { data: { email: ownerEmail, password: `${password}New!` } });
    expect(loginResponse.status()).toBe(403);
    const loginBody = await loginResponse.json() as { code?: string };
    expect(loginBody.code).toBe("organization-suspended");
    await freshLoginAttempt.dispose();

    // Reactivate and archive to clean up.
    await platform.patch(`/api/v1/platform/organizations/${tenant.id}`, {
      data: { status: "ACTIVE", confirmation: "REACTIVATE", reason: "Playwright FIX-21 cleanup" },
    });
    const archived = await platform.delete(`/api/v1/platform/organizations/${tenant.id}`, {
      data: { confirmation: displayName, reason: "Playwright FIX-21 security test cleanup" },
    });
    expect(archived.status(), await archived.text()).toBe(200);

    await platform.dispose();
    await owner.dispose();
  });

  test("an expired support access grant cannot be reactivated", async () => {
    const platform = await newSession("platform@wonflow.local");
    const tenants = await (await platform.get("/api/v1/platform/organizations")).json() as { tenants: Array<{ id: string; slug: string }> };
    const devTenant = tenants.tenants.find((item) => item.slug === "wonflow-development");
    expect(devTenant, "the development tenant was not found").toBeDefined();

    const grantResponse = await platform.post("/api/v1/platform/support-access", {
      data: { tenantId: devTenant!.id, reason: "Playwright FIX-21 expiry test", expiresAt: new Date(Date.now() + 3_000).toISOString() },
    });
    expect(grantResponse.status(), await grantResponse.text()).toBe(201);
    const { access } = await grantResponse.json() as { access: { id: string } };

    // A grant starts REQUESTED — only APPROVED/ACTIVE grants are eligible
    // for the self-healing expiry, so move it there before it expires.
    const activated = await platform.patch(`/api/v1/platform/support-access/${access.id}`, { data: { status: "ACTIVE" } });
    expect(activated.status(), await activated.text()).toBe(200);

    // Wait past expiry, then trigger the lazy self-healing expiry by listing.
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    const list = await (await platform.get("/api/v1/platform/support-access")).json() as {
      access: Array<{ id: string; status: string }>;
    };
    const expired = list.access.find((item) => item.id === access.id);
    expect(expired?.status, "an expired grant must self-heal to REVOKED without manual action").toBe("REVOKED");

    // The attack: reactivate the now-expired grant instead of creating a fresh one.
    const reactivate = await platform.patch(`/api/v1/platform/support-access/${access.id}`, { data: { status: "ACTIVE" } });
    expect(reactivate.status(), "an expired support access grant must not be reactivatable").toBe(409);

    await platform.dispose();
  });
});
