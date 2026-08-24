import { database } from "@wonflow/database";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { syncService } from "../../src/server/offline/sync-service";
import type { BatchSyncRequest, WonFlowRequestContext } from "@wonflow/contracts";

describe("Offline Logging & Sync Engine (Task C-09)", () => {
  const testRunId = `test-sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let tenantId: string;
  let orgId: string;
  let branchId: string;
  let staffIdentityId: string;
  let doctorProfileId: string;
  let patientIdentityId: string;
  let patientMembershipId: string;
  let patientId: string;
  let drainId: string;
  let carePlanTaskId: string;
  let scheduleId: string;


  beforeEach(async () => {
    // 1. Create Tenant
    const tenant = await database.tenant.create({
      data: {
        slug: `tenant-${testRunId}`,
        displayName: `Hospital Tenant ${testRunId}`,
        legalName: `Hospital Legal ${testRunId}`,
      },
    });
    tenantId = tenant.id;

    // 2. Create Organization & Branch
    const org = await database.organization.create({
      data: {
        tenantId,
        code: `org-${testRunId}`,
        displayName: "Main Hospital Org",
        status: "ACTIVE",
      },
    });
    orgId = org.id;

    const branch = await database.branch.create({
      data: {
        tenantId,
        organizationId: org.id,
        code: `BR-${testRunId}`,
        name: "Main Branch",
        isMainBranch: true,
        status: "ACTIVE",
      },
    });
    branchId = branch.id;

    // 3. Create Doctor Staff & Profile
    const doctorIdentity = await database.identity.create({
      data: {
        email: `doctor-${testRunId}@hospital.com`,
        normalizedEmail: `doctor-${testRunId}@hospital.com`,
        status: "ACTIVE",
      },
    });
    staffIdentityId = doctorIdentity.id;

    const staffMembership = await database.tenantMembership.create({
      data: {
        tenantId,
        organizationId: org.id,
        identityId: doctorIdentity.id,
        displayName: "Dr. Bilal Surgeon",
        status: "ACTIVE",
        workspaceCodes: ["DOCTOR"],
        primaryWorkspace: "DOCTOR",
      },
    });

    const staffProfile = await database.staffProfile.create({

      data: {
        tenantId,
        membershipId: staffMembership.id,
        branchId: branch.id,
        employeeNumber: `EMP-${testRunId}`,
        staffType: "DOCTOR",
        status: "ACTIVE",
      },
    });

    const doctorProfile = await database.doctorProfile.create({
      data: {
        tenantId,
        staffProfileId: staffProfile.id,
        registrationNumber: `SURG-${testRunId}`,
        specialty: "HPB Surgery",
      },
    });
    doctorProfileId = doctorProfile.id;

    // 4. Create Patient
    const patientIdentity = await database.identity.create({
      data: {
        email: `patient-${testRunId}@gmail.com`,
        normalizedEmail: `patient-${testRunId}@gmail.com`,
        status: "ACTIVE",
      },
    });
    patientIdentityId = patientIdentity.id;

    const patient = await database.patient.create({
      data: {
        tenantId,
        patientNumber: `PAT-${testRunId}`,
        givenName: "Haroon",
        familyName: "Rasheed",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
        dateOfBirth: new Date("1980-06-15"),
        phone: "+923001234567",
      },
    });
    patientId = patient.id;

    const patientMembership = await database.tenantMembership.create({
      data: {
        tenantId,
        organizationId: org.id,
        identityId: patientIdentity.id,
        displayName: "Haroon Rasheed",
        status: "ACTIVE",
        workspaceCodes: ["PATIENT"],
        primaryWorkspace: "PATIENT",
      },
    });
    patientMembershipId = patientMembership.id;

    await database.patientAccess.create({
      data: {
        patientId: patient.id,
        identityId: patientIdentity.id,
        relationship: "self",
        isPrimary: true,
        isActive: true,
      },
    });

    // 5. Create Surgical Drain for Patient
    const drain = await database.patientDrain.create({
      data: {
        tenantId,
        patientId: patient.id,
        label: "Subhepatic JP Drain #1",
        site: "Right upper quadrant",
        insertedAt: new Date(Date.now() - 5 * 86_400_000),
        insertedByMembershipId: staffMembership.id,
        isActive: true,
      },
    });
    drainId = drain.id;

    // 6. Create Care Plan & Tasks
    const plan = await database.carePlan.create({
      data: {
        tenantId,
        patientId: patient.id,
        managingDoctorId: doctorProfileId,
        title: "Whipple Recovery Protocol",
        category: "SURGICAL_RECOVERY",
        status: "ACTIVE",
        startDate: new Date(),
      },
    });

    const task = await database.carePlanTask.create({
      data: {
        tenantId,
        carePlanId: plan.id,
        taskType: "EXERCISE",
        dayNumber: 1,
        scheduledFor: new Date(),
        title: "Evening 15-Minute Ambulation",
        status: "PENDING",
      },
    });
    carePlanTaskId = task.id;

    const medTask = await database.carePlanTask.create({
      data: {
        tenantId,
        carePlanId: plan.id,
        taskType: "MEDICATION",
        dayNumber: 1,
        scheduledFor: new Date(),
        title: "Creon (Pancrelipase) 25,000 U",
        instructions: "1 capsule with dinner",
        status: "PENDING",
        resultData: {
          medicationName: "Creon (Pancrelipase) 25,000 U",
          dose: "1 capsule",
          frequency: "WITH_MEALS",
        },
      },
    });
    scheduleId = medTask.id;
  });

  afterEach(async () => {
    await database.auditEvent.deleteMany({ where: { tenantId } });
    await database.idempotencyRecord.deleteMany({ where: { tenantId } });
    await database.clinicalObservation.deleteMany({ where: { tenantId } });
    await database.drainLog.deleteMany({ where: { tenantId } });
    await database.symptomLog.deleteMany({ where: { tenantId } });
    await database.carePlanTask.deleteMany({ where: { tenantId } });
    await database.carePlan.deleteMany({ where: { tenantId } });
    await database.patientDrain.deleteMany({ where: { tenantId } });
    await database.patientAccess.deleteMany({ where: { patientId } });
    await database.patient.deleteMany({ where: { tenantId } });
    await database.doctorProfile.deleteMany({ where: { tenantId } });
    await database.staffProfile.deleteMany({ where: { tenantId } });
    await database.tenantMembership.deleteMany({ where: { tenantId } });
    await database.branch.deleteMany({ where: { tenantId } });
    await database.organization.deleteMany({ where: { tenantId } });
    await database.tenant.deleteMany({ where: { id: tenantId } });
    const ids = [staffIdentityId, patientIdentityId].filter(Boolean);
    if (ids.length > 0) {
      await database.identity.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("records 2 days of offline vitals, drains, symptoms and adherence, syncs accurately, and ignores duplicates on resubmit", async () => {
    const patientContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-sync-${Date.now()}`,
      userId: patientIdentityId,
      identityId: patientIdentityId,
      membershipId: patientMembershipId,
      sessionId: `00000000-0000-0000-0000-000000000061`,
      tenantId,
      organizationId: orgId,
      branchId,
      workspace: "PATIENT",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: [],
      sourceApplication: "web",
    };

    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const oneDayAgo = new Date(Date.now() - 1 * 86_400_000).toISOString();

    // Prepare batch of 6 offline entries recorded over 2 days with intermittent connection
    const offlineBatch: BatchSyncRequest = {
      clientVersion: "1.0.0",
      deviceInfo: { platform: "Android", userAgent: "WonFlow-Mobile/1.0" },
      items: [
        // 1. Day 1 Morning Vital (Systolic Blood Pressure)
        {
          id: `client-vital-1-${Date.now()}`,
          type: "VITAL",
          deviceRecordedAt: twoDaysAgo,
          createdAt: twoDaysAgo,
          payload: {
            patientId,
            code: "BP_SYS",
            display: "Blood Pressure (Systolic)",
            valueNumber: 124,
            unit: "mmHg",
          },
        },
        // 2. Day 1 Drain Output (120mL Serosanguinous)
        {
          id: `client-drain-1-${Date.now()}`,
          type: "DRAIN",
          deviceRecordedAt: twoDaysAgo,
          createdAt: twoDaysAgo,
          payload: {
            drainId,
            volumeMl: 120,
            colour: "PALE_YELLOW",
            character: "SEROSANGUINOUS",
            notes: "Recorded before sleep",
          },
        },
        // 3. Day 1 Incision Pain Symptom
        {
          id: `client-symp-1-${Date.now()}`,
          type: "SYMPTOM",
          deviceRecordedAt: twoDaysAgo,
          createdAt: twoDaysAgo,
          payload: {
            patientId,
            symptomCode: "PAIN_INCISION",
            severityScore: 4,
            freeText: "Mild pulling sensation near wound edge",
          },
        },
        // 4. Day 2 Morning Temperature Vital
        {
          id: `client-vital-2-${Date.now()}`,
          type: "VITAL",
          deviceRecordedAt: oneDayAgo,
          createdAt: oneDayAgo,
          payload: {
            patientId,
            code: "TEMP",
            display: "Body Temperature",
            valueNumber: 37.1,
            unit: "°C",
          },
        },
        // 5. Day 2 Drain Output (85mL Serous)
        {
          id: `client-drain-2-${Date.now()}`,
          type: "DRAIN",
          deviceRecordedAt: oneDayAgo,
          createdAt: oneDayAgo,
          payload: {
            drainId,
            volumeMl: 85,
            colour: "CLEAR",
            character: "SEROUS",
          },
        },
        // 6. Day 2 Evening Medication Dose Log
        {
          id: `client-dose-1-${Date.now()}`,
          type: "MEDICATION_DOSE",
          deviceRecordedAt: oneDayAgo,
          createdAt: oneDayAgo,
          payload: {
            taskId: scheduleId,
            status: "COMPLETED",
          },
        },
        // 7. Day 2 Evening Exercise Ambulation Task Completion
        {
          id: `client-task-1-${Date.now()}`,
          type: "CARE_PLAN_TASK",
          deviceRecordedAt: oneDayAgo,
          createdAt: oneDayAgo,
          payload: {
            taskId: carePlanTaskId,
            notes: "Completed 15 minutes walk in corridor without dizziness",
          },
        },
      ],
    };

    // 1. First Synchronization Replay
    const syncResponse = await syncService.processBatchSync(patientContext, offlineBatch);

    expect(syncResponse.syncedCount).toBe(7);
    expect(syncResponse.duplicateCount).toBe(0);
    expect(syncResponse.rejectedCount).toBe(0);
    expect(syncResponse.results.length).toBe(7);
    expect(syncResponse.results.every((r) => r.status === "PROCESSED")).toBe(true);


    // 2. Verify Database Records & Device Timestamp Preservation
    const observations = await database.clinicalObservation.findMany({
      where: { tenantId, patientId },
      orderBy: { observedAt: "asc" },
    });
    expect(observations.length).toBe(2);
    expect(observations[0].code).toBe("BP_SYS");
    expect(observations[0].source).toBe("PATIENT");
    expect(observations[0].status).toBe("PRELIMINARY");
    expect(observations[0].deviceRecordedAt?.toISOString()).toBe(twoDaysAgo);
    expect(observations[1].code).toBe("TEMP");
    expect(observations[1].deviceRecordedAt?.toISOString()).toBe(oneDayAgo);

    const drainLogs = await database.drainLog.findMany({
      where: { tenantId, drainId },
      orderBy: { recordedAt: "asc" },
    });
    expect(drainLogs.length).toBe(2);
    expect(drainLogs[0].volumeMl).toBe(120);
    expect(drainLogs[0].deviceRecordedAt?.toISOString()).toBe(twoDaysAgo);
    expect(drainLogs[1].volumeMl).toBe(85);
    expect(drainLogs[1].deviceRecordedAt?.toISOString()).toBe(oneDayAgo);

    const symptomLogs = await database.symptomLog.findMany({
      where: { tenantId, patientId },
    });
    expect(symptomLogs.length).toBe(1);
    expect(symptomLogs[0].symptomCode).toBe("PAIN_INCISION");
    expect(symptomLogs[0].deviceRecordedAt?.toISOString()).toBe(twoDaysAgo);

    const updatedMedTask = await database.carePlanTask.findUnique({
      where: { id: scheduleId },
    });
    expect(updatedMedTask?.status).toBe("COMPLETED");

    // 3. Resubmit the Exact Same Batch (Simulating Network Retry / Outbox Resubmission)
    const duplicateSyncResponse = await syncService.processBatchSync(patientContext, offlineBatch);

    expect(duplicateSyncResponse.syncedCount).toBe(0);
    expect(duplicateSyncResponse.duplicateCount).toBe(7);
    expect(duplicateSyncResponse.rejectedCount).toBe(0);
    expect(duplicateSyncResponse.results.every((r) => r.status === "DUPLICATE_IGNORED")).toBe(true);

    // Verify zero duplicates created in database
    const obsCount = await database.clinicalObservation.count({ where: { tenantId, patientId } });
    const drainCount = await database.drainLog.count({ where: { tenantId, drainId } });
    const sympCount = await database.symptomLog.count({ where: { tenantId, patientId } });

    expect(obsCount).toBe(2);
    expect(drainCount).toBe(2);
    expect(sympCount).toBe(1);

    const taskCheck = await database.carePlanTask.findUnique({ where: { id: carePlanTaskId } });
    expect(taskCheck?.status).toBe("COMPLETED");
  });

});
