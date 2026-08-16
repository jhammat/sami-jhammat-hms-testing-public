/**
 * TASK I-02 verification: two concurrent bookings for the exact same
 * doctor/branch/time must not both succeed. The application already had a
 * count-then-insert check and a catch for a unique-constraint 409, but no
 * unique constraint actually existed in the database — see migration
 * 20260816110542_appointment_slot_unique_index. This proves the real
 * partial index closes the race, and confirms Prisma still surfaces it as a
 * catchable "unique constraint" error even though the index has no
 * matching `@@unique` in schema.prisma.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { database } from "@wonflow/database";

const RUN_ID = `slot-race-${Date.now()}`;

let tenantId: string;
let branchId: string;
let doctorId: string;
let patientAId: string;
let patientBId: string;
const startsAt = new Date(Date.now() + 24 * 60 * 60_000);
const endsAt = new Date(startsAt.getTime() + 15 * 60_000);

function isUniqueConstraintError(caught: unknown): boolean {
  return typeof caught === "object" && caught !== null && (caught as { code?: string }).code === "P2002";
}

beforeAll(async () => {
  const tenant = await database.tenant.create({ data: { slug: RUN_ID, displayName: "Slot Race Test Hospital", status: "ACTIVE" } });
  tenantId = tenant.id;
  const organization = await database.organization.create({ data: { tenantId, code: "main", displayName: "Main Org", status: "ACTIVE" } });
  const branch = await database.branch.create({ data: { tenantId, organizationId: organization.id, code: "main", name: "Main Branch", status: "ACTIVE" } });
  branchId = branch.id;
  const identity = await database.identity.create({ data: { email: `${RUN_ID}@example.test`, normalizedEmail: `${RUN_ID}@example.test`, status: "ACTIVE" } });
  const membership = await database.tenantMembership.create({ data: { tenantId, identityId: identity.id, organizationId: organization.id, primaryBranchId: branchId, displayName: "Dr. Test", status: "ACTIVE" } });
  const staffProfile = await database.staffProfile.create({ data: { tenantId, membershipId: membership.id, branchId, employeeNumber: RUN_ID, staffType: "DOCTOR", status: "ACTIVE" } });
  const doctor = await database.doctorProfile.create({ data: { tenantId, staffProfileId: staffProfile.id } });
  doctorId = doctor.id;
  const [patientA, patientB] = await Promise.all([
    database.patient.create({ data: { tenantId, patientNumber: `${RUN_ID}-a`, givenName: "Patient", familyName: "A" } }),
    database.patient.create({ data: { tenantId, patientNumber: `${RUN_ID}-b`, givenName: "Patient", familyName: "B" } }),
  ]);
  patientAId = patientA.id;
  patientBId = patientB.id;
});

afterAll(async () => {
  await database.appointment.deleteMany({ where: { tenantId } });
  await database.patient.deleteMany({ where: { tenantId } });
  await database.doctorProfile.deleteMany({ where: { tenantId } });
  await database.staffProfile.deleteMany({ where: { tenantId } });
  await database.tenantMembership.deleteMany({ where: { tenantId } });
  await database.identity.deleteMany({ where: { normalizedEmail: `${RUN_ID}@example.test` } });
  await database.branch.deleteMany({ where: { tenantId } });
  await database.organization.deleteMany({ where: { tenantId } });
  await database.tenant.delete({ where: { id: tenantId } });
});

describe("appointment slot uniqueness", () => {
  it("lets exactly one of two simultaneous bookings for the same doctor/branch/time succeed", async () => {
    const create = (patientId: string) =>
      database.appointment.create({
        data: {
          tenantId, patientId, doctorId, branchId, status: "CONFIRMED",
          consultationMode: "IN_PERSON", source: "test", startsAt, endsAt,
          idempotencyKey: randomUUID(),
        },
      });

    const [resultA, resultB] = await Promise.allSettled([create(patientAId), create(patientBId)]);
    const outcomes = [resultA, resultB];

    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.filter((outcome) => outcome.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(isUniqueConstraintError((rejected[0] as PromiseRejectedResult).reason)).toBe(true);

    const appointments = await database.appointment.findMany({ where: { tenantId, doctorId, branchId, startsAt } });
    expect(appointments).toHaveLength(1);
  }, 20_000);

  it("allows rebooking the same slot after the first appointment is cancelled", async () => {
    const cancelled = await database.appointment.findFirst({ where: { tenantId, doctorId, branchId, startsAt } });
    expect(cancelled).not.toBeNull();
    await database.appointment.update({ where: { id: cancelled!.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "test" } });

    const rebooked = await database.appointment.create({
      data: {
        tenantId, patientId: patientAId, doctorId, branchId, status: "CONFIRMED",
        consultationMode: "IN_PERSON", source: "test", startsAt, endsAt,
        idempotencyKey: randomUUID(),
      },
    });
    expect(rebooked.status).toBe("CONFIRMED");
  });
});
