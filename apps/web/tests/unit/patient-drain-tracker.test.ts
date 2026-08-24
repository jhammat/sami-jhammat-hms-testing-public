import { database } from "@wonflow/database";
import { describe, expect, it } from "vitest";
import { DrainService } from "@/server/clinical/drain-service";
import { CarePlanService } from "@/server/clinical/care-plan-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Surgical Drain Tracker & ISGPS Fistula Monitoring (Task C-04)", () => {
  const drainService = new DrainService();
  const carePlanService = new CarePlanService();

  it("inserts multi-drains, tracks 5-day colour & volume progression, triggers ISGPS fistula alert, and supports removal", async () => {
    const uniqueSlug = `drain-tenant-${Date.now()}`;

    // 1. Setup Tenant, Org, Branch
    const tenant = await database.tenant.create({
      data: {
        slug: uniqueSlug,
        displayName: "HPB Surgical Institute",
        status: "ACTIVE",
        defaultTimezone: "UTC",
        defaultCurrencyCode: "PKR",
      },
    });

    const org = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "HPB-SURGERY",
        displayName: "HPB & Transplant Surgery",
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
        email: `hpb-surgeon-${Date.now()}@test.org`,
        normalizedEmail: `hpb-surgeon-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const doctorMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: doctorIdentity.id,
        displayName: "Prof. Tariq Mahmood",
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
        specialty: "HPB Surgery",
      },
    });

    // 3. Patient Setup
    const patientIdentity = await database.identity.create({
      data: {
        email: `hpb-patient-${Date.now()}@test.org`,
        normalizedEmail: `hpb-patient-${Date.now()}@test.org`,
        status: "ACTIVE",
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `PAT-HPB-${Date.now()}`,
        givenName: "Haris",
        familyName: "Rauf",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
      },
    });

    const patientMembership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        organizationId: org.id,
        identityId: patientIdentity.id,
        displayName: "Haris Rauf",
        status: "ACTIVE",
        workspaceCodes: ["PATIENT"],
        primaryWorkspace: "PATIENT",
      },
    });

    const doctorContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-doc-${Date.now()}`,
      userId: doctorIdentity.id,
      identityId: doctorIdentity.id,
      membershipId: doctorMembership.id,
      sessionId: `00000000-0000-0000-0000-000000000031`,
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
      sessionId: `00000000-0000-0000-0000-000000000032`,
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
      // 4. Create an active CarePlan for the patient (so alert rules link to care plan)
      const carePlan = await carePlanService.instantiatePlan(doctorContext, {
        patientId: patient.id,
        title: "Post-Whipple Recovery Pathway",
        managingDoctorId: doctorProfile.id,
      });




      // 5. Clinician inserts two surgical drains
      const drain1 = await drainService.insertDrain(doctorContext, {
        patientId: patient.id,
        label: "Drain 1",
        site: "Left Subhepatic / Pancreaticojejunostomy",
        notes: "19Fr Blake drain on closed bulb suction",
      });

      const drain2 = await drainService.insertDrain(doctorContext, {
        patientId: patient.id,
        label: "Drain 2",
        site: "Morrison's Pouch / Biliary Anastomosis",
        notes: "19Fr Blake drain on active suction",
      });

      expect(drain1.isActive).toBe(true);
      expect(drain2.isActive).toBe(true);

      // Verify insertion audit event
      const insertAudit = await database.auditEvent.findFirst({
        where: {
          tenantId: tenant.id,
          action: "clinical.drain.inserted",
          entityId: drain1.id,
        },
      });
      expect(insertAudit).not.toBeNull();

      // 6. Log 5 days of output for Drain 1 as Patient
      // Day 1 to 3: Straw/Pale Yellow, decreasing volume
      // Day 4: Sudden color change to BILIOUS/GREEN
      // Day 5: Amylase recorded at 1450 U/L (Triggers ISGPS Pancreatic Fistula alert!)
      const baseTime = Date.now() - 5 * 86_400_000;

      // Day 1
      await drainService.recordDrainLog(patientContext, {
        drainId: drain1.id,
        recordedAt: new Date(baseTime + 1 * 86_400_000).toISOString(),
        volumeMl: 180,
        colour: "PALE_YELLOW",
        character: "SEROSANGUINOUS",
      });

      // Day 2
      await drainService.recordDrainLog(patientContext, {
        drainId: drain1.id,
        recordedAt: new Date(baseTime + 2 * 86_400_000).toISOString(),
        volumeMl: 120,
        colour: "PALE_YELLOW",
        character: "SEROUS",
      });

      // Day 3
      await drainService.recordDrainLog(patientContext, {
        drainId: drain1.id,
        recordedAt: new Date(baseTime + 3 * 86_400_000).toISOString(),
        volumeMl: 90,
        colour: "PALE_YELLOW",
        character: "SEROUS",
      });

      // Day 4: Colour change to GREEN (Bile leak alert)
      await drainService.recordDrainLog(patientContext, {
        drainId: drain1.id,
        recordedAt: new Date(baseTime + 4 * 86_400_000).toISOString(),
        volumeMl: 110,
        colour: "GREEN",
        character: "BILIOUS",
      });

      // Day 5: High Amylase (1450 U/L) -> ISGPS Fistula Alert
      await drainService.recordDrainLog(patientContext, {
        drainId: drain1.id,
        recordedAt: new Date(baseTime + 5 * 86_400_000).toISOString(),
        volumeMl: 220,
        colour: "PALE_YELLOW",
        character: "SEROUS",
        amylaseValue: 1450,
        amylaseUnit: "U/L",
        amylaseSource: "LAB_CONFIRMED",
      });

      // Log 2 days of output for Drain 2
      await drainService.recordDrainLog(patientContext, {
        drainId: drain2.id,
        recordedAt: new Date(baseTime + 1 * 86_400_000).toISOString(),
        volumeMl: 60,
        colour: "PALE_YELLOW",
        character: "SEROUS",
      });

      await drainService.recordDrainLog(patientContext, {
        drainId: drain2.id,
        recordedAt: new Date(baseTime + 2 * 86_400_000).toISOString(),
        volumeMl: 25,
        colour: "CLEAR",
        character: "SEROUS",
      });

      // 7. Clinician queries multi-drain trends
      const multiTrends = await drainService.getMultiDrainTrends(doctorContext, patient.id);
      expect(multiTrends.length).toBe(2);

      const d1Trend = multiTrends.find((t) => t.drain.id === drain1.id)!;
      expect(d1Trend).toBeDefined();
      expect(d1Trend.dailyPoints.length).toBe(5);
      expect(d1Trend.totalCumulativeVolumeMl).toBe(180 + 120 + 90 + 110 + 220); // 720 mL
      expect(d1Trend.hasFistulaAlert).toBe(true);
      expect(d1Trend.hasBileLeakAlert).toBe(true);

      const d2Trend = multiTrends.find((t) => t.drain.id === drain2.id)!;
      expect(d2Trend.dailyPoints.length).toBe(2);
      expect(d2Trend.totalCumulativeVolumeMl).toBe(85);

      // 8. Verify ISGPS Fistula Alert and Bile Leak Alert created on CarePlan
      const alerts = await database.carePlanAlert.findMany({
        where: {
          tenantId: tenant.id,
          carePlanId: carePlan.id,
        },
      });

      expect(alerts.length).toBeGreaterThanOrEqual(2);
      const fistulaAlert = alerts.find((a) => a.title.includes("ISGPS Pancreatic Fistula"));
      expect(fistulaAlert).toBeDefined();
      expect(fistulaAlert?.severity).toBe("CRITICAL");

      const bileAlert = alerts.find((a) => a.title.includes("Bilious Drain Output"));
      expect(bileAlert).toBeDefined();

      // 9. Clinician removes Drain 2
      const removedDrain2 = await drainService.removeDrain(doctorContext, patient.id, drain2.id, {
        notes: "Minimal output <25 mL/day, clear serous fluid. Removed intact under sterile technique.",
      });

      expect(removedDrain2.isActive).toBe(false);
      expect(removedDrain2.removedAt).not.toBeNull();

      // Verify removal audit
      const removeAudit = await database.auditEvent.findFirst({
        where: {
          tenantId: tenant.id,
          action: "clinical.drain.removed",
          entityId: drain2.id,
        },
      });
      expect(removeAudit).not.toBeNull();
    } finally {
      // Clean up
      await database.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanAlert.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanTask.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlan.deleteMany({ where: { tenantId: tenant.id } });
      await database.carePlanTemplate.deleteMany({ where: { tenantId: tenant.id } });
      await database.drainLog.deleteMany({ where: { tenantId: tenant.id } });
      await database.patientDrain.deleteMany({ where: { tenantId: tenant.id } });
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
