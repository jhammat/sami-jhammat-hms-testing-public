/**
 * Production-safe tenant bootstrap for the mock practice service.
 *
 * This operation creates only the records required for an organization
 * owner to begin onboarding. It deliberately creates no clinical,
 * scheduling, catalogue, policy, content or patient data.
 *
 * The same orchestration boundary can later be implemented against the
 * database-backed WonFlowPracticeService without changing its caller.
 */

import type {
  TenantOnboardingStepCode,
  WonFlowId,
} from "@wonflow/contracts";

import type {
  PracticeCreateInput,
  WonFlowOrganizationScope,
  WonFlowPracticeResourceMap,
} from "../services/practice-service";

import type {
  WonFlowPracticeEntityService,
} from "../services/practice-service";

/**
 * Version of the product-owned onboarding workflow.
 *
 * This is product configuration rather than tenant configuration.
 */
export const WONFLOW_TENANT_ONBOARDING_WORKFLOW_VERSION =
  "1";

/**
 * Product workflow steps shown to every newly provisioned tenant.
 *
 * A tenant owns the values entered during these steps. The workflow
 * codes themselves are stable product concepts.
 */
export const WONFLOW_TENANT_ONBOARDING_STEP_CODES = [
  "profile",
  "regional-settings",
  "locations",
  "clinic-sessions",
  "service-catalogue",
  "team",
  "policies",
  "content",
  "review",
] as const satisfies readonly TenantOnboardingStepCode[];

type ProvisioningRequestInput =
  PracticeCreateInput<
    WonFlowPracticeResourceMap[
      "provisioningRequests"
    ]
  >;

type SubscriptionInput =
  PracticeCreateInput<
    WonFlowPracticeResourceMap[
      "subscriptions"
    ]
  >;

type OwnerAssignmentInput =
  PracticeCreateInput<
    WonFlowPracticeResourceMap[
      "ownerAssignments"
    ]
  >;

type ModuleActivationInput =
  PracticeCreateInput<
    WonFlowPracticeResourceMap[
      "moduleActivations"
    ]
  >;

type OnboardingStateInput =
  PracticeCreateInput<
    WonFlowPracticeResourceMap[
      "onboardingStates"
    ]
  >;

/**
 * Smallest service surface needed to bootstrap an empty tenant.
 *
 * No location, service, team, patient or clinical operation is exposed
 * to this orchestration function.
 */
export interface EmptyTenantBootstrapService {
  provisioningRequests:
    Pick<WonFlowPracticeEntityService<
      WonFlowPracticeResourceMap[
        "provisioningRequests"
      ]
    >, "create">;

  subscriptions:
    Pick<WonFlowPracticeEntityService<
      WonFlowPracticeResourceMap[
        "subscriptions"
      ]
    >, "create">;

  ownerAssignments:
    Pick<WonFlowPracticeEntityService<
      WonFlowPracticeResourceMap[
        "ownerAssignments"
      ]
    >, "create">;

  onboardingStates:
    Pick<WonFlowPracticeEntityService<
      WonFlowPracticeResourceMap[
        "onboardingStates"
      ]
    >, "create">;

  moduleActivations:
    Pick<WonFlowPracticeEntityService<
      WonFlowPracticeResourceMap[
        "moduleActivations"
      ]
    >, "create">;
}

const registeredBootstrapServices =
  new WeakMap<object, EmptyTenantBootstrapService>();

/** Registers the private create-only bootstrap boundary for a service. */
export function registerEmptyTenantBootstrapService(
  publicService: object,
  bootstrapService: EmptyTenantBootstrapService,
): void {
  registeredBootstrapServices.set(publicService, bootstrapService);
}

export interface EmptyTenantBootstrapInput {
  /**
   * Reserved organization scope created by the platform provisioning
   * workflow.
   */
  scope: WonFlowOrganizationScope;

  provisioningRequest:
    ProvisioningRequestInput;

  subscription:
    SubscriptionInput;

  ownerAssignment:
    OwnerAssignmentInput;

  /**
   * User who will complete organization onboarding.
   */
  ownerUserId: WonFlowId;

  /**
   * Platform user responsible for this bootstrap operation.
   */
  actorUserId: WonFlowId;

  /**
   * Module activation records selected by platform administration.
   *
   * An empty array is valid while provisioning remains incomplete.
   */
  moduleActivations:
    readonly ModuleActivationInput[];
}

export interface EmptyTenantBootstrapResult {
  provisioningRequest:
    WonFlowPracticeResourceMap[
      "provisioningRequests"
    ];

  subscription:
    WonFlowPracticeResourceMap[
      "subscriptions"
    ];

  ownerAssignment:
    WonFlowPracticeResourceMap[
      "ownerAssignments"
    ];

  onboardingState:
    WonFlowPracticeResourceMap[
      "onboardingStates"
    ];

  moduleActivations:
    WonFlowPracticeResourceMap[
      "moduleActivations"
    ][];
}

/**
 * Creates the minimum records required for owner-led tenant setup.
 *
 * All writes pass through a registered create-only internal service.
 * Generic public platform CRUD remains closed, and this function never
 * accesses repositories or mutable arrays directly.
 */
export async function bootstrapEmptyTenant(
  service: object,
  input: EmptyTenantBootstrapInput,
  signal?: AbortSignal,
): Promise<EmptyTenantBootstrapResult> {
  const bootstrapService = registeredBootstrapServices.get(service);
  if (bootstrapService === undefined) {
    throw new Error(
      "This practice service does not provide the private empty-tenant bootstrap boundary.",
    );
  }

  const provisioningRequest =
    await bootstrapService.provisioningRequests.create(
      input.scope,
      input.provisioningRequest,
      signal,
    );

  const subscription =
    await bootstrapService.subscriptions.create(
      input.scope,
      input.subscription,
      signal,
    );

  const ownerAssignment =
    await bootstrapService.ownerAssignments.create(
      input.scope,
      input.ownerAssignment,
      signal,
    );

  const onboardingInput:
    OnboardingStateInput = {
      ownerUserId:
        input.ownerUserId,

      workflowVersion:
        WONFLOW_TENANT_ONBOARDING_WORKFLOW_VERSION,

      status: "not-started",

      steps:
        WONFLOW_TENANT_ONBOARDING_STEP_CODES.map(
          (code) => ({
            code,

            status:
              "not-started" as const,
          }),
        ),

      updatedByUserId:
        input.actorUserId,
    };

  const onboardingState =
    await bootstrapService.onboardingStates.create(
      input.scope,
      onboardingInput,
      signal,
    );

  const moduleActivations:
    WonFlowPracticeResourceMap[
      "moduleActivations"
    ][] = [];

  for (
    const moduleActivation of
    input.moduleActivations
  ) {
    moduleActivations.push(
      await bootstrapService.moduleActivations.create(
        input.scope,
        moduleActivation,
        signal,
      ),
    );
  }

  return {
    provisioningRequest,

    subscription,

    ownerAssignment,

    onboardingState,

    moduleActivations,
  };
}
