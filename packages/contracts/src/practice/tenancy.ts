/**
 * WonFlow tenant provisioning, subscriptions and platform control.
 *
 * These contracts describe how the WonFlow platform provisions and
 * controls tenant organizations.
 *
 * Tenant administrators manage their own teams and permissions after
 * provisioning. Platform control remains attributable to a WonFlow
 * platform user.
 */

import type {
  AccessScopeType,
  BreakGlassAccessSession,
  SupportAccessSession,
} from "../access/authorization";

import type {
  IsoDateTime,
  WonFlowId,
} from "../organization/hierarchy";

import type {
  ModuleEntitlement,
  OrganizationModuleActivation,
} from "../platform/modules";

/**
 * Lifecycle of a request to provision a tenant organization.
 */
export type TenantProvisioningStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "approved"
  | "provisioning"
  | "active"
  | "rejected"
  | "cancelled"
  | "failed";

/**
 * Commercial billing state of an organization subscription.
 */
export type OrganizationSubscriptionBillingStatus =
  | "trialing"
  | "active"
  | "past-due"
  | "suspended"
  | "cancelled"
  | "expired";

/**
 * Lifecycle of an organization-owner assignment.
 */
export type OrganizationOwnerAssignmentStatus =
  | "pending"
  | "active"
  | "suspended"
  | "revoked"
  | "expired";

/**
 * Overall progress of a tenant owner's setup workflow.
 */
export type TenantOnboardingStatus =
  | "not-started"
  | "in-progress"
  | "completed";

/**
 * Stable steps used by the tenant onboarding workflow.
 *
 * Every step may be skipped. Skipping a step records the owner's
 * decision without pretending that its configuration exists.
 */
export type TenantOnboardingStepCode =
  | "profile"
  | "regional-settings"
  | "locations"
  | "clinic-sessions"
  | "service-catalogue"
  | "team"
  | "policies"
  | "content"
  | "review";

/**
 * Progress of one onboarding step.
 */
export type TenantOnboardingStepStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "skipped";

/**
 * Persisted state for one onboarding step.
 *
 * Timestamp consistency is enforced later by the matching Zod schema.
 */
export interface TenantOnboardingStepState {
  code: TenantOnboardingStepCode;

  status: TenantOnboardingStepStatus;

  startedAt?: IsoDateTime;

  completedAt?: IsoDateTime;

  skippedAt?: IsoDateTime;
}

/**
 * Destructive or commercially significant action performed by the
 * WonFlow platform against a tenant.
 */
export type PlatformControlActionType =
  | "suspend"
  | "reactivate"
  | "terminate"
  | "update-subscription"
  | "upgrade"
  | "downgrade"
  | "set-module-entitlement"
  | "force-password-reset";

/**
 * Execution state of a platform control action.
 */
export type PlatformControlActionStatus =
  | "requested"
  | "in-progress"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Request to create and activate a new WonFlow tenant organization.
 *
 * A request may exist before the final Organization record is created.
 */
export interface TenantProvisioningRequest {
  id: WonFlowId;

  requestedOrganizationName: string;

  /**
   * Requested stable organization code.
   *
    * Example: PRACTICE-001.
   */
  requestedOrganizationCode: string;

  /**
   * User intended to become the organization's first owner.
   */
  requestedOwnerUserId: WonFlowId;

  /**
   * Commercial plan code configured by the WonFlow platform.
   *
   * This remains a string because plan names are commercial
   * configuration rather than a fixed clinical domain enum.
   */
  requestedPlanTierCode: string;

  requestedSeatCount: number;

  /**
   * Modules requested during provisioning.
   *
   * Final access is still controlled by ModuleEntitlement and
   * OrganizationModuleActivation records.
   */
  requestedModuleCodes:
    ModuleEntitlement["moduleCode"][];

  requestedByUserId: WonFlowId;

  status: TenantProvisioningStatus;

  submittedAt?: IsoDateTime;

  reviewedByUserId?: WonFlowId;

  reviewedAt?: IsoDateTime;

  /**
   * Required when the request is approved, rejected or cancelled.
   */
  decisionReason?: string;

  /**
   * Organization created from this request.
   */
  organizationId?: WonFlowId;

  provisioningStartedAt?: IsoDateTime;

  activatedAt?: IsoDateTime;

  failedAt?: IsoDateTime;

  failureReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Commercial subscription assigned to one tenant organization.
 *
 * Module entitlements and activations remain independent records.
 * activeModuleCodes is a subscription snapshot used for billing and
 * quota presentation, not the authorization source of truth.
 */
export interface OrganizationSubscription {
  id: WonFlowId;

