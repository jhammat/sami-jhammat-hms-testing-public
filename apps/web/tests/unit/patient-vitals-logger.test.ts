import { database } from "@wonflow/database";
import { describe, expect, it } from "vitest";
import { ObservationService } from "@/server/clinical/observation-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Patient Vitals Logging & Clinician Trends (Task C-03)", () => {
  const observationService = new ObservationService();

  it("records preliminary vitals series, generates trend time-series, and supports clinician confirmation", async () => {
    const uniqueSlug = `vitals-tenant-${Date.now()}`;

    // 1. Setup Tenant, Org, Branch
    const tenant = await database.tenant.create({
      data: {
        slug: uniqueSlug,
        displayName: "Cardio Care Hospital",
        status: "ACTIVE",
        defaultTimezone: "UTC",
        defaultCurrencyCode: "PKR",
      },
    });

    const org = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "CARDIO-ORG",
        displayName: "Cardiology Department",
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
        email: `cardiologist-${Date.now()}@test.org`,
        normalizedEmail: `cardiologist-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const doctorMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: doctorIdentity.id,
        displayName: "Dr. Marcus Vance",
        status: "ACTIVE",
        workspaceCodes: ["DOCTOR"],
        primaryWorkspace: "DOCTOR",
      },
    });

    // 3. Patient setup
    const patientIdentity = await database.identity.create({
      data: {
        email: `vitals-patient-${Date.now()}@test.org`,
        normalizedEmail: `vitals-patient-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `PAT-VIT-${Date.now()}`,
        givenName: "Thomas",
        familyName: "Anderson",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
      },
    });

    const patientMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: patientIdentity.id,
        displayName: "Thomas Anderson",
        status: "ACTIVE",
        workspaceCodes: ["PATIENT"],
        primaryWorkspace: "PATIENT",
      },
    });

    const patientContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-${Date.now()}`,
      userId: patientIdentity.id,
      identityId: patientIdentity.id,
      membershipId: patientMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000020`,
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
      requestId: `req-${Date.now()}`,
      userId: doctorIdentity.id,
      identityId: doctorIdentity.id,
      membershipId: doctorMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000021`,
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
      // 4. Record 7 days of daily vitals as Patient
      const baseTime = Date.now() - 7 * 86_400_000;
      let sampleObservationId: string | null = null;

      for (let day = 0; day < 7; day++) {
        const obsTime = new Date(baseTime + day * 86_400_000);

        const sysObs = await observationService.recordObservation(patientContext, {
          patientId: patient.id,
          code: "blood_pressure_systolic",
          display: "Systolic Blood Pressure",
          valueNumber: 120 + day * 2,
          unit: "mmHg",
          observedAt: obsTime,
          source: "PATIENT",
        });

        if (day === 0) {
          sampleObservationId = sysObs.id;
        }

        expect(sysObs.status).toBe("PRELIMINARY");
        expect(sysObs.source).toBe("PATIENT");

        await observationService.recordObservation(patientContext, {
          patientId: patient.id,
          code: "pulse",
          display: "Pulse / Heart Rate",
          valueNumber: 70 + (day % 3) * 2,
          unit: "bpm",
          observedAt: obsTime,
          source: "PATIENT",
        });

        await observationService.recordObservation(patientContext, {
          patientId: patient.id,
          code: "temperature",
          display: "Body Temperature",
          valueNumber: 36.5 + (day % 2) * 0.2,
          unit: "°C",
          observedAt: obsTime,
          source: "PATIENT",
        });
      }

      // 5. Patient lists their own observation history
      const patientHistory = await observationService.listPatientObservations(patientContext, patient.id);
      expect(patientHistory.length).toBe(21); // 3 vitals * 7 days

      // 6. Clinician queries trend series
      const trends = await observationService.getPatientObservationTrends(doctorContext, patient.id, {
        codes: ["blood_pressure_systolic", "pulse", "temperature"],
        startDate: new Date(baseTime - 86_400_000),
        endDate: new Date(),
      });

      expect(trends.length).toBe(3);

      const bpTrend = trends.find((t) => t.code === "blood_pressure_systolic")!;
      expect(bpTrend).toBeDefined();
      expect(bpTrend.points.length).toBe(7);
      expect(bpTrend.points[0]!.valueNumber).toBe(120);
      expect(bpTrend.points[6]!.valueNumber).toBe(132);
      expect(bpTrend.latestPoint?.valueNumber).toBe(132);

      const pulseTrend = trends.find((t) => t.code === "pulse")!;
      expect(pulseTrend.points.length).toBe(7);

      // 7. Clinician promotes preliminary observation to FINAL
      expect(sampleObservationId).not.toBeNull();
      const confirmed = await observationService.confirmObservation(doctorContext, sampleObservationId!);
      expect(confirmed.status).toBe("FINAL");

      // Verify audit
      const audit = await database.auditEvent.findFirst({
        where: {
          tenantId: tenant.id,
          action: "clinical.observation.confirmed",
          entityId: sampleObservationId!,
        },
      });
      expect(audit).not.toBeNull();
    } finally {
      // Clean up
      await database.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await database.clinicalObservation.deleteMany({ where: { tenantId: tenant.id } });
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
