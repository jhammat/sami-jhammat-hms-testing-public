import { describe, expect, it } from "vitest";
import { AlertEscalationService } from "@/server/clinical/alert-escalation-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("AlertEscalationService", () => {
  const service = new AlertEscalationService();

  const mockStaffContext: WonFlowRequestContext = {
    scope: "tenant",
    tenantId: "11111111-1111-1111-1111-111111111111",
    organizationId: "org-1",
    branchId: null,
    userId: "33333333-3333-3333-3333-333333333333",
    identityId: "33333333-3333-3333-3333-333333333333",
    membershipId: "22222222-2222-2222-2222-222222222222",
    sessionId: "00000000-0000-0000-0000-000000000000",
    permissionCodes: ["careplans.read", "careplans.manage", "encounters.manage"],
    workspace: "DOCTOR",
    locale: "en",
    timezone: "Asia/Karachi",
    currencyCode: "PKR",
    requestId: "req-123",
    sourceApplication: "web",
  };

  describe("Validation & Resolution Constraints", () => {
    it("rejects alert resolution without clinical notes", async () => {
      await expect(
        service.resolveAlert(mockStaffContext, "alert-id-1", {
          resolutionNotes: "",
        }),
      ).rejects.toThrow("Clinical resolution notes are mandatory when resolving an alert.");
    });

    it("rejects invalid rota day of week or invalid time ranges", async () => {
      // Day of week < 0 or > 6
      await expect(
        service.createRota(mockStaffContext, {
          dayOfWeek: 7,
          startMinute: 0,
          endMinute: 1440,
          primaryMembershipId: "mem-1",
          escalationMembershipId: "mem-2",
        }),
      ).rejects.toThrow("Day of week must be between 0 (Sun) and 6 (Sat).");

      // Start minute >= end minute
      await expect(
        service.createRota(mockStaffContext, {
          dayOfWeek: 1,
          startMinute: 600,
          endMinute: 500,
          primaryMembershipId: "mem-1",
          escalationMembershipId: "mem-2",
        }),
      ).rejects.toThrow("Invalid start/end minute range.");
    });
  });
});
