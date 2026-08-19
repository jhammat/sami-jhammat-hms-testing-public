import { describe, expect, it } from "vitest";
import { database } from "@wonflow/database";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { authenticateAccount } from "@/lib/auth/account-service";
import {
  getPatientPortalAccessStatus,
  provisionPatientPortalCredentials,
} from "@/server/patient/patient-portal-credential-service";

describe("Patient Portal Credential Provisioning", () => {
  it("provisions new patient portal login credentials successfully and enables patient login", async () => {
    const tenant = await database.tenant.create({
      data: {
        slug: `test-portal-${Date.now()}`,
        displayName: "Portal Test Clinic",
        status: "ACTIVE",
        defaultTimezone: "Asia/Karachi",
        defaultCurrencyCode: "PKR",
      },
    });

    const organization = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "MAIN",
        displayName: "Portal Test Organization",
        status: "ACTIVE",
      },
    });

    const branch = await database.branch.create({
      data: {
        tenantId: tenant.id,
        organizationId: organization.id,
        code: "MAIN",
        name: "Main Branch",
        isMainBranch: true,
        status: "ACTIVE",
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
      organizationId: organization.id,
      userId: "00000000-0000-0000-0000-000000000000",
      identityId: "00000000-0000-0000-0000-000000000000",
      branchId: branch.id,
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

    // Sign-in resolves workspaces from TenantMembership alone. Without this row
    // the patient authenticates and is then refused with "No active workspace
    // is assigned to this account".
    const membership = await database.tenantMembership.findFirst({
      where: { tenantId: tenant.id, identity: { normalizedEmail: result.email } },
    });
    expect(membership?.status).toBe("ACTIVE");
    expect(membership?.workspaceCodes).toEqual(["PATIENT"]);
    expect(membership?.primaryWorkspace).toBe("PATIENT");

    // Verify the patient can log in and gets a valid "patient" workspace context
    const authenticated = await authenticateAccount(result.email, result.temporaryPassword);
    expect(authenticated).not.toBeNull();
    expect(authenticated?.contexts.length).toBe(1);
    expect(authenticated?.contexts[0]?.workspace).toBe("PATIENT");
    expect(authenticated?.contexts[0]?.role).toBe("patient");
    expect(authenticated?.contexts[0]?.homePath).toBe("/patient");

    // Re-provisioning the same patient must stay idempotent.
    const reissued = await provisionPatientPortalCredentials(mockContext, patient.id);
    expect(reissued.email).toBe(result.email);
    expect(
      await database.tenantMembership.count({ where: { tenantId: tenant.id } }),
    ).toBe(1);

    // Clean up
    const identityIds = (
      await database.patientAccess.findMany({ where: { patientId: patient.id }, select: { identityId: true } })
    ).map((access) => access.identityId);
    await database.patientAccess.deleteMany({ where: { patientId: patient.id } });
    await database.tenantMembership.deleteMany({ where: { tenantId: tenant.id } });
    await database.auditEvent.deleteMany({ where: { tenantId: tenant.id } });
    await database.identity.deleteMany({ where: { id: { in: identityIds } } });
    await database.patient.delete({ where: { id: patient.id } });
    await database.branch.delete({ where: { id: branch.id } });
    await database.organization.delete({ where: { id: organization.id } });
    await database.tenant.delete({ where: { id: tenant.id } });
  });

  it("rejects weak custom passwords with HTTP 400 weak-password", async () => {
    const tenant = await database.tenant.create({
      data: {
        slug: `test-weak-pass-${Date.now()}`,
        displayName: "Weak Pass Test Clinic",
        status: "ACTIVE",
      },
    });

    const organization = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "MAIN",
        displayName: "Weak Pass Org",
        status: "ACTIVE",
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `P-${Date.now()}`,
        givenName: "Weak",
        familyName: "Password",
        email: `weakpass${Date.now()}@example.test`,
        normalizedEmail: `weakpass${Date.now()}@example.test`,
      },
    });

    const mockContext: WonFlowRequestContext = {
      scope: "tenant",
      tenantId: tenant.id,
      organizationId: organization.id,
      userId: "00000000-0000-0000-0000-000000000000",
      identityId: "00000000-0000-0000-0000-000000000000",
      branchId: "00000000-0000-0000-0000-000000000000",
      membershipId: "00000000-0000-0000-0000-000000000000",
      sessionId: "00000000-0000-0000-0000-000000000000",
      requestId: `req-${Date.now()}`,
      sourceApplication: "web",
      permissionCodes: ["patients.manage"],
      workspace: "ADMIN",
      locale: "en",
      timezone: "Asia/Karachi",
      currencyCode: "PKR",
    };

    // Short password
    await expect(
      provisionPatientPortalCredentials(mockContext, patient.id, { password: "short" }),
    ).rejects.toMatchObject({
      status: 400,
      code: "weak-password",
      message: "Password must contain at least 12 characters.",
    });

    // Password missing uppercase
    await expect(
      provisionPatientPortalCredentials(mockContext, patient.id, { password: "lowercaseonly123" }),
    ).rejects.toMatchObject({
      status: 400,
      code: "weak-password",
      message: "Password must contain uppercase, lowercase and numeric characters.",
    });

    // Clean up
    await database.patient.delete({ where: { id: patient.id } });
    await database.organization.delete({ where: { id: organization.id } });
    await database.tenant.delete({ where: { id: tenant.id } });
  });

  it("refuses to overwrite existing staff or administrator identities", async () => {
    const tenant = await database.tenant.create({
      data: {
        slug: `test-takeover-${Date.now()}`,
        displayName: "Takeover Test Clinic",
        status: "ACTIVE",
      },
    });

    const organization = await database.organization.create({
      data: {
        tenantId: tenant.id,
        code: "MAIN",
        displayName: "Takeover Org",
        status: "ACTIVE",
      },
    });

    const doctorEmail = `doctor${Date.now()}@example.test`;
    const doctorIdentity = await database.identity.create({
      data: {
        email: doctorEmail,
        normalizedEmail: doctorEmail,
        passwordHash: "scrypt$mockHash",
        status: "ACTIVE",
      },
    });

    await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        identityId: doctorIdentity.id,
        organizationId: organization.id,
        displayName: "Dr. Staff",
        status: "ACTIVE",
        workspaceCodes: ["DOCTOR"],
        primaryWorkspace: "DOCTOR",
      },
    });

    const adminEmail = `admin${Date.now()}@example.test`;
    const adminIdentity = await database.identity.create({
      data: {
        email: adminEmail,
        normalizedEmail: adminEmail,
        passwordHash: "scrypt$mockHash",
        status: "ACTIVE",
        isPlatformAdministrator: true,
      },
    });

    const patient = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: `P-${Date.now()}`,
        givenName: "Victim",
        familyName: "Patient",
      },
    });

    const mockContext: WonFlowRequestContext = {
      scope: "tenant",
      tenantId: tenant.id,
      organizationId: organization.id,
      userId: "00000000-0000-0000-0000-000000000000",
      identityId: "00000000-0000-0000-0000-000000000000",
      branchId: "00000000-0000-0000-0000-000000000000",
      membershipId: "00000000-0000-0000-0000-000000000000",
      sessionId: "00000000-0000-0000-0000-000000000000",
      requestId: `req-${Date.now()}`,
      sourceApplication: "web",
      permissionCodes: ["patients.manage"],
      workspace: "ADMIN",
      locale: "en",
      timezone: "Asia/Karachi",
      currencyCode: "PKR",
    };

    // Attempting to use staff email must be rejected
    await expect(
      provisionPatientPortalCredentials(mockContext, patient.id, { email: doctorEmail }),
    ).rejects.toMatchObject({
      status: 409,
      code: "email-already-in-use",
    });

    // Attempting to use platform administrator email must be rejected
    await expect(
      provisionPatientPortalCredentials(mockContext, patient.id, { email: adminEmail }),
    ).rejects.toMatchObject({
      status: 409,
      code: "email-already-in-use",
    });

    // Ensure passwords and status of existing identities were untouched
    const doctorAfter = await database.identity.findUnique({ where: { id: doctorIdentity.id } });
    expect(doctorAfter?.passwordHash).toBe("scrypt$mockHash");

    const adminAfter = await database.identity.findUnique({ where: { id: adminIdentity.id } });
    expect(adminAfter?.passwordHash).toBe("scrypt$mockHash");

    // Clean up
    await database.patient.delete({ where: { id: patient.id } });
    await database.tenantMembership.deleteMany({ where: { tenantId: tenant.id } });
    await database.identity.delete({ where: { id: doctorIdentity.id } });
    await database.identity.delete({ where: { id: adminIdentity.id } });
    await database.organization.delete({ where: { id: organization.id } });
    await database.tenant.delete({ where: { id: tenant.id } });
  });
});
