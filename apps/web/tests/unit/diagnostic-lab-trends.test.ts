import { database } from "@wonflow/database";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { labResultService } from "../../src/server/clinical/lab-result-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Results Ledger & Lab Trends (Task C-07)", () => {
  const testRunId = `test-lab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let tenantId: string;
  let orgId: string;
  let branchId: string;
  let staffIdentityId: string;
  let staffMembershipId: string;
  let patientIdentityId: string;
  let patientMembershipId: string;
  let patientId: string;

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

    // 3. Create Doctor Staff Identity & Membership
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

    staffMembershipId = staffMembership.id;


    // 4. Create Patient Identity & Patient Record
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
        givenName: "Ahmed",
        familyName: "Khan",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
        dateOfBirth: new Date("1980-05-12"),
        phone: "+923001234567",
      },
    });



    patientId = patient.id;

    const patientMembership = await database.tenantMembership.create({
      data: {
        tenantId,
        organizationId: org.id,
        identityId: patientIdentity.id,
        displayName: "Ahmed Khan",
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
  });

  afterEach(async () => {
    await database.auditEvent.deleteMany({ where: { tenantId } });
    await database.drainLog.deleteMany({ where: { tenantId } });
    await database.patientDrain.deleteMany({ where: { tenantId } });
    await database.diagnosticResult.deleteMany({ where: { tenantId } });
    await database.diagnosticOrder.deleteMany({ where: { tenantId } });
    await database.patientAccess.deleteMany({ where: { patientId } });
    await database.patient.deleteMany({ where: { tenantId } });
    await database.tenantMembership.deleteMany({ where: { tenantId } });
    await database.branch.deleteMany({ where: { tenantId } });
    await database.organization.deleteMany({ where: { tenantId } });
    await database.tenant.deleteMany({ where: { id: tenantId } });
    const ids = [staffIdentityId, patientIdentityId].filter(Boolean);
    if (ids.length > 0) {
      await database.identity.deleteMany({ where: { id: { in: ids } } });
    }
  });


  it("records structured lab results, tracks clinician confirmation for patient-reported entries, and calculates multi-marker trends", async () => {
    const clinicianContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-doc-${Date.now()}`,
      userId: staffIdentityId,
      identityId: staffIdentityId,
      membershipId: staffMembershipId,
      sessionId: `00000000-0000-0000-0000-000000000052`,
      tenantId,
      organizationId: orgId,
      branchId,
      workspace: "DOCTOR",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: [],
      sourceApplication: "web",
    };

    const patientContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-pat-${Date.now()}`,
      userId: patientIdentityId,
      identityId: patientIdentityId,
      membershipId: patientMembershipId,
      sessionId: `00000000-0000-0000-0000-000000000051`,
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


    // 1. Staff enters Day 1 Bilirubin (Normal)
    const day1Result = await labResultService.recordLabResult(clinicianContext, {
      patientId,
      code: "BILIRUBIN_TOTAL",
      value: 0.9,
      collectedAt: new Date("2026-08-20T08:00:00Z").toISOString(),
      sourceFacility: "In-House Lab",
      entryRoute: "STAFF_ENTERED",
    });

    expect(day1Result.abnormalFlag).toBe("NORMAL");
    expect(day1Result.isConfirmedByClinician).toBe(true);
    expect(day1Result.unit).toBe("mg/dL");

    // 2. Staff enters Day 2 Bilirubin (Elevated - Post-operative obstruction monitoring)
    const day2Result = await labResultService.recordLabResult(clinicianContext, {
      patientId,
      code: "BILIRUBIN_TOTAL",
      value: 2.8,
      collectedAt: new Date("2026-08-22T08:00:00Z").toISOString(),
      sourceFacility: "In-House Lab",
      entryRoute: "STAFF_ENTERED",
    });

    expect(day2Result.abnormalFlag).toBe("HIGH");
    expect(day2Result.isConfirmedByClinician).toBe(true);

    // 3. Patient self-enters Day 3 Bilirubin from external lab report (Chughtai Lab)
    const day3PatientReported = await labResultService.recordLabResult(patientContext, {
      patientId,
      code: "BILIRUBIN_TOTAL",
      value: 1.4,
      collectedAt: new Date("2026-08-24T08:00:00Z").toISOString(),
      sourceFacility: "Chughtai Lab",
      entryRoute: "PATIENT_REPORTED",
    });

    expect(day3PatientReported.abnormalFlag).toBe("HIGH");
    expect(day3PatientReported.isConfirmedByClinician).toBe(false);
    expect(day3PatientReported.entryRoute).toBe("PATIENT_REPORTED");

    // 4. Clinician confirms the patient-reported result
    const confirmedResult = await labResultService.confirmPatientLabResult(
      clinicianContext,
      day3PatientReported.id,
    );

    expect(confirmedResult.isConfirmedByClinician).toBe(true);
    expect(confirmedResult.confirmedByMembershipId).toBe(staffMembershipId);

    // 5. Patient has a surgical drain with fluid amylase (ISGPS pancreatic fistula telemetry)
    const drain = await database.patientDrain.create({
      data: {
        tenantId,
        patientId,
        label: "Subhepatic Drain #1",
        site: "Right upper quadrant",
        insertedAt: new Date("2026-08-20T06:00:00Z"),
        isActive: true,
      },
    });

    await database.drainLog.create({
      data: {
        tenantId,
        patientId,
        drainId: drain.id,
        recordedAt: new Date("2026-08-23T10:00:00Z"),
        volumeMl: 150,
        colour: "PALE_YELLOW",
        character: "SEROSANGUINOUS",
        amylaseValue: 420,
        amylaseUnit: "U/L",
        amylaseSource: "PATIENT_REPORTED",
        source: "PATIENT",
        status: "FINAL",
      },
    });

    // 6. Fetch multi-marker lab trends
    const trendGroups = await labResultService.getPatientLabTrends(clinicianContext, patientId);

    expect(trendGroups.length).toBeGreaterThan(0);

    const liverGroup = trendGroups.find((g) => g.groupName === "Liver Function");
    expect(liverGroup).toBeDefined();

    const biliSeries = liverGroup?.series.find((s) => s.code === "BILIRUBIN_TOTAL");
    expect(biliSeries).toBeDefined();
    expect(biliSeries?.points).toHaveLength(3);
    // Verifies chronological ordering across three dates
    expect(biliSeries?.points[0]!.value).toBe(0.9);
    expect(biliSeries?.points[1]!.value).toBe(2.8);
    expect(biliSeries?.points[2]!.value).toBe(1.4);
    expect(biliSeries?.points[2]!.isConfirmed).toBe(true);

    // Verifies Pancreatic Amylase group integrates surgical drain fluid amylase
    const pancreaticGroup = trendGroups.find((g) => g.groupName === "Pancreatic & Drain Amylase");
    expect(pancreaticGroup).toBeDefined();
    const amylaseSeries = pancreaticGroup?.series.find((s) => s.code === "AMYLASE_DRAIN");
    expect(amylaseSeries).toBeDefined();
    expect(amylaseSeries?.points).toHaveLength(1);
    expect(amylaseSeries?.points[0]!.value).toBe(420);
    expect(amylaseSeries?.points[0]!.abnormalFlag).toBe("CRITICAL_HIGH"); // >= 300 ISGPS Fistula threshold

    // 7. Verify Audit Events
    const audits = await database.auditEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    expect(audits.some((a) => a.action === "clinical.lab_result.recorded")).toBe(true);
    expect(audits.some((a) => a.action === "clinical.lab_result.confirmed")).toBe(true);
  });
});
