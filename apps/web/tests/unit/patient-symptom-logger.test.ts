import { database } from "@wonflow/database";
import { describe, expect, it } from "vitest";
import { SymptomService } from "@/server/clinical/symptom-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Patient Symptom Logging & Combined Recovery Timeline (Task C-06)", () => {
  const symptomService = new SymptomService();

  it("records patient symptoms and unifies them with vitals and drains on clinician recovery timeline", async () => {
    const uniqueSlug = `symptom-tenant-${Date.now()}`;

    // 1. Setup Tenant, Org, Branch
    const tenant = await database.tenant.create({
      data: {
        slug: uniqueSlug,
        displayName: "HPB Surgical Recovery Center",
        status: "ACTIVE",
        defaultTimezone: "UTC",
        defaultCurrencyCode: "PKR",
      },
    });

    const org = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "HPB-SURG-ORG",
        displayName: "Pancreatobiliary Unit",
        status: "ACTIVE",
      },
    });

    const branch = await database.branch.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        code: "MAIN",
        name: "Main Surgical Hospital",
        isMainBranch: true,
        status: "ACTIVE",
      },
    });

    // 2. Doctor Setup
    const doctorIdentity = await database.identity.create({
      data: {
        email: `surg-doc-${Date.now()}@test.org`,
        normalizedEmail: `surg-doc-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const doctorMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: doctorIdentity.id,
        displayName: "Dr. Tariq Mahmood",
        status: "ACTIVE",
        workspaceCodes: ["DOCTOR"],
        primaryWorkspace: "DOCTOR",
      },
    });

    // 3. Patient Setup
    const patientIdentity = await database.identity.create({
      data: {
        email: `hpb-pat-${Date.now()}@test.org`,
        normalizedEmail: `hpb-pat-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `PAT-HPB-${Date.now()}`,
        givenName: "Kamran",
        familyName: "Akmal",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
      },
    });

    const patientMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: patientIdentity.id,
        displayName: "Kamran Akmal",
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


    const patientContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-pat-${Date.now()}`,
      userId: patientIdentity.id,
      identityId: patientIdentity.id,
      membershipId: patientMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000051`,
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

    const doctorContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-doc-${Date.now()}`,
      userId: doctorIdentity.id,
      identityId: doctorIdentity.id,
      membershipId: doctorMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000052`,
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

    try {
      // 4. Patient logs 3 symptoms
      // Symptom 1: Pain
      const painLog = await symptomService.recordSymptomLog(patientContext, {
        symptomCode: "pain",
        severityScore: 8,
        freeText: "Upper quadrant stabbing discomfort post-lunch",
      });
      expect(painLog.severityLabel).toBe("SEVERE");
      expect(painLog.source).toBe("PATIENT");

      // Symptom 2: Fever / chills
      const feverLog = await symptomService.recordSymptomLog(patientContext, {
        symptomCode: "fever",
        severityScore: 6,
        freeText: "Shivering and hot forehead",
      });
      expect(feverLog.severityLabel).toBe("MODERATE");

      // Symptom 3: Steatorrhoea (PERT / Creon insufficiency)
      const stoolLog = await symptomService.recordSymptomLog(patientContext, {
        symptomCode: "steatorrhoea",
        severityScore: 5,
        freeText: "Pale, floating stool after greasy soup",
      });
      expect(stoolLog.severityLabel).toBe("MODERATE");

      // Verify audit trail
      const audit = await database.auditEvent.findFirst({
        where: {
          tenantId: tenant.id,
          action: "clinical.symptom.recorded",
          entityId: painLog.id,
        },
      });
      expect(audit).not.toBeNull();

      // 5. Patient logs a high temperature vital
      await database.clinicalObservation.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          recordedByIdentityId: patientIdentity.id,
          code: "BODY_TEMPERATURE",
          display: "Body Temperature",
          valueNumber: 38.4,
          unit: "degC",
          observedAt: new Date(Date.now() + 1000),
          status: "PRELIMINARY",
          source: "PATIENT",
        },
      });





      // 6. Patient logs a drain with high amylase (ISGPS pancreatic fistula)
      const drain = await database.patientDrain.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          label: "Pancreatic Bed Jackson-Pratt Drain",
          site: "Right upper quadrant",
          insertedAt: new Date(Date.now() - 5 * 86_400_000), // POD 5
          isActive: true,
        },
      });

      await database.drainLog.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          drainId: drain.id,
          recordedAt: new Date(Date.now() + 2000),
          volumeMl: 220,
          colour: "PALE_YELLOW",
          character: "SEROSANGUINOUS",
          amylaseValue: 450,
          amylaseUnit: "U/L",
          amylaseSource: "PATIENT_REPORTED",
          source: "PATIENT",
          status: "PRELIMINARY",
        },
      });



      // 7. Clinician retrieves combined recovery timeline
      const timeline = await symptomService.getCombinedRecoveryTimeline(doctorContext, patient.id);

      // Total items = 3 symptoms + 1 vital + 1 drain = 5 timeline items
      expect(timeline.length).toBe(5);

      // Verify timeline contains vital, drain, and symptom types
      const hasVital = timeline.some((item) => item.itemType === "VITAL");
      const hasDrain = timeline.some((item) => item.itemType === "DRAIN");
      const hasSymptom = timeline.some((item) => item.itemType === "SYMPTOM");

      expect(hasVital).toBe(true);
      expect(hasDrain).toBe(true);
      expect(hasSymptom).toBe(true);

      // Verify Critical and Warning flags:
      // Drain with amylase 450 U/L must trigger CRITICAL
      const drainItem = timeline.find((item) => item.itemType === "DRAIN")!;
      expect(drainItem.severityLevel).toBe("CRITICAL");

      // High Temp 38.4°C must trigger CRITICAL or WARNING
      const tempItem = timeline.find((item) => item.itemType === "VITAL")!;
      expect(tempItem.severityLevel).toBe("CRITICAL");

      // Severe pain (score 8) must trigger WARNING
      const painItem = timeline.find((item) => item.title.includes("Pain"))!;
      expect(painItem.severityLevel).toBe("WARNING");
    } finally {
      // Clean up
      await database.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await database.drainLog.deleteMany({ where: { tenantId: tenant.id } });
      await database.patientDrain.deleteMany({ where: { tenantId: tenant.id } });
      await database.clinicalObservation.deleteMany({ where: { tenantId: tenant.id } });
      await database.symptomLog.deleteMany({ where: { tenantId: tenant.id } });
      await database.patientAccess.deleteMany({ where: { patientId: patient.id } });
      await database.patient.deleteMany({ where: { tenantId: tenant.id } });
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
