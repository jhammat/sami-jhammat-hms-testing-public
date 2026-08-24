import { database } from "@wonflow/database";
import { describe, expect, it } from "vitest";
import { CarePlanService } from "@/server/clinical/care-plan-service";
import { getMyActiveCarePlan } from "@/server/patient/patient-self-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Patient Care Plan Task Execution View (Task C-02)", () => {
  const carePlanService = new CarePlanService();

  it("loads patient recovery plan, checks tasks, and handles caregiver delegation switch", async () => {
    const uniqueSlug = `patient-view-tenant-${Date.now()}`;

    // 1. Setup Tenant, Org, Branch
    const tenant = await database.tenant.create({
      data: {
        slug: uniqueSlug,
        displayName: "Post-Op Patient View Center",
        status: "ACTIVE",
        defaultTimezone: "UTC",
        defaultCurrencyCode: "PKR",
      },
    });

    const org = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "SURG-VIEW-ORG",
        displayName: "Surgical Recovery Org",
        status: "ACTIVE",
      },
    });

    const branch = await database.branch.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        code: "MAIN",
        name: "Main Branch",
        isMainBranch: true,
        status: "ACTIVE",
      },
    });

    // 2. Doctor profile setup
    const doctorIdentity = await database.identity.create({
      data: {
        email: `surgeon-${Date.now()}@test.org`,
        normalizedEmail: `surgeon-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const doctorMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: doctorIdentity.id,
        displayName: "Dr. Elizabeth Surgeon",
        status: "ACTIVE",
        workspaceCodes: ["DOCTOR"],
        primaryWorkspace: "DOCTOR",
      },
    });

    const staffProfile = await database.staffProfile.create({
      data: {
        tenantId: tenant.id,
        membershipId: doctorMembership.id,
        branchId: branch.id,
        employeeNumber: `EMP-SURG-${Date.now()}`,
        staffType: "DOCTOR",
        status: "ACTIVE",
      },
    });

    const doctorProfile = await database.doctorProfile.create({
      data: {
        tenantId: tenant.id,
        staffProfileId: staffProfile.id,
        registrationNumber: `SURG-${Date.now()}`,
        specialty: "General Surgery",
      },
    });

    // 3. Patient setup
    const patientIdentity = await database.identity.create({
      data: {
        email: `recovery-patient-${Date.now()}@test.org`,
        normalizedEmail: `recovery-patient-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `PAT-REC-${Date.now()}`,
        givenName: "Jane",
        familyName: "Patient",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
      },
    });

    const patientMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: patientIdentity.id,
        displayName: "Jane Patient",
        status: "ACTIVE",
        workspaceCodes: ["PATIENT"],
        primaryWorkspace: "PATIENT",
      },
    });

    await database.patientAccess.create({
      data: {
        patientId: patient.id,
        identityId: patientIdentity.id,
        relationship: "self",
        isPrimary: true,
        isActive: true,
      },
    });

    // 4. Caregiver setup
    const caregiverIdentity = await database.identity.create({
      data: {
        email: `caregiver-${Date.now()}@test.org`,
        normalizedEmail: `caregiver-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const caregiverMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: caregiverIdentity.id,
        displayName: "Mary Caregiver",
        status: "ACTIVE",
        workspaceCodes: ["PATIENT"],
        primaryWorkspace: "PATIENT",
      },
    });

    await database.patientAccess.create({
      data: {
        patientId: patient.id,
        identityId: caregiverIdentity.id,
        relationship: "daughter",
        isPrimary: false,
        isActive: true,
      },
    });

    const doctorContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-${Date.now()}`,
      userId: doctorIdentity.id,
      identityId: doctorIdentity.id,
      membershipId: doctorMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000001`,
      tenantId: tenant.id,
      organizationId: org.id,
      branchId: branch.id,
      workspace: "DOCTOR",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: ["careplans.manage", "careplans.read"],
      sourceApplication: "web",
    };

    const patientContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-${Date.now()}`,
      userId: patientIdentity.id,
      identityId: patientIdentity.id,
      membershipId: patientMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000002`,
      tenantId: tenant.id,
      organizationId: org.id,
      branchId: branch.id,
      workspace: "PATIENT",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: [],
      sourceApplication: "web",
    };

    const caregiverContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-${Date.now()}`,
      userId: caregiverIdentity.id,
      identityId: caregiverIdentity.id,
      membershipId: caregiverMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000003`,
      tenantId: tenant.id,
      organizationId: org.id,
      branchId: branch.id,
      workspace: "PATIENT",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: [],
      sourceApplication: "web",
    };

    try {
      // 5. Seed templates & instantiate Post-Op Surgery Plan
      const templates = await carePlanService.listTemplates(doctorContext);
      const surgeryTemplate = templates.find((t) => t.category === "SURGERY_POSTOP")!;
      expect(surgeryTemplate).toBeDefined();

      const todayIso = new Date().toISOString();
      const plan = await carePlanService.instantiatePlan(doctorContext, {
        templateId: surgeryTemplate.id,
        patientId: patient.id,
        startDate: todayIso,
        managingDoctorId: doctorProfile.id,
      });

      expect(plan.tasks?.length).toBeGreaterThan(10);

      // 6. Test patient viewing their active plan
      const patientView = await getMyActiveCarePlan(patientContext);
      expect(patientView.carePlan).not.toBeNull();
      expect(patientView.carePlan?.title).toBe(surgeryTemplate.title);
      expect(patientView.carePlan?.managingDoctorName).toBe("Dr. Elizabeth Surgeon");
      expect(patientView.isCaregiver).toBe(false);
      expect(patientView.relationship).toBe("self");
      expect(patientView.carePlan?.tasks.length).toBe(plan.tasks?.length);

      // 7. Test caregiver viewing the delegated plan
      const caregiverView = await getMyActiveCarePlan(caregiverContext);
      expect(caregiverView.carePlan).not.toBeNull();
      expect(caregiverView.isCaregiver).toBe(true);
      expect(caregiverView.relationship).toBe("daughter");
      expect(caregiverView.patient.name).toBe("Jane Patient");

      // 8. Complete Day 1 8:00 AM Vitals task as Patient (120/80)
      const vitalsTask = patientView.carePlan!.tasks.find(
        (t) => t.dayNumber === 1 && t.taskType === "VITALS_LOG",
      )!;
      expect(vitalsTask).toBeDefined();

      const completedVitals = await carePlanService.completeTask(patientContext, vitalsTask.id, {
        observation: {
          code: "blood_pressure_systolic",
          display: "Systolic Blood Pressure",
          valueNumber: 120,
          unit: "mmHg",
        },
        resultData: { diastolic: 80, heartRate: 72 },
      });
      expect(completedVitals.status).toBe("COMPLETED");
      expect(completedVitals.completedAt).not.toBeNull();

      // 9. Complete Day 1 12:00 PM Drain Log task (45 mL serosanguineous)
      const drainTask = patientView.carePlan!.tasks.find(
        (t) => t.dayNumber === 1 && t.taskType === "DRAIN_LOG",
      )!;
      expect(drainTask).toBeDefined();

      const completedDrain = await carePlanService.completeTask(patientContext, drainTask.id, {
        observation: {
          code: "drain_output",
          display: "Surgical Drain Output",
          valueNumber: 45,
          unit: "mL",
        },
        resultData: { character: "serosanguineous", clarity: "clear", painScore: 2 },
      });
      expect(completedDrain.status).toBe("COMPLETED");
      expect(completedDrain.completedAt).not.toBeNull();

      // 10. Complete Day 1 2:00 PM Wound Photo task
      const woundTask = patientView.carePlan!.tasks.find(
        (t) => t.dayNumber === 1 && t.taskType === "WOUND_PHOTO",
      )!;
      expect(woundTask).toBeDefined();

      const completedWound = await carePlanService.completeTask(patientContext, woundTask.id, {
        resultData: {
          photoAttached: true,
          redness: false,
          swelling: false,
          warmth: false,
          discharge: false,
        },
      });
      expect(completedWound.status).toBe("COMPLETED");
      expect(completedWound.completedAt).not.toBeNull();
    } finally {
      // Clean up
      await database.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanAlert.deleteMany({ where: { tenantId: tenant.id } });
      await database.clinicalObservation.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanTask.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlan.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanTemplate.deleteMany({ where: { tenantId: tenant.id } });
      await database.patientAccess.deleteMany({ where: { patientId: patient.id } });
      await database.patient.deleteMany({ where: { tenantId: tenant.id } });
      await database.doctorProfile.deleteMany({ where: { tenantId: tenant.id } });
      await database.staffProfile.deleteMany({ where: { tenantId: tenant.id } });
      await database.tenantMembership.deleteMany({ where: { tenantId: tenant.id } });
      await database.branch.deleteMany({ where: { tenantId: tenant.id } });
      await database.organization.deleteMany({ where: { tenantId: tenant.id } });
      await database.tenant.deleteMany({ where: { id: tenant.id } });
      await database.identity.deleteMany({
        where: { id: { in: [doctorIdentity.id, patientIdentity.id, caregiverIdentity.id] } },
      });
    }
  });
});
