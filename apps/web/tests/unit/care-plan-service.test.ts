import { database } from "@wonflow/database";
import { describe, expect, it } from "vitest";
import { CarePlanService } from "@/server/clinical/care-plan-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Care Plan Service & Protocols (Task C-01)", () => {
  const service = new CarePlanService();

  it("rejects template creation if title is empty", async () => {
    const ctx: WonFlowRequestContext = {
      scope: "tenant",
      requestId: "req-careplan-test-1",
      userId: "user-doctor-1",
      identityId: "00000000-0000-0000-0000-000000000001",
      membershipId: "00000000-0000-0000-0000-000000000002",
      sessionId: "sess-test-1",
      tenantId: "00000000-0000-0000-0000-000000000003",
      organizationId: "00000000-0000-0000-0000-000000000004",
      branchId: "00000000-0000-0000-0000-000000000005",
      workspace: "DOCTOR",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: ["careplans.manage", "careplans.read"],
      sourceApplication: "web",
    };

    await expect(
      service.createTemplate(ctx, {
        category: "SURGERY_POSTOP",
        title: "   ",
        durationDays: 14,
        stages: [],
        taskTemplates: [],
        alertRules: [],
      }),
    ).rejects.toThrow("Care plan template title is required.");
  });

  it("executes the full care plan lifecycle: template seeding, instantiation, task completion, observation linking, and alert evaluation", async () => {
    const uniqueSlug = `careplan-tenant-${Date.now()}`;

    // 1. Create Tenant, Organization, Branch
    const tenant = await database.tenant.create({
      data: {
        slug: uniqueSlug,
        displayName: "Care Plan Surgical Center",
        status: "ACTIVE",
        defaultTimezone: "UTC",
        defaultCurrencyCode: "PKR",
      },
    });

    const org = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "SURG-ORG",
        displayName: "Surgical Organization",
        status: "ACTIVE",
      },
    });

    const branch = await database.branch.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        code: "SURG-MAIN",
        name: "Main Surgical Hospital",
        isMainBranch: true,
        status: "ACTIVE",
      },
    });

    // 2. Create Doctor identity, membership, and DoctorProfile
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
        displayName: "Dr. Sarah Surgical",
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
        employeeNumber: `EMP-${Date.now()}`,
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

    // 3. Create Patient
    const patientIdentity = await database.identity.create({
      data: {
        email: `patient-${Date.now()}@test.org`,
        normalizedEmail: `patient-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `PAT-${Date.now()}`,
        givenName: "John",
        familyName: "Doe",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
      },
    });

    const patientMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: patientIdentity.id,
        displayName: "John Doe",
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
        isActive: true,
      },
    });

    const doctorContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-${Date.now()}`,
      userId: doctorIdentity.id,
      identityId: doctorIdentity.id,
      membershipId: doctorMembership.id,
      sessionId: `sess-${Date.now()}`,
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
      sessionId: `sess-${Date.now()}`,
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
      // 4. Seed and list templates
      const templates = await service.listTemplates(doctorContext);
      expect(templates.length).toBeGreaterThanOrEqual(3);

      const surgeryTemplate = templates.find((t) => t.category === "SURGERY_POSTOP");
      expect(surgeryTemplate).toBeDefined();
      expect(surgeryTemplate?.durationDays).toBe(14);
      expect(surgeryTemplate?.stages.length).toBe(3);
      expect(surgeryTemplate?.taskTemplates.length).toBeGreaterThan(10);
      expect(surgeryTemplate?.alertRules.length).toBeGreaterThan(0);

      // 5. Instantiate plan starting today
      const todayIso = new Date().toISOString();
      const plan = await service.instantiatePlan(doctorContext, {
        templateId: surgeryTemplate?.id,
        patientId: patient.id,
        startDate: todayIso,
        managingDoctorId: doctorProfile.id,
      });

      expect(plan.id).toBeDefined();
      expect(plan.patientId).toBe(patient.id);
      expect(plan.managingDoctorId).toBe(doctorProfile.id);
      expect(plan.status).toBe("ACTIVE");
      expect(plan.tasks?.length).toBe(surgeryTemplate?.taskTemplates.length);

      // 6. Verify task generation details
      const firstTask = plan.tasks?.[0];
      expect(firstTask).toBeDefined();
      expect(firstTask?.status).toBe("PENDING");
      expect(firstTask?.dayNumber).toBe(1);

      // 7. Complete task as patient with normal vitals observation
      const completedTask = await service.completeTask(patientContext, firstTask!.id, {
        observation: {
          code: "blood_pressure_systolic",
          display: "Systolic Blood Pressure",
          valueNumber: 120,
          unit: "mmHg",
        },
        resultData: {
          diastolic: 80,
          pulse: 72,
        },
      });

      expect(completedTask.status).toBe("COMPLETED");
      expect(completedTask.completedAt).not.toBeNull();
      expect(completedTask.completedByIdentityId).toBe(patientIdentity.id);
      expect(completedTask.resultData?.observationId).toBeDefined();

      // Check linked observation
      const obsId = completedTask.resultData?.observationId as string;
      const observation = await database.clinicalObservation.findUnique({
        where: { id: obsId },
      });
      expect(observation).not.toBeNull();
      expect(observation?.carePlanTaskId).toBe(firstTask!.id);
      expect(observation?.source).toBe("PATIENT");
      expect(observation?.status).toBe("PRELIMINARY");
      expect(Number(observation?.valueNumber)).toBe(120);

      // Verify no alert generated for normal BP
      const alertsNormal = await database.carePlanAlert.findMany({
        where: { carePlanId: plan.id },
      });
      expect(alertsNormal.length).toBe(0);

      // 8. Complete another task with a critical blood pressure reading (> 180 mmHg)
      const secondTask = plan.tasks?.[1];
      expect(secondTask).toBeDefined();

      const criticalCompletedTask = await service.completeTask(patientContext, secondTask!.id, {
        observation: {
          code: "blood_pressure_systolic",
          display: "Systolic Blood Pressure",
          valueNumber: 195,
          unit: "mmHg",
        },
        resultData: {
          diastolic: 115,
          note: "Patient felt lightheaded and dizzy",
        },
      });

      expect(criticalCompletedTask.status).toBe("COMPLETED");

      // Verify alert was automatically triggered
      const alertsAfter = await database.carePlanAlert.findMany({
        where: { carePlanId: plan.id },
      });
      expect(alertsAfter.length).toBe(1);
      expect(alertsAfter[0]?.severity).toBe("CRITICAL");
      expect(alertsAfter[0]?.status).toBe("OPEN");
      expect(alertsAfter[0]?.patientId).toBe(patient.id);
      expect(alertsAfter[0]?.message).toContain("Severe hypertension");
      expect(alertsAfter[0]?.triggeredByObservationId).toBe(
        criticalCompletedTask.resultData?.observationId as string,
      );
    } finally {
      // Clean up test data
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
        where: { id: { in: [doctorIdentity.id, patientIdentity.id] } },
      });
    }

  });
});
