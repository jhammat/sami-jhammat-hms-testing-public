import { database } from "@wonflow/database";
import { describe, expect, it } from "vitest";
import { MedicationAdherenceService } from "@/server/clinical/medication-adherence-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Medication Reminders & Adherence Tracking (Task C-05)", () => {
  const adherenceService = new MedicationAdherenceService();

  it("generates care plan reminders from prescription, records taken/skipped doses, and computes clinician adherence", async () => {
    const uniqueSlug = `med-tenant-${Date.now()}`;

    // 1. Setup Tenant, Org, Branch
    const tenant = await database.tenant.create({
      data: {
        slug: uniqueSlug,
        displayName: "Post-Op Pharmacy & Care Center",
        status: "ACTIVE",
        defaultTimezone: "UTC",
        defaultCurrencyCode: "PKR",
      },
    });

    const org = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "MED-CARE-ORG",
        displayName: "Surgical Recovery Unit",
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

    // 2. Doctor Setup
    const doctorIdentity = await database.identity.create({
      data: {
        email: `med-doc-${Date.now()}@test.org`,
        normalizedEmail: `med-doc-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const doctorMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: doctorIdentity.id,
        displayName: "Dr. Elena Rostova",
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
        registrationNumber: `REG-${Date.now()}`,
        specialty: "Surgical Oncology",
      },
    });

    // 3. Patient Setup
    const patientIdentity = await database.identity.create({
      data: {
        email: `med-patient-${Date.now()}@test.org`,
        normalizedEmail: `med-patient-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `PAT-MED-${Date.now()}`,
        givenName: "Zahid",
        familyName: "Khan",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
      },
    });

    const patientMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: patientIdentity.id,
        displayName: "Zahid Khan",
        status: "ACTIVE",
        workspaceCodes: ["PATIENT"],
        primaryWorkspace: "PATIENT",
      },
    });

    // 4. Encounter Setup (required for Prescription relation)
    const encounter = await database.encounter.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        patientId: patient.id,
        doctorId: doctorProfile.id,
        status: "IN_PROGRESS",
        startedAt: new Date(),

      },
    });


    // 5. Medications Setup
    const ciproMed = await database.medication.create({
      data: {
        tenantId: tenant.id,
        code: `MED-CIP-${Date.now()}`,
        genericName: "Ciprofloxacin",
        brandName: "Cipro",
        strength: "500mg",
        unit: "tablet",
      },
    });

    const creonMed = await database.medication.create({
      data: {
        tenantId: tenant.id,
        code: `MED-CRE-${Date.now()}`,
        genericName: "Pancreatin (Pancreatic Enzymes)",
        brandName: "Creon 25,000",
        strength: "25000 IU",
        unit: "capsule",
      },
    });

    // 6. Create Prescription with 2 items:
    // Item 1: Ciprofloxacin 500mg TID (three times daily)
    // Item 2: Creon 25000 WITH_MEALS
    const prescription = await database.prescription.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        encounterId: encounter.id,
        doctorId: doctorProfile.id,
        status: "ACTIVE",
        items: {
          create: [
            {
              medicationId: ciproMed.id,
              dose: "500mg",
              frequency: "THREE_TIMES_DAILY",
              instructions: "Take with full glass of water",
            },
            {
              medicationId: creonMed.id,
              dose: "1 capsule",
              frequency: "WITH_MEALS",
              instructions: "Take with first bite of each main meal",
            },
          ],
        },
      },
    });

    const doctorContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-doc-${Date.now()}`,
      userId: doctorIdentity.id,
      identityId: doctorIdentity.id,
      membershipId: doctorMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000041`,
      tenantId: tenant.id,
      organizationId: org.id,
      branchId: branch.id,
      workspace: "DOCTOR",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: ["encounters.manage"],
      sourceApplication: "web",
    };

    const patientContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-pat-${Date.now()}`,
      userId: patientIdentity.id,
      identityId: patientIdentity.id,
      membershipId: patientMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000042`,
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
      // 7. Sync reminders for 7 days
      const syncResult = await adherenceService.generateMedicationTasksFromPrescription(doctorContext, {
        prescriptionId: prescription.id,
        durationDays: 7,
      });

      // 3 doses/day (Cipro) + 3 doses/day (Creon with meals) = 6 doses/day * 7 days = 42 tasks
      expect(syncResult.tasksCreated).toBe(42);

      // Verify audit
      const audit = await database.auditEvent.findFirst({
        where: {
          tenantId: tenant.id,
          action: "clinical.medication.reminders_generated",
          entityId: prescription.id,
        },
      });
      expect(audit).not.toBeNull();

      // 8. Patient checks today's schedule
      const schedule = await adherenceService.getPatientMedicationSchedule(patientContext, patient.id);
      expect(schedule.todayDoses.length).toBe(6);
      expect(schedule.pendingCount).toBe(6);
      expect(schedule.takenCount).toBe(0);

      // 9. Patient records doses:
      // Dose 1: Taken
      const dose1 = schedule.todayDoses[0]!;
      const takenDose1 = await adherenceService.recordDoseTaken(patientContext, dose1.id);
      expect(takenDose1.status).toBe("COMPLETED");

      // Dose 2: Taken
      const dose2 = schedule.todayDoses[1]!;
      await adherenceService.recordDoseTaken(patientContext, dose2.id);

      // Dose 3: Skipped with compassionate non-judgmental reason
      const dose3 = schedule.todayDoses[2]!;
      const skippedDose3 = await adherenceService.recordDoseSkipped(
        patientContext,
        dose3.id,
        "Felt mild nausea after breakfast, paused morning antibiotic",
      );
      expect(skippedDose3.status).toBe("SKIPPED");
      expect(skippedDose3.skipReason).toContain("mild nausea");

      // 10. Patient re-checks schedule
      const updatedSchedule = await adherenceService.getPatientMedicationSchedule(patientContext, patient.id);
      expect(updatedSchedule.takenCount).toBe(2);
      expect(updatedSchedule.skippedCount).toBe(1);
      expect(updatedSchedule.pendingCount).toBe(3);
      // Adherence rate = 2 taken / (2 taken + 1 skipped) = 67%
      expect(updatedSchedule.adherencePercentage).toBe(67);

      // 11. Clinician pulls adherence report
      const clinicianReport = await adherenceService.getClinicianAdherenceReport(doctorContext, patient.id);
      expect(clinicianReport.length).toBe(2); // Ciprofloxacin and Creon

      const ciproReport = clinicianReport.find((m) => m.medicationName.includes("Ciprofloxacin"))!;
      expect(ciproReport).toBeDefined();
      expect(ciproReport.totalPrescribedDoses).toBe(21); // 3 * 7

      const creonReport = clinicianReport.find((m) => m.medicationName.includes("Creon"))!;
      expect(creonReport).toBeDefined();
      expect(creonReport.totalPrescribedDoses).toBe(21); // 3 * 7
    } finally {
      // Clean up
      await database.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanTask.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlan.deleteMany({ where: { tenantId: tenant.id } });
      await database.prescriptionItem.deleteMany({ where: { prescriptionId: prescription.id } });
      await database.prescription.deleteMany({ where: { tenantId: tenant.id } });
      await database.medication.deleteMany({ where: { tenantId: tenant.id } });
      await database.encounter.deleteMany({ where: { tenantId: tenant.id } });
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
