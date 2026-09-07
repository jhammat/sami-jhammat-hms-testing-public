/**
 * TASK C-01 verification: creating an encounter must be safe against two
 * concurrent starts for the same doctor — exactly one may succeed. This is
 * a genuine race against Postgres (createEncounter runs its check-then-create
 * at SERIALIZABLE isolation), so it needs the real database rather than a
 * mock; it is excluded from the default unit run and only runs when
 * DATABASE_URL points at a reachable Postgres instance.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { database } from "@wonflow/database";
import type { WonFlowTenantRequestContext } from "@wonflow/contracts";

import { doctorService } from "@/server/doctor/doctor-service";
import { WonFlowApiError } from "@/server/http/route-handler";

const RUN_ID = `concurrency-${Date.now()}`;

let tenantId: string;
let organizationId: string;
let branchId: string;
let doctorId: string;
let membershipId: string;
let appointmentAId: string;
let appointmentBId: string;

function requestContext(): WonFlowTenantRequestContext {
  return {
    scope: "tenant",
    requestId: randomUUID(),
    userId: randomUUID(),
    identityId: randomUUID(),
    membershipId,
    sessionId: randomUUID(),
    workspace: "DOCTOR",
    locale: "en",
    timezone: "Asia/Karachi",
    currencyCode: "PKR",
    permissionCodes: ["encounters.manage", "encounters.read", "queues.manage"],
    sourceApplication: "web",
    tenantId,
    organizationId,
    branchId,
  };
}

beforeAll(async () => {
  const tenant = await database.tenant.create({
    data: { slug: RUN_ID, displayName: "Concurrency Test Hospital", status: "ACTIVE" },
  });
  tenantId = tenant.id;

  const organization = await database.organization.create({
    data: { tenantId, code: "main", displayName: "Main Org", status: "ACTIVE" },
  });
  organizationId = organization.id;

  const branch = await database.branch.create({
    data: { tenantId, organizationId, code: "main", name: "Main Branch", status: "ACTIVE" },
  });
  branchId = branch.id;

  const identity = await database.identity.create({
    data: { email: `${RUN_ID}@example.test`, normalizedEmail: `${RUN_ID}@example.test`, status: "ACTIVE" },
  });

  const membership = await database.tenantMembership.create({
    data: { tenantId, identityId: identity.id, organizationId, primaryBranchId: branchId, displayName: "Dr. Test", status: "ACTIVE" },
  });
  membershipId = membership.id;

  const staffProfile = await database.staffProfile.create({
    data: { tenantId, membershipId, branchId, employeeNumber: RUN_ID, staffType: "DOCTOR", status: "ACTIVE" },
  });

  const doctor = await database.doctorProfile.create({
    data: { tenantId, staffProfileId: staffProfile.id },
  });
  doctorId = doctor.id;

  /*
   * The sitting has to be dated in the hospital's own business day, not in UTC.
   *
   * This built the date from `getUTCFullYear/Month/Date` while the request
   * context below declares `Asia/Karachi`, and `createEncounter` resolves
   * "today" in the tenant's timezone. Between 00:00 and 05:00 in Karachi the
   * two disagree — UTC is still on the previous date — so no sitting matched,
   * the readiness check refused both starts, and this test failed for reasons
   * that had nothing to do with concurrency. It is now deterministic at every
   * hour of the day.
   */
  const businessDayInTenantTimezone = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const today = new Date(`${businessDayInTenantTimezone}T00:00:00.000Z`);
  await database.doctorSitting.create({
    data: {
      tenantId, doctorId, branchId, businessDate: today,
      startsMinute: 9 * 60, endsMinute: 17 * 60, status: "AVAILABLE", actualStartedAt: new Date(),
    },
  });

  const now = new Date();
  const [patientA, patientB] = await Promise.all([
    database.patient.create({ data: { tenantId, patientNumber: `${RUN_ID}-a`, givenName: "Patient", familyName: "A" } }),
    database.patient.create({ data: { tenantId, patientNumber: `${RUN_ID}-b`, givenName: "Patient", familyName: "B" } }),
  ]);

  const [appointmentA, appointmentB] = await Promise.all([
    database.appointment.create({
      data: {
        tenantId, patientId: patientA.id, doctorId, branchId, status: "IN_QUEUE",
        consultationMode: "IN_PERSON", source: "test", startsAt: now, endsAt: new Date(now.getTime() + 15 * 60_000),
        checkedInAt: now,
      },
    }),
    database.appointment.create({
      data: {
        tenantId, patientId: patientB.id, doctorId, branchId, status: "IN_QUEUE",
        consultationMode: "IN_PERSON", source: "test",
        startsAt: new Date(now.getTime() + 15 * 60_000), endsAt: new Date(now.getTime() + 30 * 60_000),
        checkedInAt: now,
      },
    }),
  ]);
  appointmentAId = appointmentA.id;
  appointmentBId = appointmentB.id;
});

afterAll(async () => {
  await database.auditEvent.deleteMany({ where: { tenantId } });
  await database.encounter.deleteMany({ where: { tenantId } });
  await database.appointment.deleteMany({ where: { tenantId } });
  await database.patient.deleteMany({ where: { tenantId } });
  await database.doctorSitting.deleteMany({ where: { tenantId } });
  await database.doctorProfile.deleteMany({ where: { tenantId } });
  await database.staffProfile.deleteMany({ where: { tenantId } });
  await database.tenantMembership.deleteMany({ where: { tenantId } });
  await database.identity.deleteMany({ where: { normalizedEmail: `${RUN_ID}@example.test` } });
  await database.branch.deleteMany({ where: { tenantId } });
  await database.organization.deleteMany({ where: { tenantId } });
  await database.tenant.delete({ where: { id: tenantId } });
});

describe("createEncounter concurrency", () => {
  it("lets exactly one of two simultaneous starts for the same doctor succeed", async () => {
    const rc = requestContext();

    const [resultA, resultB] = await Promise.allSettled([
      doctorService.createEncounter(rc, appointmentAId),
      doctorService.createEncounter(rc, appointmentBId),
    ]);

    const outcomes = [resultA, resultB];
    const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled");
    const rejected = outcomes.filter((outcome) => outcome.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason as unknown;
    expect(rejectedReason).toBeInstanceOf(WonFlowApiError);
    expect((rejectedReason as WonFlowApiError).code).toBe("another-consultation-active");

    const encounters = await database.encounter.findMany({ where: { tenantId, doctorId, status: "IN_PROGRESS" } });
    expect(encounters).toHaveLength(1);
  }, 20_000);
});
