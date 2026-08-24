import { describe, expect, it } from "vitest";
import { ObservationService } from "@/server/clinical/observation-service";
import { DrainService } from "@/server/clinical/drain-service";
import { SymptomService } from "@/server/clinical/symptom-service";
import { AlertEscalationService } from "@/server/clinical/alert-escalation-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Multi-Tenant Clinical Data Isolation", () => {
  const obsService = new ObservationService();
  const drainService = new DrainService();
  const symptomService = new SymptomService();
  const alertService = new AlertEscalationService();

  const tenantAlphaContext: WonFlowRequestContext = {
    scope: "tenant",
    tenantId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    organizationId: "org-alpha",
    branchId: null,
    userId: "user-alpha",
    identityId: "user-alpha",
    membershipId: "member-alpha",
    sessionId: "00000000-0000-0000-0000-000000000000",
    permissionCodes: ["encounters.manage", "careplans.read", "careplans.manage"],
    workspace: "DOCTOR",
    locale: "en",
    timezone: "Asia/Karachi",
    currencyCode: "PKR",
    requestId: "req-alpha",
    sourceApplication: "web",
  };

  it("requires valid tenantId for all clinical service operations", async () => {
    const unauthenticatedContext: WonFlowRequestContext = {
      scope: "tenant",
      tenantId: "",
      organizationId: "org-0",
      branchId: null,
      userId: "user-no-tenant",
      identityId: "user-no-tenant",
      membershipId: null,
      sessionId: "00000000-0000-0000-0000-000000000000",
      permissionCodes: [],
      workspace: "PATIENT",
      locale: "en",
      timezone: "Asia/Karachi",
      currencyCode: "PKR",
      requestId: "req-no-tenant",
      sourceApplication: "web",
    };

    await expect(
      obsService.recordObservation(unauthenticatedContext, {
        patientId: "patient-1",
        code: "temperature",
        display: "Body Temperature",
        valueNumber: 37.0,
        observedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow("Tenant ID is required");

    await expect(
      drainService.listPatientDrains(unauthenticatedContext, "patient-1"),
    ).rejects.toThrow("Tenant ID is required");


    await expect(
      symptomService.listPatientSymptomLogs(unauthenticatedContext, "patient-1"),
    ).rejects.toThrow();

    await expect(
      alertService.listAlerts(unauthenticatedContext),
    ).rejects.toThrow();
  });

  it("validates permission boundary for tenant-scoped operations", async () => {
    const insufficientRoleContext: WonFlowRequestContext = {
      ...tenantAlphaContext,
      permissionCodes: [],
    };

    await expect(
      alertService.listAlerts(insufficientRoleContext),
    ).rejects.toThrow();
  });
});
