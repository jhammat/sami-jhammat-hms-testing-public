import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { database } from "@wonflow/database";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { bookMyAppointment, getPatientBookingCatalog } from "@/server/patient/patient-self-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

/**
 * Reproduces the reported production failure: a hospital with a doctor, a
 * priced consultation service and published rostered hours, whose patients are
 * still shown "No published schedules" with nothing to select.
 *
 * The cause is that the patient portal additionally requires
 * DoctorProfile.publiclyBookable, which defaults to false and had no
 * administrator-facing control at all.
 */

const stamp = Date.now();
const suffix = () => `${stamp}-${Math.random().toString(36).slice(2, 8)}`;

/** A date far enough ahead that "the slot is in the past" can never interfere. */
function nextWeekdayDate(weekday: number) {
  const value = new Date();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() + 7);
  while (value.getUTCDay() !== weekday) value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

const BOOKING_DATE = nextWeekdayDate(3); // A Wednesday, at least a week out.
const BOOKING_WEEKDAY = 3;
const OTHER_WEEKDAY_DATE = nextWeekdayDate(5); // Friday: the doctor holds no clinic.

let tenantId = "";
let organizationId = "";
let branchId = "";
let doctorId = "";
let serviceId = "";
let ruleId = "";
let patientId = "";
let patientIdentityId = "";
let patientMembershipId = "";
let adminMembershipId = "";
let patientContext: WonFlowRequestContext;
let adminContext: WonFlowRequestContext;

beforeAll(async () => {
  const tenant = await database.tenant.create({
    data: { slug: `booking-${suffix()}`, displayName: "Booking Test Hospital", status: "ACTIVE", defaultTimezone: "Asia/Karachi", defaultCurrencyCode: "PKR" },
  });
  tenantId = tenant.id;

  const organization = await database.organization.create({
    data: { tenantId, code: "MAIN", displayName: "Booking Test Organization", status: "ACTIVE" },
  });
  organizationId = organization.id;

  const branch = await database.branch.create({
    data: { tenantId, organizationId, code: "MAIN", name: "Main Branch", isMainBranch: true, status: "ACTIVE", timezone: "Asia/Karachi", currencyCode: "PKR" },
  });
  branchId = branch.id;

  const doctorIdentity = await database.identity.create({
    data: { email: `doctor-${suffix()}@example.test`, normalizedEmail: `doctor-${suffix()}@example.test`, status: "ACTIVE" },
  });
  const doctorMembership = await database.tenantMembership.create({
    data: { tenantId, identityId: doctorIdentity.id, organizationId, primaryBranchId: branchId, displayName: "Dr Ayesha Rahim", status: "ACTIVE", workspaceCodes: ["DOCTOR"], primaryWorkspace: "DOCTOR" },
  });
  const staffProfile = await database.staffProfile.create({
    data: { tenantId, membershipId: doctorMembership.id, branchId, employeeNumber: `E-${suffix()}`, staffType: "DOCTOR", status: "ACTIVE", title: "Consultant" },
  });
  // Exactly the production shape: created with the portal flag left at its
  // default.
  const doctor = await database.doctorProfile.create({
    data: { tenantId, staffProfileId: staffProfile.id, specialty: "Hepatobiliary Surgery", durationMinutes: 30 },
  });
  doctorId = doctor.id;

  const service = await database.serviceDefinition.create({
    data: { tenantId, branchId, doctorId, code: `SVC-${suffix()}`, name: "HPB Consultation", category: "CONSULTATION", durationMinutes: 30, priceMinorUnits: 500_000, currencyCode: "PKR", publiclyBookable: true, isActive: true, consultationModes: ["IN_PERSON", "ONLINE"] },
  });
  serviceId = service.id;

  const rule = await database.availabilityRule.create({
    data: { tenantId, doctorId, branchId, serviceId, weekday: BOOKING_WEEKDAY, startsMinute: 540, endsMinute: 720, capacity: 1, validFrom: new Date("2020-01-01T00:00:00.000Z"), isActive: true },
  });
  ruleId = rule.id;

  const patientIdentity = await database.identity.create({
    data: { email: `patient-${suffix()}@example.test`, normalizedEmail: `patient-${suffix()}@example.test`, status: "ACTIVE" },
  });
  patientIdentityId = patientIdentity.id;
  const patient = await database.patient.create({
    data: { tenantId, patientNumber: `P-${suffix()}`, givenName: "Abuzar", familyName: "Khan", status: "ACTIVE" },
  });
  patientId = patient.id;
  await database.patientAccess.create({ data: { patientId, identityId: patientIdentityId, isPrimary: true, isActive: true } });
  // Portal sessions are backed by a PATIENT membership, the same as the
  // credential provisioning flow creates.
  const patientMembership = await database.tenantMembership.create({
    data: { tenantId, identityId: patientIdentityId, organizationId, primaryBranchId: branchId, displayName: "Abuzar Khan", status: "ACTIVE", workspaceCodes: ["PATIENT"], primaryWorkspace: "PATIENT" },
  });
  patientMembershipId = patientMembership.id;

  const adminIdentity = await database.identity.create({
    data: { email: `admin-${suffix()}@example.test`, normalizedEmail: `admin-${suffix()}@example.test`, status: "ACTIVE" },
  });
  const adminMembership = await database.tenantMembership.create({
    data: { tenantId, identityId: adminIdentity.id, organizationId, primaryBranchId: branchId, displayName: "Hospital Administrator", status: "ACTIVE", workspaceCodes: ["ADMIN"], primaryWorkspace: "ADMIN" },
  });
  adminMembershipId = adminMembership.id;

  const base = { scope: "tenant", tenantId, organizationId, branchId, sessionId: "00000000-0000-0000-0000-000000000000", sourceApplication: "web", locale: "en", timezone: "Asia/Karachi", currencyCode: "PKR" } as const;
  patientContext = { ...base, userId: patientMembershipId, identityId: patientIdentityId, membershipId: patientMembershipId, requestId: `req-patient-${suffix()}`, permissionCodes: [], workspace: "PATIENT" } as unknown as WonFlowRequestContext;
  adminContext = { ...base, userId: adminMembershipId, identityId: adminIdentity.id, membershipId: adminMembershipId, requestId: `req-admin-${suffix()}`, permissionCodes: ["organization.schedules.manage", "organization.schedules.read"], workspace: "ADMIN" } as unknown as WonFlowRequestContext;
});

