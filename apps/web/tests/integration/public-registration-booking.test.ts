/**
 * TASK I-03 verification: a stranger with no WonFlow account books through
 * the public, unauthenticated website flow. This must produce a real
 * patient portal account (Identity + Patient + PatientAccess), hold the
 * appointment as PENDING until the email is verified, and only then
 * transition it to CONFIRMED — exercised end to end against the real
 * database and the real verify-email route handler.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { database } from "@wonflow/database";

import { submitPublicBooking } from "@/server/public/public-registration-service";
import { POST as verifyEmail } from "@/app/api/v1/auth/verify-email/route";

const RUN_ID = `public-booking-${Date.now()}`;
const TENANT_SLUG = RUN_ID;
const EMAIL = `${RUN_ID}@example.test`;

let tenantId: string;
let branchId: string;
let doctorId: string;
let serviceId: string;
let ruleId: string;
let slotStartsAt: Date;

beforeAll(async () => {
  const tenant = await database.tenant.create({ data: { slug: TENANT_SLUG, displayName: "Public Booking Test Hospital", status: "ACTIVE" } });
  tenantId = tenant.id;
  const organization = await database.organization.create({ data: { tenantId, code: "main", displayName: "Main Org", status: "ACTIVE" } });
  const branch = await database.branch.create({ data: { tenantId, organizationId: organization.id, code: "main", name: "Main Branch", status: "ACTIVE" } });
  branchId = branch.id;
  const identity = await database.identity.create({ data: { email: `${RUN_ID}-doctor@example.test`, normalizedEmail: `${RUN_ID}-doctor@example.test`, status: "ACTIVE" } });
  const membership = await database.tenantMembership.create({ data: { tenantId, identityId: identity.id, organizationId: organization.id, primaryBranchId: branchId, displayName: "Dr. Test", status: "ACTIVE" } });
  const staffProfile = await database.staffProfile.create({ data: { tenantId, membershipId: membership.id, branchId, employeeNumber: RUN_ID, staffType: "DOCTOR", status: "ACTIVE" } });
  const doctor = await database.doctorProfile.create({ data: { tenantId, staffProfileId: staffProfile.id, publiclyBookable: true } });
  doctorId = doctor.id;
  const service = await database.serviceDefinition.create({
    data: {
      tenantId, branchId, code: `${RUN_ID}-svc`, name: "Test Consultation", category: "CONSULTATION",
      durationMinutes: 15, priceMinorUnits: 100000, isActive: true, publiclyBookable: true, consultationModes: ["IN_PERSON"],
    },
  });
  serviceId = service.id;

  // A rule valid every weekday, wide open, so "today" always has a slot regardless of when the test runs.
  const rule = await database.availabilityRule.create({
    data: {
      tenantId, doctorId, branchId, serviceId, weekday: new Date().getUTCDay(),
      startsMinute: 0, endsMinute: 1439, capacity: 10, validFrom: new Date(Date.now() - 86_400_000),
    },
  });
  ruleId = rule.id;

  // A slot a few hours from now, aligned to the service's own duration grid
  // the same way listBookableSlots/getPublicBookingCatalog compute it —
  // simplest to just pick a round future time.
  const inThreeHours = new Date(Date.now() + 3 * 60 * 60_000);
  slotStartsAt = new Date(Math.ceil(inThreeHours.getTime() / (15 * 60_000)) * (15 * 60_000));
});

afterAll(async () => {
  await database.auditEvent.deleteMany({ where: { tenantId } });
  await database.outboxEvent.deleteMany({ where: { aggregateType: "identity" } });
  const identity = await database.identity.findUnique({ where: { normalizedEmail: EMAIL } });
  if (identity) await database.oneTimeToken.deleteMany({ where: { identityId: identity.id } });
  await database.appointment.deleteMany({ where: { tenantId } });
  await database.patientAccess.deleteMany({ where: { patient: { tenantId } } });
  await database.patient.deleteMany({ where: { tenantId } });
  await database.availabilityRule.deleteMany({ where: { tenantId } });
  await database.serviceDefinition.deleteMany({ where: { tenantId } });
  await database.doctorProfile.deleteMany({ where: { tenantId } });
  await database.staffProfile.deleteMany({ where: { tenantId } });
  await database.tenantMembership.deleteMany({ where: { tenantId } });
  await database.identity.deleteMany({ where: { normalizedEmail: { in: [EMAIL, `${RUN_ID}-doctor@example.test`] } } });
  await database.branch.deleteMany({ where: { tenantId } });
  await database.organization.deleteMany({ where: { tenantId } });
  await database.tenant.delete({ where: { id: tenantId } });
});

describe("public website registration + booking", () => {
  it("creates a real account, holds the appointment PENDING, and confirms it only once the email is verified", async () => {
    const appointment = await submitPublicBooking(TENANT_SLUG, {
      slotId: `${ruleId}:${slotStartsAt.toISOString()}`,
      mode: "IN_PERSON",
      givenName: "Test",
      familyName: "Patient",
      phone: "03001234567",
      email: EMAIL,
      password: "Str0ngPassword123",
      dateOfBirth: "1990-01-01",
      sex: "female",
      city: "Lahore",
      idempotencyKey: `${RUN_ID}-book`,
    });

    expect(appointment.status).toBe("PENDING");

    const identity = await database.identity.findUnique({ where: { normalizedEmail: EMAIL } });
    expect(identity).not.toBeNull();
    expect(identity!.passwordHash).not.toBeNull();
    expect(identity!.emailVerifiedAt).toBeNull();

    const membership = await database.tenantMembership.findFirst({ where: { tenantId, identityId: identity!.id } });
    expect(membership).not.toBeNull();
    expect(membership!.status).toBe("ACTIVE");
    expect(membership!.workspaceCodes).toEqual(["PATIENT"]);
    expect(membership!.primaryWorkspace).toBe("PATIENT");

    const patientAccess = await database.patientAccess.findFirst({ where: { identityId: identity!.id }, include: { patient: true } });
    expect(patientAccess).not.toBeNull();
    expect(patientAccess!.isPrimary).toBe(true);
    expect(patientAccess!.patient.sex).toBe("female");
    expect((patientAccess!.patient.address as { city?: string } | null)?.city).toBe("Lahore");

    const token = await database.oneTimeToken.findFirst({ where: { identityId: identity!.id, purpose: "EMAIL_VERIFICATION", status: "ACTIVE" } });
    expect(token).not.toBeNull();

    const outboxEvent = await database.outboxEvent.findFirst({ where: { aggregateId: identity!.id, type: "auth.email-verification.requested" } });
    expect(outboxEvent).not.toBeNull();

    // The route only exposes the raw token via the (unsent, since no email
    // provider is wired) outbox payload — read it back exactly as a real
    // email link would carry it.
    const rawToken = (outboxEvent!.payload as { token?: string }).token;
    expect(rawToken).toBeTruthy();

    const verifyRequest = new Request("http://localhost/api/v1/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: rawToken }),
    });
    const verifyResponse = await verifyEmail(verifyRequest);
    expect(verifyResponse.status).toBe(200);
    const verifyBody = await verifyResponse.json() as { ok: boolean; confirmedAppointmentIds: string[] };
    expect(verifyBody.ok).toBe(true);
    expect(verifyBody.confirmedAppointmentIds).toContain(appointment.id);

    const confirmedAppointment = await database.appointment.findUnique({ where: { id: appointment.id } });
    expect(confirmedAppointment!.status).toBe("CONFIRMED");

    const verifiedIdentity = await database.identity.findUnique({ where: { id: identity!.id } });
    expect(verifiedIdentity!.emailVerifiedAt).not.toBeNull();
  }, 20_000);

  it("refuses a second registration with the same email instead of creating a duplicate account", async () => {
    await expect(
      submitPublicBooking(TENANT_SLUG, {
        slotId: `${ruleId}:${new Date(slotStartsAt.getTime() + 30 * 60_000).toISOString()}`,
        mode: "IN_PERSON",
        givenName: "Test",
        familyName: "Duplicate",
        phone: "03007654321",
        email: EMAIL,
        password: "AnotherStr0ngPass1",
        dateOfBirth: "1991-01-01",
        sex: "male",
        city: "Karachi",
        idempotencyKey: `${RUN_ID}-book-2`,
      }),
    ).rejects.toMatchObject({ status: 409, code: "account-already-exists" });

    const identities = await database.identity.count({ where: { normalizedEmail: EMAIL } });
    expect(identities).toBe(1);
  });
});