  organizationId: WonFlowId;

  /**
   * Stable commercial plan code configured by the platform.
   */
  planTierCode: string;

  seatCount: number;

  billingStatus:
    OrganizationSubscriptionBillingStatus;

  /**
   * Module codes included in the current subscription snapshot.
   */
  activeModuleCodes:
    ModuleEntitlement["moduleCode"][];

  trialStartsAt?: IsoDateTime;

  trialEndsAt?: IsoDateTime;

  currentBillingPeriodStartsAt?: IsoDateTime;

  currentBillingPeriodEndsAt?: IsoDateTime;

  expiresAt?: IsoDateTime;

  cancelledAt?: IsoDateTime;

  cancellationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Assigns one user as the owner of a tenant organization.
 *
 * The owner may delegate organization permissions to other team
 * members, subject to organization policy and platform entitlements.
 */
export type OrganizationOwnerInvitationStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export interface OrganizationOwnerInvitation {
  id: WonFlowId;
  organizationId: WonFlowId;
  email: string;
  intendedOwnerUserId?: WonFlowId;
  /** Opaque reference only; plain invitation tokens are never exposed. */
  redemptionTokenReference: string;
  status: OrganizationOwnerInvitationStatus;
  invitedByPlatformUserId: WonFlowId;
  invitedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  acceptedByUserId?: WonFlowId;
  acceptedAt?: IsoDateTime;
  revokedByPlatformUserId?: WonFlowId;
  revokedAt?: IsoDateTime;
  revocationReason?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface OrganizationOwnerAssignment {
  id: WonFlowId;

  organizationId: WonFlowId;

  ownerUserId: WonFlowId;

  /**
   * An organization owner assignment is always organization-scoped.
   *
   * Reusing AccessScopeType prevents creation of another competing
   * scope vocabulary.
   */
  scopeType:
    Extract<
      AccessScopeType,
      "organization"
    >;

  canDelegatePermissions: boolean;

  status:
    OrganizationOwnerAssignmentStatus;

  effectiveFrom: IsoDateTime;

  effectiveTo?: IsoDateTime;

  assignedByPlatformUserId: WonFlowId;

  assignmentReason: string;

  suspendedByPlatformUserId?: WonFlowId;

  suspendedAt?: IsoDateTime;

  suspensionReason?: string;

  revokedByPlatformUserId?: WonFlowId;

  revokedAt?: IsoDateTime;

  revocationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Resumable setup progress for one tenant organization.
 *
 * The organization owner may leave, resume, complete or skip setup
 * steps without developer involvement. Configuration created through
 * onboarding lives in its normal domain records; this contract stores
 * progress only.
 */
export interface TenantOnboardingState {
  id: WonFlowId;

  organizationId: WonFlowId;

  /**
   * User responsible for completing the tenant setup.
   *
   * A team-member record may not exist when onboarding begins, so this
   * references the owner user rather than a care-team member.
   */
  ownerUserId: WonFlowId;

  /**
   * Product workflow version used when this checklist was created.
   *
   * This allows future onboarding changes without silently rewriting
   * previously stored progress.
   */
  workflowVersion: string;

  status: TenantOnboardingStatus;

  /**
   * Step to reopen when the owner resumes onboarding.
   *
   * It may be undefined before setup starts or after completion.
   */
  currentStepCode?: TenantOnboardingStepCode;

  steps: TenantOnboardingStepState[];

  startedAt?: IsoDateTime;

  lastResumedAt?: IsoDateTime;

  completedAt?: IsoDateTime;

  /**
   * User responsible for the latest progress change.
   */
  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * An attributable action taken by a WonFlow platform user against a
 * tenant organization.
 *
 * actorUserId and reason are required for every action because these
 * operations may suspend access, change commercial terms, alter module
 * availability or affect user authentication.
 */
export interface PlatformControlAction {
  id: WonFlowId;

  organizationId: WonFlowId;

  type: PlatformControlActionType;

  status: PlatformControlActionStatus;

  actorUserId: WonFlowId;

  reason: string;

  /**
   * User affected by a forced password reset.
   */
  targetUserId?: WonFlowId;

  /**
   * Previous subscription tier for upgrade and downgrade actions.
   */
  previousPlanTierCode?: string;

  /**
   * Requested subscription tier for upgrade and downgrade actions.
   */
  requestedPlanTierCode?: string;

  /**
   * Module affected by an entitlement action.
   */
  moduleCode?:
    ModuleEntitlement["moduleCode"];

  /**
   * Requested entitlement state for set-module-entitlement actions.
   */
  requestedEntitlementStatus?:
    ModuleEntitlement["status"];

  /**
   * Requested organization activation state when entitlement changes
   * also require activation changes.
   */
  requestedActivationStatus?:
    OrganizationModuleActivation["status"];

  effectiveAt?: IsoDateTime;

  requestedAt: IsoDateTime;

  startedAt?: IsoDateTime;

  completedAt?: IsoDateTime;

  failedAt?: IsoDateTime;

  failureReason?: string;

  cancelledAt?: IsoDateTime;

  cancellationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

export type SupportAccessAuditEventType =
  | "requested"
  | "approved"
  | "rejected"
  | "activated"
  | "resource-accessed"
  | "revoked"
  | "expired";

export interface SupportAccessAuditEvent {
  id: WonFlowId;
  organizationId: WonFlowId;
  supportAccessSessionId: WonFlowId;
  platformUserId: WonFlowId;
  type: SupportAccessAuditEventType;
  reason?: string;
  permissionCode?: string;
  resourceType?: string;
  resourceId?: WonFlowId;
  occurredAt: IsoDateTime;
  createdAt: IsoDateTime;
}

/**
 * Immutable point-in-time tenant usage measurement.
 *
 * Usage snapshots support quota enforcement, subscription review and
 * billing without recalculating historical usage from mutable records.
 */
export interface TenantUsageSnapshot {
  id: WonFlowId;

  organizationId: WonFlowId;

  periodStartsAt: IsoDateTime;

  periodEndsAt: IsoDateTime;

  patientCount: number;

  appointmentCount: number;

  /**
   * Total object and document storage used by the tenant.
   */
  storageBytes: number;

  messageCount: number;

  capturedAt: IsoDateTime;

  createdAt: IsoDateTime;
}

/**
 * Complete platform-facing view of tenant provisioning and control.
 *
 * Existing module and access contracts are composed here rather than
 * being redefined inside the practice domain.
 */
export interface TenantProvisioningAggregate {
  request: TenantProvisioningRequest;

  subscription?: OrganizationSubscription;

  ownerAssignments:
    OrganizationOwnerAssignment[];

  ownerInvitations:
    OrganizationOwnerInvitation[];

  onboardingState?:
    TenantOnboardingState;

  moduleEntitlements:
    ModuleEntitlement[];

  moduleActivations:
    OrganizationModuleActivation[];

  controlActions:
    PlatformControlAction[];

  usageSnapshots:
    TenantUsageSnapshot[];

  /**
   * Temporary platform support access granted through the shared
   * authorization model.
   */
  supportAccessSessions:
    SupportAccessSession[];

  supportAccessAuditEvents:
    SupportAccessAuditEvent[];

  /**
   * Emergency patient-record access sessions recorded through the
   * shared authorization model.
   */
  breakGlassAccessSessions:
    BreakGlassAccessSession[];
}

/**
 * Returns true when provisioning reached a terminal state.
 */
export function isTenantProvisioningTerminal(
  status: TenantProvisioningStatus,
): boolean {
  return (
    status === "active" ||
    status === "rejected" ||
    status === "cancelled" ||
    status === "failed"
  );
}

/**
 * Returns true when the subscription currently permits tenant use.
 */
export function isOrganizationSubscriptionUsable(
  subscription:
    OrganizationSubscription,
): boolean {
  return (
    subscription.billingStatus ===
      "trialing" ||
    subscription.billingStatus ===
      "active"
  );
}

/**
 * Returns the currently active owner assignments.
 */
export function getActiveOrganizationOwnerAssignments(
  assignments:
    readonly OrganizationOwnerAssignment[],
  at: IsoDateTime,
): OrganizationOwnerAssignment[] {
  return assignments.filter(
    (assignment) => {
      if (
        assignment.status !==
        "active"
      ) {
        return false;
      }

      if (
        assignment.effectiveFrom >
        at
      ) {
        return false;
      }

      if (
        assignment.effectiveTo !==
          undefined &&
        assignment.effectiveTo < at
      ) {
        return false;
      }

      return true;
    },
  );
}

/**
 * Returns the newest usage snapshot by capture timestamp.
 */
export function getLatestTenantUsageSnapshot(
  snapshots:
    readonly TenantUsageSnapshot[],
):
  | TenantUsageSnapshot
  | undefined {
  return [...snapshots].sort(
    (left, right) =>
      right.capturedAt.localeCompare(
        left.capturedAt,
      ),
  )[0];
}
