import { describe, expect, it } from "vitest";
import { database } from "@wonflow/database";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import {
  getPatientPortalAccessStatus,
  provisionPatientPortalCredentials,
} from "@/server/patient/patient-portal-credential-service";

describe("Patient Portal Credential Provisioning", () => {
  it("provisions new patient portal login credentials successfully", async () => {
    const tenant = await database.tenant.create({
      data: {
        slug: `test-portal-${Date.now()}`,
        displayName: "Portal Test Clinic",
        defaultTimezone: "Asia/Karachi",
        defaultCurrencyCode: "PKR",
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `P-${Date.now()}`,
        givenName: "PatientPortal",
        familyName: "TestUser",
        email: `portaltest${Date.now()}@example.test`,
        normalizedEmail: `portaltest${Date.now()}@example.test`,
      },
    });

    const mockContext: WonFlowRequestContext = {
      scope: "tenant",
      tenantId: tenant.id,
      organizationId: "00000000-0000-0000-0000-000000000000",
      userId: "00000000-0000-0000-0000-000000000000",
      identityId: "00000000-0000-0000-0000-000000000000",
      branchId: "00000000-0000-0000-0000-000000000000",
      membershipId: "00000000-0000-0000-0000-000000000000",
      sessionId: "00000000-0000-0000-0000-000000000000",
      requestId: `req-${Date.now()}`,
      sourceApplication: "web",
      permissionCodes: ["patients.manage", "patients.read"],
      workspace: "ADMIN",
      locale: "en",
      timezone: "Asia/Karachi",
      currencyCode: "PKR",
    };

    const statusBefore = await getPatientPortalAccessStatus(mockContext, patient.id);
    expect(statusBefore.hasPortalAccess).toBe(false);

    const result = await provisionPatientPortalCredentials(mockContext, patient.id);

    expect(result.patientId).toBe(patient.id);
    expect(result.email).toBe(patient.email);
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(12);

    const statusAfter = await getPatientPortalAccessStatus(mockContext, patient.id);
    expect(statusAfter.hasPortalAccess).toBe(true);

    // Clean up
    await database.patientAccess.deleteMany({ where: { patientId: patient.id } });
    await database.patient.delete({ where: { id: patient.id } });
    await database.tenant.delete({ where: { id: tenant.id } });
  });
});
