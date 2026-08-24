import { database } from "@wonflow/database";
import { describe, expect, it } from "vitest";
import { CarePlanService } from "@/server/clinical/care-plan-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Clinician Care Plan Monitor & Alert Management (Task C-03)", () => {
  const carePlanService = new CarePlanService();

  it("lists active roster, displays trend summaries, manages alert lifecycle, and adds progress notes", async () => {
    const uniqueSlug = `monitor-tenant-${Date.now()}`;

    // 1. Setup Tenant, Org, Branch
    const tenant = await database.tenant.create({
      data: {
        slug: uniqueSlug,
        displayName: "Clinician Monitor Hospital",
        status: "ACTIVE",
        defaultTimezone: "UTC",
        defaultCurrencyCode: "PKR",
      },
    });

    const org = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "MON-ORG",
        displayName: "Surgical Monitoring Org",
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

    // 2. Doctor setup
    const doctorIdentity = await database.identity.create({
      data: {
        email: `surgeon-mon-${Date.now()}@test.org`,
        normalizedEmail: `surgeon-mon-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const doctorMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: doctorIdentity.id,
        displayName: "Dr. Alexander Ross",
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
        employeeNumber: `EMP-MON-${Date.now()}`,
        staffType: "DOCTOR",
        status: "ACTIVE",
      },
    });

    const doctorProfile = await database.doctorProfile.create({
      data: {
        tenantId: tenant.id,
        staffProfileId: staffProfile.id,
        registrationNumber: `SURG-MON-${Date.now()}`,
        specialty: "General Surgery",
      },
    });

    // 3. Patient setup
    const patientIdentity = await database.identity.create({
      data: {
        email: `mon-patient-${Date.now()}@test.org`,
        normalizedEmail: `mon-patient-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `MRN-${Date.now()}`,
        givenName: "Robert",
        familyName: "Chen",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
      },
    });

    const doctorContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-${Date.now()}`,
      userId: doctorIdentity.id,
      identityId: doctorIdentity.id,
      membershipId: doctorMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000010`,
      tenantId: tenant.id,
      organizationId: org.id,
      branchId: branch.id,
      workspace: "DOCTOR",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: ["careplans.manage", "careplans.read", "alerts.manage"],
      sourceApplication: "web",
    };

    try {
      // 4. Instantiate care plan
      const templates = await carePlanService.listTemplates(doctorContext);
      const postOpTemplate = templates.find((t) => t.category === "SURGERY_POSTOP")!;
      expect(postOpTemplate).toBeDefined();

      const plan = await carePlanService.instantiatePlan(doctorContext, {
        templateId: postOpTemplate.id,
        patientId: patient.id,
        startDate: new Date().toISOString(),
        managingDoctorId: doctorProfile.id,
      });

      // 5. Complete Vitals with CRITICAL high systolic BP (190 mmHg) to trigger rule
      const vitalsTask = plan.tasks!.find((t) => t.taskType === "VITALS_LOG")!;
      await carePlanService.completeTask(doctorContext, vitalsTask.id, {
        observation: {
          code: "blood_pressure_systolic",
          display: "Systolic Blood Pressure",
          valueNumber: 190,
          unit: "mmHg",
        },
        resultData: { systolic: 190, diastolic: 105, heartRate: 98, temperature: 37.1 },
      });

      // 6. Complete Drain task (60 mL)
      const drainTask = plan.tasks!.find((t) => t.taskType === "DRAIN_LOG")!;
      await carePlanService.completeTask(doctorContext, drainTask.id, {
        observation: {
          code: "drain_output",
          display: "Surgical Drain Output",
          valueNumber: 60,
          unit: "mL",
        },
        resultData: { volume: 60, character: "serosanguineous", painScore: 3 },
      });

      // 7. Check Active Care Plan Roster
      const roster = await carePlanService.listActiveCarePlanRoster(doctorContext);
      expect(roster.length).toBe(1);
      const item = roster[0]!;
      expect(item.patientName).toBe("Robert Chen");
      expect(item.managingDoctorName).toBe("Dr. Alexander Ross");
      expect(item.highestAlertSeverity).toBe("CRITICAL");
      expect(item.activeAlertCount).toBeGreaterThanOrEqual(1);
      expect(item.lastVitalsSummary).toContain("190/105 mmHg");
      expect(item.lastDrainSummary).toContain("60 mL");

      // 8. Fetch Plan Details with Alerts
      const planDetail = await carePlanService.getPlan(doctorContext, plan.id);
      expect(planDetail.alerts?.length).toBeGreaterThanOrEqual(1);
      const criticalAlert = planDetail.alerts!.find((a) => a.severity === "CRITICAL")!;
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert.status).toBe("OPEN");

      // 9. Acknowledge the alert with clinical note
      const acknowledged = await carePlanService.acknowledgeAlert(
        doctorContext,
        criticalAlert.id,
        "Reviewed with patient, adjusting medication",
      );
      expect(acknowledged.status).toBe("ACKNOWLEDGED");
      expect(acknowledged.acknowledgedAt).not.toBeNull();
      expect(acknowledged.resolutionNotes).toBe("Reviewed with patient, adjusting medication");

      // 10. Resolve the alert
      const resolved = await carePlanService.resolveAlert(
        doctorContext,
        criticalAlert.id,
        "Patient vitals stabilized following antihypertensive titration",
      );
      expect(resolved.status).toBe("RESOLVED");
      expect(resolved.resolvedAt).not.toBeNull();

      // 11. Add progress note to care plan
      const withNote = await carePlanService.addProgressNote(
        doctorContext,
        plan.id,
        "Incision clean and dry. Drain scheduled for removal on Day 4.",
      );
      expect(withNote.progressNotes?.length).toBe(1);
      expect(withNote.progressNotes![0]!.authorName).toBe("Dr. Alexander Ross");
      expect(withNote.progressNotes![0]!.note).toBe("Incision clean and dry. Drain scheduled for removal on Day 4.");

      // 12. Recheck roster — alert count should now be 0 with status OK / NONE
      const updatedRoster = await carePlanService.listActiveCarePlanRoster(doctorContext);
      expect(updatedRoster[0]!.highestAlertSeverity).toBe("NONE");
      expect(updatedRoster[0]!.activeAlertCount).toBe(0);
    } finally {
      // Clean up
      await database.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanAlert.deleteMany({ where: { tenantId: tenant.id } });
      await database.clinicalObservation.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanTask.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlan.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanTemplate.deleteMany({ where: { tenantId: tenant.id } });
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