afterAll(async () => {
  await database.auditEvent.deleteMany({ where: { tenantId } });
  await database.notification.deleteMany({ where: { tenantId } });
  await database.idempotencyRecord.deleteMany({ where: { tenantId } });
  await database.appointment.deleteMany({ where: { tenantId } });
  await database.availabilityRule.deleteMany({ where: { tenantId } });
  await database.serviceFeeHistory.deleteMany({ where: { tenantId } });
  await database.serviceDefinition.deleteMany({ where: { tenantId } });
  await database.doctorProfile.deleteMany({ where: { tenantId } });
  await database.staffProfile.deleteMany({ where: { tenantId } });
  await database.patientAccess.deleteMany({ where: { patientId } });
  await database.patient.deleteMany({ where: { tenantId } });
  const identityIds = (await database.tenantMembership.findMany({ where: { tenantId }, select: { identityId: true } })).map((row) => row.identityId);
  await database.tenantMembership.deleteMany({ where: { tenantId } });
  await database.branch.deleteMany({ where: { tenantId } });
  await database.organization.deleteMany({ where: { tenantId } });
  await database.tenant.delete({ where: { id: tenantId } });
  await database.identity.deleteMany({ where: { id: { in: [...identityIds, patientIdentityId] } } });
});

describe("patient appointment booking", () => {
  it("explains, rather than silently hiding, a clinic whose doctor is not published to the portal", async () => {
    const catalog = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    expect(catalog.options).toHaveLength(0);
    expect(catalog.blockers.map((blocker) => blocker.code)).toContain("doctor-not-publicly-bookable");
    expect(catalog.blockers[0]?.message).toContain("Dr Ayesha Rahim");
  });

  it("lets an administrator publish the doctor, which makes the clinic bookable", async () => {
    await hospitalAdministrationService.setDoctorPatientBooking(adminContext, doctorId, true);

    const catalog = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    expect(catalog.blockers).toHaveLength(0);
    expect(catalog.options).toHaveLength(1);
    expect(catalog.options[0]).toMatchObject({ ruleId, doctorName: "Dr Ayesha Rahim", serviceName: "HPB Consultation", durationMinutes: 30 });
    // 09:00–12:00 in 30 minute slots.
    expect(catalog.slots).toHaveLength(6);
    expect(catalog.slots.every((slot) => slot.available)).toBe(true);
  });

  it("reports a day the doctor does not sit as a date problem, not an empty screen", async () => {
    const catalog = await getPatientBookingCatalog(patientContext, OTHER_WEEKDAY_DATE);
    expect(catalog.options).toHaveLength(0);
    expect(catalog.blockers.map((blocker) => blocker.code)).toContain("no-clinic-on-weekday");
  });

  it("books a slot, marks it taken, and stays idempotent on retry", async () => {
    const before = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    const slot = before.slots[0]!;
    const idempotencyKey = `book-${suffix()}`;

    const appointment = await bookMyAppointment(patientContext, { slotId: slot.id, mode: "IN_PERSON", reason: "Follow-up review", idempotencyKey });
    expect(appointment?.status).toBe("CONFIRMED");
    expect(appointment?.consultationMode).toBe("IN_PERSON");
    expect(appointment?.paymentStatus).toBe("NOT_REQUIRED");
    expect(appointment?.startsAt.toISOString()).toBe(slot.startsAt);
    // The appointment length must match the slot grid the patient was shown.
    expect(appointment!.endsAt.getTime() - appointment!.startsAt.getTime()).toBe(30 * 60_000);

    const retry = await bookMyAppointment(patientContext, { slotId: slot.id, mode: "IN_PERSON", reason: "Follow-up review", idempotencyKey });
    expect(retry?.id).toBe(appointment?.id);
    expect(await database.appointment.count({ where: { tenantId } })).toBe(1);

    const after = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    expect(after.slots.find((entry) => entry.id === slot.id)?.available).toBe(false);
  });

  it("refuses a slot id that moves a clinic onto a weekday it does not run", async () => {
    const forgedStart = new Date(`${OTHER_WEEKDAY_DATE}T04:00:00.000Z`); // 09:00 Asia/Karachi.
    await expect(
      bookMyAppointment(patientContext, { slotId: `${ruleId}:${forgedStart.toISOString()}`, mode: "IN_PERSON", idempotencyKey: `forge-${suffix()}` }),
    ).rejects.toThrow(/does not run on the selected day/);
  });

  it("refuses a start time that is not on the offered slot grid", async () => {
    const offGrid = new Date(`${BOOKING_DATE}T04:10:00.000Z`); // 09:10 Asia/Karachi.
    await expect(
      bookMyAppointment(patientContext, { slotId: `${ruleId}:${offGrid.toISOString()}`, mode: "IN_PERSON", idempotencyKey: `offgrid-${suffix()}` }),
    ).rejects.toThrow(/no longer offered/);
  });

  it("requires an explicit consultation mode when the service offers both", async () => {
    const catalog = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    const slot = catalog.slots.find((entry) => entry.available)!;
    await expect(
      bookMyAppointment(patientContext, { slotId: slot.id, idempotencyKey: `nomode-${suffix()}` }),
    ).rejects.toThrow(/in-person or online/);
  });

  it("names the service when the service itself is withheld from patient booking", async () => {
    await database.serviceDefinition.update({ where: { id: serviceId }, data: { publiclyBookable: false } });
    const catalog = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    expect(catalog.options).toHaveLength(0);
    expect(catalog.blockers.map((blocker) => blocker.code)).toContain("service-not-publicly-bookable");
    expect(catalog.blockers[0]?.message).toContain("HPB Consultation");
    await database.serviceDefinition.update({ where: { id: serviceId }, data: { publiclyBookable: true } });
  });

  it("names a rostered clinic that has no consultation service attached", async () => {
    await database.availabilityRule.update({ where: { id: ruleId }, data: { serviceId: null } });
    const catalog = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    expect(catalog.options).toHaveLength(0);
    expect(catalog.blockers.map((blocker) => blocker.code)).toContain("schedule-has-no-service");
    await database.availabilityRule.update({ where: { id: ruleId }, data: { serviceId } });
  });

  it("honours a doctor sitting that shortens the day and changes the consultation length", async () => {
    await database.doctorSitting.create({
      data: { tenantId, doctorId, branchId, businessDate: new Date(`${BOOKING_DATE}T00:00:00.000Z`), startsMinute: 600, endsMinute: 660, averageConsultationMinutes: 20, status: "AVAILABLE" },
    });
    const catalog = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    // 10:00–11:00 in 20 minute slots, replacing the 09:00–12:00 roster.
    expect(catalog.slots).toHaveLength(3);
    expect(catalog.options[0]?.durationMinutes).toBe(20);

    const slot = catalog.slots.find((entry) => entry.available)!;
    const appointment = await bookMyAppointment(patientContext, { slotId: slot.id, mode: "ONLINE", idempotencyKey: `sitting-${suffix()}` });
    // The booked appointment follows the sitting, not the 30 minute service.
    expect(appointment!.endsAt.getTime() - appointment!.startsAt.getTime()).toBe(20 * 60_000);

    await database.doctorSitting.deleteMany({ where: { tenantId } });
  });

  it("closes booking once the doctor finishes sitting for the date", async () => {
    await database.doctorSitting.create({
      data: { tenantId, doctorId, branchId, businessDate: new Date(`${BOOKING_DATE}T00:00:00.000Z`), startsMinute: 540, endsMinute: 720, status: "FINISHED" },
    });
    const catalog = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    expect(catalog.options).toHaveLength(0);
    expect(catalog.blockers.map((blocker) => blocker.code)).toContain("doctor-finished-sitting");
    await database.doctorSitting.deleteMany({ where: { tenantId } });
  });

  it("lets an administrator withdraw the doctor again", async () => {
    await hospitalAdministrationService.setDoctorPatientBooking(adminContext, doctorId, false);
    const catalog = await getPatientBookingCatalog(patientContext, BOOKING_DATE);
    expect(catalog.options).toHaveLength(0);
    expect(catalog.blockers.map((blocker) => blocker.code)).toContain("doctor-not-publicly-bookable");
    await hospitalAdministrationService.setDoctorPatientBooking(adminContext, doctorId, true);
  });
});
