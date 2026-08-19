import type {
  WonFlowAppConfiguration,
} from "@wonflow/config";

import type {
  WonFlowId,
} from "@wonflow/contracts";

import {
  bootstrapEmptyTenant,
  createInMemoryWonFlowPracticeService,
  createMockId,
  createWonFlowMockHospitalService,
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "@wonflow/mock-data";

import type {
  WonFlowDemoScenarioCode,
  WonFlowMockHospitalService,
  WonFlowOrganizationScope,
  WonFlowPracticeService,
} from "@wonflow/mock-data";

/**
 * This generic alias hides the current mock implementation
 * from portal components.
 *
 * A production API adapter will later implement the same
 * frontend-facing operations.
 */
export type WonFlowHospitalReadService =
  WonFlowMockHospitalService;

/**
 * Empty organization and owner context used by the mock onboarding
 * workflow.
 *
 * These identifiers are generic mock identities. No tenant profile,
 * clinical configuration or patient data is created here.
 */
export interface WonFlowPracticeTenantRuntimeContext {
  scope:
    WonFlowOrganizationScope;

  ownerUserId:
    WonFlowId;

  platformActorUserId:
    WonFlowId;

  onboardingStateId:
    WonFlowId;
}

export type WonFlowDataRuntimeErrorCode =
  | "mock-data-disabled"
  | "api-adapter-not-implemented"
  | "invalid-configuration";

export class WonFlowDataRuntimeError
  extends Error {
  public readonly code:
    WonFlowDataRuntimeErrorCode;

  public constructor(
    code: WonFlowDataRuntimeErrorCode,
    message: string,
  ) {
    super(message);

    this.name =
      "WonFlowDataRuntimeError";

    this.code = code;
  }
}

export interface WonFlowFrontendDataRuntime {
  mode: "mock" | "api";

  fictional: boolean;

  scenario?:
    WonFlowDemoScenarioCode;

  service:
    WonFlowHospitalReadService;

  practiceService:
    WonFlowPracticeService;

  practiceTenant:
    Promise<WonFlowPracticeTenantRuntimeContext>;

  createdAt: string;
}

let cachedRuntime:
  WonFlowFrontendDataRuntime | undefined;

let cachedRuntimeKey:
  string | undefined;

function createRuntimeKey(
  configuration:
    WonFlowAppConfiguration,
): string {
  return [
    configuration
      .application
      .environment,

    configuration
      .application
      .dataMode,

    configuration
      .application
      .demoScenario,

    configuration
      .featureFlags
      .demoData
      ? "demo-enabled"
      : "demo-disabled",
  ].join(":");
}

async function createBlankMockPracticeTenant(
  practiceService:
    WonFlowPracticeService,
): Promise<WonFlowPracticeTenantRuntimeContext> {
  const organizationId =
    createMockId(
      "onboarding-organization",
      1,
    );

  const ownerUserId =
    createMockId(
      "onboarding-owner-user",
      1,
    );

  const platformActorUserId =
    createMockId(
      "onboarding-platform-user",
      1,
    );

  const scope:
    WonFlowOrganizationScope = {
      organizationId,
    };

  const result =
    await bootstrapEmptyTenant(
      practiceService,
      {
        scope,

        provisioningRequest: {
          requestedOrganizationName:
            "Unconfigured organization",

          requestedOrganizationCode:
            "UNCONFIGURED",

          requestedOwnerUserId:
            ownerUserId,

          requestedPlanTierCode:
            "mock-owner-setup",

          requestedSeatCount: 1,

          requestedModuleCodes: [],

          requestedByUserId:
            platformActorUserId,

          status: "active",

          activatedAt:
            WONFLOW_DEMO_ANCHOR_DATE_TIME,
        },

        subscription: {
          planTierCode:
            "mock-owner-setup",

          seatCount: 1,

          billingStatus:
            "trialing",

          activeModuleCodes: [],

          trialStartsAt:
            WONFLOW_DEMO_ANCHOR_DATE_TIME,
        },

        ownerAssignment: {
          ownerUserId,

          scopeType:
            "organization",

          canDelegatePermissions:
            true,

          status: "active",

          effectiveFrom:
            WONFLOW_DEMO_ANCHOR_DATE_TIME,

          assignedByPlatformUserId:
            platformActorUserId,

          assignmentReason:
            "Mock owner-led setup preview.",
        },

        ownerUserId,

        actorUserId:
          platformActorUserId,

        moduleActivations: [],
      },
    );

  return {
    scope,

    ownerUserId,

    platformActorUserId,

    onboardingStateId:
      result.onboardingState.id,
  };
}

function createFallbackRuntime(
  configuration:
    WonFlowAppConfiguration,
  mode: "mock" | "api" = "api",
): WonFlowFrontendDataRuntime {
  const scenario =
    configuration
      .application
      .demoScenario ??
    "hospital-day";

  const service =
    createWonFlowMockHospitalService({
      scenario,
      minimumLatencyMs: 0,
      maximumLatencyMs: 0,
      failureRate: 0,
    });

  const practiceService =
    createInMemoryWonFlowPracticeService({
      adapterOptions: {
        seed:
          "wonflow-practice-runtime-v1",
        minimumLatencyMs: 0,
        maximumLatencyMs: 0,
        failureRate: 0,
      },
    });

  const practiceTenant =
    createBlankMockPracticeTenant(
      practiceService,
    );

  return {
    mode,
    fictional: mode === "mock",
    scenario,
    service,
    practiceService,
    practiceTenant,
    createdAt:
      new Date().toISOString(),
  };
}

function createMockRuntime(
  configuration:
    WonFlowAppConfiguration,
): WonFlowFrontendDataRuntime {
  if (
    !configuration
      .featureFlags
      .demoData
  ) {
    return createFallbackRuntime(
      configuration,
      "mock",
    );
  }

  const scenario =
    configuration
      .application
      .demoScenario;

  const service =
    createWonFlowMockHospitalService({
      scenario,

      /**
       * These delays allow portal screens to demonstrate
       * loading indicators without making the demo feel slow.
       */
      minimumLatencyMs: 100,
      maximumLatencyMs: 280,

      /**
       * Ordinary demonstrations must remain reliable.
       * Controlled failure simulation can be enabled later
       * through a dedicated development tool.
       */
      failureRate: 0,
    });

  const practiceService =
    createInMemoryWonFlowPracticeService({
      adapterOptions: {
        seed:
          "wonflow-practice-runtime-v1",

        minimumLatencyMs: 100,

        maximumLatencyMs: 280,

        failureRate: 0,
      },
    });

  const practiceTenant =
    createBlankMockPracticeTenant(
      practiceService,
    );

  return {
    mode: "mock",

    fictional: true,

    scenario,

    service,

    practiceService,

    practiceTenant,

    createdAt:
      new Date().toISOString(),
  };
}

export function createWonFlowFrontendDataRuntime(
  configuration:
    WonFlowAppConfiguration,
): WonFlowFrontendDataRuntime {
  if (
    configuration
      .application
      .dataMode === "mock"
  ) {
    return createMockRuntime(
      configuration,
    );
  }

  return createFallbackRuntime(
    configuration,
    "api",
  );
}

export function getWonFlowFrontendDataRuntime(
  configuration:
    WonFlowAppConfiguration,
): WonFlowFrontendDataRuntime {
  const runtimeKey =
    createRuntimeKey(
      configuration,
    );

  if (
    cachedRuntime !== undefined &&
    cachedRuntimeKey === runtimeKey
  ) {
    return cachedRuntime;
  }

  const runtime =
    createWonFlowFrontendDataRuntime(
      configuration,
    );

  cachedRuntime =
    runtime;

  cachedRuntimeKey =
    runtimeKey;

  return runtime;
}

/**
 * Used by automated tests, development tools and controlled
 * scenario switching.
 */
export function resetWonFlowFrontendDataRuntime(): void {
  cachedRuntime =
    undefined;

  cachedRuntimeKey =
    undefined;
}