import { database } from "@wonflow/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { medicationAdherenceService } from "../../src/server/clinical/medication-adherence-service";

/**
 * Re-syncing a prescription's reminders must not lay down a second course.
 *
 * The schedule used to be anchored to the moment of the sync, so day 1 was
 * "today". The duplicate check compares the exact `scheduledFor`, which meant
 * a sync run on any later day matched nothing and created the whole course
 * again. Repeated over a week that is how a single patient's care plan came to
 * list the same tablet 28 times.
 */
describe("prescription reminder sync", () => {
  const runId = `medsync-${Date.now()}`;
  let tenantId = "";
  let organizationId = "";
  let branchId = "";
  let membershipId = "";
  let identityId = "";
  let doctorId = "";
  let patientId = "";
  let prescriptionId = "";
  let encounterId = "";
  let requestContext: WonFlowRequestContext;

  beforeAll(async () => {
    const tenant = await database.tenant.create({
      data: { slug: `t-${runId}`, displayName: `T ${runId}`, legalName: `T ${runId}`, defaultTimezone: "Asia/Karachi" },
    });
    tenantId = tenant.id;

    const organization = await database.organization.create({
      data: { tenantId, code: `O-${runId}`, displayName: "Main", status: "ACTIVE" },
    });
    organizationId = organization.id;

    const branch = await database.branch.create({
      data: { tenantId, organizationId, code: `B-${runId}`, name: "Main", isMainBranch: true, status: "ACTIVE" },
    });
    branchId = branch.id;

    const identity = await database.identity.create({
      data: { email: `${runId}@example.test`, normalizedEmail: `${runId}@example.test`, status: "ACTIVE" },
    });
    identityId = identity.id;

    const membership = await database.tenantMembership.create({
      data: { tenantId, organizationId, identityId, displayName: "Dr Sync", status: "ACTIVE", workspaceCodes: ["DOCTOR"] },
    });
    membershipId = membership.id;

    const staffProfile = await database.staffProfile.create({
      data: { tenantId, membershipId, branchId, employeeNumber: `E-${runId}`, staffType: "DOCTOR", status: "ACTIVE" },
    });
    const doctor = await database.doctorProfile.create({
      data: { tenantId, staffProfileId: staffProfile.id, specialty: "HPB" },
    });
    doctorId = doctor.id;

    const patient = await database.patient.create({
      data: { tenantId, patientNumber: `P-${runId}`, givenName: "Sync", familyName: "Test" },
    });
    patientId = patient.id;

    const medication = await database.medication.create({
      data: { tenantId, code: `MED-${runId}`, genericName: "Paracetamol", unit: "tablet", isActive: true },
    });

    // A prescription is always written inside an encounter.
    const encounter = await database.encounter.create({
      data: {
        tenant: { connect: { id: tenantId } },
        patient: { connect: { id: patientId } },
        doctor: { connect: { id: doctorId } },
        branch: { connect: { id: branchId } },
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 3 * 86_400_000),
      },
    });
    encounterId = encounter.id;

    // Prescribed three days ago, so "today" and the course start differ.
    const prescription = await database.prescription.create({
      data: {
        tenant: { connect: { id: tenantId } },
        patient: { connect: { id: patientId } },
        doctor: { connect: { id: doctorId } },
        encounter: { connect: { id: encounterId } },
        status: "ACTIVE",
        prescribedAt: new Date(Date.now() - 3 * 86_400_000),
        items: {
          create: [{ medication: { connect: { id: medication.id } }, dose: "1 g", frequency: "Twice daily", route: "Oral" }],
        },
      },
    });
    prescriptionId = prescription.id;

    requestContext = {
      scope: "tenant",
      requestId: `req-${runId}`,
      userId: identityId,
      identityId,
      membershipId,
      sessionId: "00000000-0000-0000-0000-0000000000aa",
      tenantId,
      organizationId,
      branchId,
      workspace: "DOCTOR",
      locale: "en",
      timezone: "Asia/Karachi",
      currencyCode: "PKR",
      permissionCodes: ["encounters.manage", "careplans.manage"],
      sourceApplication: "web",
    } as WonFlowRequestContext;
  });

  afterAll(async () => {
    // Audit rows reference the tenant and are written by the service under test.
    await database.auditEvent.deleteMany({ where: { tenantId } });
    await database.carePlanTask.deleteMany({ where: { tenantId } });
    await database.carePlanAlert.deleteMany({ where: { tenantId } });
    await database.carePlan.deleteMany({ where: { tenantId } });
    await database.prescriptionItem.deleteMany({ where: { prescription: { tenantId } } });
    await database.prescription.deleteMany({ where: { tenantId } });
    await database.encounter.deleteMany({ where: { tenantId } });
    await database.medication.deleteMany({ where: { tenantId } });
    await database.patient.deleteMany({ where: { tenantId } });
    await database.doctorProfile.deleteMany({ where: { tenantId } });
    await database.staffProfile.deleteMany({ where: { tenantId } });
    await database.tenantMembership.deleteMany({ where: { tenantId } });
    await database.identity.deleteMany({ where: { id: identityId } });
    await database.branch.deleteMany({ where: { tenantId } });
    await database.organization.deleteMany({ where: { tenantId } });
    await database.tenant.deleteMany({ where: { id: tenantId } });
  });

  const countTasks = () =>
    database.carePlanTask.count({ where: { tenantId, taskType: "MEDICATION" } });

  it("creates the course once and adds nothing on a repeat sync", async () => {
    const first = await medicationAdherenceService.generateMedicationTasksFromPrescription(requestContext, {
      prescriptionId,
      durationDays: 5,
    });
    const afterFirst = await countTasks();

    expect(first.tasksCreated).toBeGreaterThan(0);
    expect(afterFirst).toBe(first.tasksCreated);

    const second = await medicationAdherenceService.generateMedicationTasksFromPrescription(requestContext, {
      prescriptionId,
      durationDays: 5,
    });
    const afterSecond = await countTasks();

    expect(second.tasksCreated).toBe(0);
    expect(afterSecond).toBe(afterFirst);

    // A third run, to be sure the guard is not merely one-shot.
    await medicationAdherenceService.generateMedicationTasksFromPrescription(requestContext, {
      prescriptionId,
      durationDays: 5,
    });
    expect(await countTasks()).toBe(afterFirst);
  });

  it("does not duplicate a given dose slot within the course", async () => {
    const tasks = await database.carePlanTask.findMany({
      where: { tenantId, taskType: "MEDICATION" },
      select: { title: true, scheduledFor: true },
    });
    const seen = new Set(tasks.map((task) => `${task.title}@${task.scheduledFor.toISOString()}`));
    expect(seen.size).toBe(tasks.length);
  });
});
