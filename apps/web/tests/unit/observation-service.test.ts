import { describe, expect, it } from "vitest";
import { ObservationService } from "@/server/clinical/observation-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";


describe("ObservationService Domain Rules", () => {
  it("enforces tenantId and patientId requirements", async () => {
    const service = new ObservationService();
    const mockRc: WonFlowRequestContext = {
      scope: "tenant",
      tenantId: "",
      organizationId: "org-1",
      branchId: null,
      userId: "ident-1",
      identityId: "ident-1",
      membershipId: "mem-1",
      sessionId: "00000000-0000-0000-0000-000000000000",
      permissionCodes: ["encounters.manage"],
      workspace: "DOCTOR",
      locale: "en",
      timezone: "Asia/Karachi",
      currencyCode: "PKR",
      requestId: "req-1",
      sourceApplication: "web",
    };

    await expect(
      service.recordObservation(mockRc, {
        patientId: "patient-1",
        code: "8867-4",
        display: "Heart rate",
        valueNumber: 72,
        unit: "bpm",
        observedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow("Tenant ID is required");
  });
});
