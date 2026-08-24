import { describe, expect, it } from "vitest";
import { CaregiverService } from "@/server/patient/caregiver-service";
import type { WonFlowTenantRequestContext } from "@wonflow/contracts";

describe("Caregiver Delegated Access (Task B-03)", () => {
  const baseContext: WonFlowTenantRequestContext = {
    scope: "tenant",
    requestId: "req-caregiver-test-1",
    userId: "user-test-1",
    identityId: "00000000-0000-0000-0000-000000000001",
    membershipId: "00000000-0000-0000-0000-000000000002",
    sessionId: "sess-test-1",
    tenantId: "00000000-0000-0000-0000-000000000003",
    organizationId: "00000000-0000-0000-0000-000000000004",
    branchId: null,
    workspace: "RECEPTION",
    locale: "en",
    timezone: "UTC",
    currencyCode: "PKR",
    permissionCodes: [],
    sourceApplication: "web",
  };

  const service = new CaregiverService();

  it("rejects invitation when caller does not have primary patient access", async () => {
    await expect(
      service.inviteCaregiver(baseContext, {
        email: "caregiver@example.com",
        relationship: "nurse",
      }),
    ).rejects.toThrow("Only the primary patient can manage caregiver delegations.");
  });

  it("rejects acceptance when invite token is missing or empty", async () => {
    await expect(
      service.acceptCaregiverInvite(baseContext, {
        inviteToken: "   ",
      }),
    ).rejects.toThrow("Caregiver invite token is required.");
  });

  it("rejects acceptance when invite token is not found", async () => {
    await expect(
      service.acceptCaregiverInvite(baseContext, {
        inviteToken: "non-existent-token-1234567890abcdef",
      }),
    ).rejects.toThrow("This caregiver invitation is invalid or has already been used.");
  });
});
