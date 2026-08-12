/**
 * Runtime validation for tenant provisioning, subscriptions, owner
 * assignments, platform control and usage snapshots.
 */

import * as z from "zod";

import type {
  BreakGlassAccessSession,
  ModuleEntitlement,
  OrganizationModuleActivation,
  OrganizationOwnerInvitation,
  OrganizationOwnerAssignment,
  OrganizationSubscription,
  PlatformControlAction,
  SupportAccessAuditEvent,
  SupportAccessSession,
  TenantOnboardingState,
  TenantOnboardingStepState,
  TenantProvisioningAggregate,
  TenantProvisioningRequest,
  TenantUsageSnapshot,
} from "@wonflow/contracts";

import {
  codeSchema,
  isoDateTimeSchema,
  longTextSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
  reasonSchema,
  shortTextSchema,
  wonFlowIdSchema,
} from "../primitives";

import {
  isValidIsoDateTimeRange,
  moduleCodeSchema,
  permissionCodeSchema,
} from "./shared";

export const tenantProvisioningStatusSchema = z.enum([
  "draft",
  "submitted",
  "under-review",
  "approved",
  "provisioning",
  "active",
  "rejected",
  "cancelled",
  "failed",
]);

export const organizationSubscriptionBillingStatusSchema = z.enum([
  "trialing",
  "active",
  "past-due",
  "suspended",
  "cancelled",
  "expired",
]);

export const organizationOwnerAssignmentStatusSchema = z.enum([
  "pending",
  "active",
  "suspended",
  "revoked",
  "expired",
]);

export const organizationOwnerInvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

export const tenantOnboardingStatusSchema = z.enum([
  "not-started",
  "in-progress",
  "completed",
]);

export const tenantOnboardingStepCodeSchema = z.enum([
  "profile",
  "regional-settings",
  "locations",
  "clinic-sessions",
  "service-catalogue",
  "team",
  "policies",
  "content",
  "review",
]);

export const tenantOnboardingStepStatusSchema = z.enum([
  "not-started",
  "in-progress",
  "completed",
  "skipped",
]);

export const tenantOnboardingStepStateSchema = z
  .object({
    code:
      tenantOnboardingStepCodeSchema,

    status:
      tenantOnboardingStepStatusSchema,

    startedAt:
      isoDateTimeSchema.optional(),

    completedAt:
      isoDateTimeSchema.optional(),

    skippedAt:
      isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.status ===
        "not-started" &&
      (
        value.startedAt !==
          undefined ||
        value.completedAt !==
          undefined ||
        value.skippedAt !==
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "A step that has not started cannot have progress timestamps.",
      });
    }

    if (
      value.status ===
        "in-progress" &&
      value.startedAt ===
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["startedAt"],
        message:
          "An in-progress step requires a start time.",
      });
    }

    if (
      value.status ===
        "in-progress" &&
      (
        value.completedAt !==
          undefined ||
        value.skippedAt !==
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "An in-progress step cannot already be completed or skipped.",
      });
    }

    if (
      value.status ===
        "completed" &&
      (
        value.startedAt ===
          undefined ||
        value.completedAt ===
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message:
          "A completed step requires start and completion times.",
      });
    }

    if (
      value.status ===
        "completed" &&
      value.skippedAt !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["skippedAt"],
        message:
          "A completed step cannot also be skipped.",
      });
    }

    if (
      value.status === "skipped" &&
      value.skippedAt === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["skippedAt"],
        message:
          "A skipped step requires a skipped time.",
      });
    }

    if (
      value.status === "skipped" &&
      value.completedAt !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message:
          "A skipped step cannot also be completed.",
      });
    }

    if (
      value.startedAt !== undefined &&
      value.completedAt !==
        undefined &&
      !isValidIsoDateTimeRange(
        value.startedAt,
        value.completedAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message:
          "A step cannot be completed before it starts.",
      });
    }

    if (
      value.startedAt !== undefined &&
      value.skippedAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.startedAt,
        value.skippedAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["skippedAt"],
        message:
          "A step cannot be skipped before it starts.",
      });
    }
  }) satisfies z.ZodType<TenantOnboardingStepState>;

export const platformControlActionTypeSchema = z.enum([
  "suspend",
  "reactivate",
  "terminate",
  "update-subscription",
  "upgrade",
  "downgrade",
  "set-module-entitlement",
  "force-password-reset",
]);

export const platformControlActionStatusSchema = z.enum([
  "requested",
  "in-progress",
  "completed",
  "failed",
  "cancelled",
]);

export const moduleEntitlementSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    moduleCode: moduleCodeSchema,
    entitlementCode: codeSchema.optional(),
    status: z.enum([
      "active",
      "expired",
      "suspended",
      "revoked",
    ]),
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.optional(),
    grantedByUserId: wonFlowIdSchema.optional(),
    notes: longTextSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveTo !== undefined &&
      !isValidIsoDateTimeRange(
        value.effectiveFrom,
        value.effectiveTo,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message:
          "The entitlement cannot end before it begins.",
      });
    }
  }) satisfies z.ZodType<ModuleEntitlement>;

export const organizationModuleActivationSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    moduleCode: moduleCodeSchema,
    status: z.enum([
      "disabled",
      "pending-configuration",
      "enabled",
      "suspended",
    ]),
    enabledAt: isoDateTimeSchema.optional(),
    enabledByUserId: wonFlowIdSchema.optional(),
    disabledAt: isoDateTimeSchema.optional(),
    disabledByUserId: wonFlowIdSchema.optional(),
    disabledReason: reasonSchema.optional(),
    suspendedAt: isoDateTimeSchema.optional(),
    suspendedByUserId: wonFlowIdSchema.optional(),
    suspendedReason: reasonSchema.optional(),
    configurationCompletedAt:
      isoDateTimeSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<OrganizationModuleActivation>;

export const supportAccessSessionSchema = z
  .object({
    id: wonFlowIdSchema,
    platformUserId: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    requestedReason: reasonSchema,
    approvedReason: reasonSchema.optional(),
    approvedByUserId: wonFlowIdSchema.optional(),
    rejectedByUserId: wonFlowIdSchema.optional(),
    status: z.enum([
      "requested",
      "approved",
      "active",
      "expired",
      "revoked",
      "rejected",
    ]),
    requestedAt: isoDateTimeSchema,
    approvedAt: isoDateTimeSchema.optional(),
    rejectedAt: isoDateTimeSchema.optional(),
    rejectionReason: reasonSchema.optional(),
    activatedAt: isoDateTimeSchema.optional(),
    activatedByUserId: wonFlowIdSchema.optional(),
    expiresAt: isoDateTimeSchema.optional(),
    revokedAt: isoDateTimeSchema.optional(),
    revokedByUserId: wonFlowIdSchema.optional(),
    revocationReason: reasonSchema.optional(),
    allowedPermissionCodes: z.array(
      permissionCodeSchema,
    ),
    allowedBranchIds: z
      .array(wonFlowIdSchema)
      .optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<SupportAccessSession>;

export const breakGlassAccessSessionSchema = z
  .object({
    id: wonFlowIdSchema,
    userId: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    encounterId: wonFlowIdSchema.optional(),
    reason: reasonSchema,
    status: z.enum([
      "active",
      "expired",
      "revoked",
      "reviewed",
    ]),
    startedAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema,
    reviewedByUserId: wonFlowIdSchema.optional(),
    reviewedAt: isoDateTimeSchema.optional(),
    reviewNotes: longTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isValidIsoDateTimeRange(
        value.startedAt,
        value.expiresAt,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message:
          "Break-glass access must expire after it starts.",
      });
    }
  }) satisfies z.ZodType<BreakGlassAccessSession>;

export const tenantProvisioningRequestSchema = z
  .object({
    id: wonFlowIdSchema,
    requestedOrganizationName: shortTextSchema,
    requestedOrganizationCode: codeSchema,
    requestedOwnerUserId: wonFlowIdSchema,
    requestedPlanTierCode: codeSchema,
    requestedSeatCount: positiveIntegerSchema,
    requestedModuleCodes: z.array(moduleCodeSchema),
    requestedByUserId: wonFlowIdSchema,
    status: tenantProvisioningStatusSchema,
    submittedAt: isoDateTimeSchema.optional(),
    reviewedByUserId: wonFlowIdSchema.optional(),
    reviewedAt: isoDateTimeSchema.optional(),
    decisionReason: reasonSchema.optional(),
    organizationId: wonFlowIdSchema.optional(),
    provisioningStartedAt:
      isoDateTimeSchema.optional(),
    activatedAt: isoDateTimeSchema.optional(),
    failedAt: isoDateTimeSchema.optional(),
    failureReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      [
        "approved",
        "rejected",
        "cancelled",
      ].includes(value.status) &&
      value.decisionReason === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["decisionReason"],
        message:
          "This provisioning decision requires a reason.",
      });
    }

    if (
      value.status === "failed" &&
      (
        value.failedAt === undefined ||
        value.failureReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["failureReason"],
        message:
          "A failed provisioning request needs a time and reason.",
      });
    }

    if (
      value.status === "active" &&
      (
        value.organizationId === undefined ||
        value.activatedAt === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["organizationId"],
        message:
          "An active provisioning request must reference its organization and activation time.",
      });
    }
  }) satisfies z.ZodType<TenantProvisioningRequest>;

export const organizationSubscriptionSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    planTierCode: codeSchema,
    seatCount: positiveIntegerSchema,
    billingStatus:
      organizationSubscriptionBillingStatusSchema,
    activeModuleCodes: z.array(moduleCodeSchema),
    trialStartsAt: isoDateTimeSchema.optional(),
    trialEndsAt: isoDateTimeSchema.optional(),
    currentBillingPeriodStartsAt:
      isoDateTimeSchema.optional(),
    currentBillingPeriodEndsAt:
      isoDateTimeSchema.optional(),
    expiresAt: isoDateTimeSchema.optional(),
    cancelledAt: isoDateTimeSchema.optional(),
    cancellationReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.trialStartsAt !== undefined &&
      value.trialEndsAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.trialStartsAt,
        value.trialEndsAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["trialEndsAt"],
        message:
          "The trial cannot end before it starts.",
      });
    }

    if (
      value.currentBillingPeriodStartsAt !==
        undefined &&
      value.currentBillingPeriodEndsAt !==
        undefined &&
      !isValidIsoDateTimeRange(
        value.currentBillingPeriodStartsAt,
        value.currentBillingPeriodEndsAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["currentBillingPeriodEndsAt"],
        message:
          "The billing period cannot end before it starts.",
      });
    }
  }) satisfies z.ZodType<OrganizationSubscription>;

export const organizationOwnerAssignmentSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    ownerUserId: wonFlowIdSchema,
    scopeType: z.literal("organization"),
    canDelegatePermissions: z.boolean(),
    status: organizationOwnerAssignmentStatusSchema,
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.optional(),
    assignedByPlatformUserId: wonFlowIdSchema,
    assignmentReason: reasonSchema,
    suspendedByPlatformUserId:
      wonFlowIdSchema.optional(),
    suspendedAt: isoDateTimeSchema.optional(),
    suspensionReason: reasonSchema.optional(),
    revokedByPlatformUserId:
      wonFlowIdSchema.optional(),
    revokedAt: isoDateTimeSchema.optional(),
    revocationReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveTo !== undefined &&
      !isValidIsoDateTimeRange(
        value.effectiveFrom,
        value.effectiveTo,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message:
          "The owner assignment cannot end before it begins.",
      });
    }

    if (
      value.status === "suspended" &&
      (
        value.suspendedByPlatformUserId === undefined ||
        value.suspendedAt === undefined ||
        value.suspensionReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["suspensionReason"],
        message:
          "A suspended assignment needs an actor, time and reason.",
      });
    }

    if (
      value.status === "revoked" &&
      (
        value.revokedByPlatformUserId === undefined ||
        value.revokedAt === undefined ||
        value.revocationReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["revocationReason"],
        message:
          "A revoked assignment needs an actor, time and reason.",
      });
    }
  }) satisfies z.ZodType<OrganizationOwnerAssignment>;

export const organizationOwnerInvitationSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    email: z.string().trim().email(),
    intendedOwnerUserId: wonFlowIdSchema.optional(),
    redemptionTokenReference: shortTextSchema,
    status: organizationOwnerInvitationStatusSchema,
    invitedByPlatformUserId: wonFlowIdSchema,
    invitedAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema,
    acceptedByUserId: wonFlowIdSchema.optional(),
    acceptedAt: isoDateTimeSchema.optional(),
    revokedByPlatformUserId: wonFlowIdSchema.optional(),
    revokedAt: isoDateTimeSchema.optional(),
    revocationReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (!isValidIsoDateTimeRange(value.invitedAt, value.expiresAt)) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message:
          "The owner invitation must expire after it is created.",
      });
    }
    if (
      value.status === "accepted" &&
      (value.acceptedByUserId === undefined || value.acceptedAt === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["acceptedAt"],
        message:
          "An accepted invitation requires the accepting user and time.",
      });
    }
    if (
      value.status === "revoked" &&
      (value.revokedByPlatformUserId === undefined ||
        value.revokedAt === undefined ||
        value.revocationReason === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["revocationReason"],
        message:
          "A revoked invitation requires an actor, time and reason.",
      });
    }
  }) satisfies z.ZodType<OrganizationOwnerInvitation>;

export const supportAccessAuditEventSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    supportAccessSessionId: wonFlowIdSchema,
    platformUserId: wonFlowIdSchema,
    type: z.enum([
      "requested",
      "approved",
      "rejected",
      "activated",
      "resource-accessed",
      "revoked",
      "expired",
    ]),
    reason: reasonSchema.optional(),
    permissionCode: permissionCodeSchema.optional(),
    resourceType: shortTextSchema.optional(),
    resourceId: wonFlowIdSchema.optional(),
    occurredAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<SupportAccessAuditEvent>;

export const tenantOnboardingStateSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId:
      wonFlowIdSchema,

    ownerUserId:
      wonFlowIdSchema,

    workflowVersion:
      shortTextSchema,

    status:
      tenantOnboardingStatusSchema,

    currentStepCode:
      tenantOnboardingStepCodeSchema.optional(),

    steps: z
      .array(
        tenantOnboardingStepStateSchema,
      )
      .min(
        1,
        "The onboarding workflow requires at least one step.",
      ),

    startedAt:
      isoDateTimeSchema.optional(),

    lastResumedAt:
      isoDateTimeSchema.optional(),

    completedAt:
      isoDateTimeSchema.optional(),

    updatedByUserId:
      wonFlowIdSchema,

    createdAt:
      isoDateTimeSchema,

    updatedAt:
      isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const stepCodes =
      value.steps.map(
        (step) => step.code,
      );

    if (
      new Set(stepCodes).size !==
      stepCodes.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message:
          "Onboarding steps must be unique.",
      });
    }

    if (
      value.currentStepCode !==
        undefined &&
      !value.steps.some(
        (step) =>
          step.code ===
          value.currentStepCode,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "currentStepCode",
        ],
        message:
          "The current step must exist in the onboarding checklist.",
      });
    }

    const currentStep =
      value.currentStepCode ===
      undefined
        ? undefined
        : value.steps.find(
            (step) =>
              step.code ===
              value.currentStepCode,
          );

    if (
      currentStep !== undefined &&
      (
        currentStep.status ===
          "completed" ||
        currentStep.status ===
          "skipped"
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "currentStepCode",
        ],
        message:
          "The current step cannot already be completed or skipped.",
      });
    }

    if (
      value.status ===
        "not-started" &&
      (
        value.startedAt !==
          undefined ||
        value.completedAt !==
          undefined ||
        value.currentStepCode !==
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Onboarding that has not started cannot have progress timestamps or a current step.",
      });
    }

    if (
      value.status ===
        "not-started" &&
      value.steps.some(
        (step) =>
          step.status !==
          "not-started",
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message:
          "All steps must be unstarted while onboarding has not started.",
      });
    }

    if (
      value.status ===
        "in-progress" &&
      value.startedAt ===
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["startedAt"],
        message:
          "In-progress onboarding requires a start time.",
      });
    }

    if (
      value.status ===
        "in-progress" &&
      value.currentStepCode ===
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "currentStepCode",
        ],
        message:
          "In-progress onboarding requires a current step.",
      });
    }

    if (
      value.status ===
        "in-progress" &&
      value.completedAt !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message:
          "In-progress onboarding cannot have a completion time.",
      });
    }

    if (
      value.status ===
        "completed" &&
      (
        value.startedAt ===
          undefined ||
        value.completedAt ===
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message:
          "Completed onboarding requires start and completion times.",
      });
    }

    if (
      value.status ===
        "completed" &&
      value.currentStepCode !==
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "currentStepCode",
        ],
        message:
          "Completed onboarding cannot retain a current step.",
      });
    }

    if (
      value.status ===
        "completed" &&
      value.steps.some(
        (step) =>
          step.status !==
            "completed" &&
          step.status !==
            "skipped",
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message:
          "Every onboarding step must be completed or skipped before onboarding is completed.",
      });
    }

    if (
      value.startedAt !==
        undefined &&
      value.lastResumedAt !==
        undefined &&
      !isValidIsoDateTimeRange(
        value.startedAt,
        value.lastResumedAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["lastResumedAt"],
        message:
          "Onboarding cannot be resumed before it starts.",
      });
    }

    if (
      value.startedAt !==
        undefined &&
      value.completedAt !==
        undefined &&
      !isValidIsoDateTimeRange(
        value.startedAt,
        value.completedAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message:
          "Onboarding cannot be completed before it starts.",
      });
    }
  }) satisfies z.ZodType<TenantOnboardingState>;

export const platformControlActionSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    type: platformControlActionTypeSchema,
    status: platformControlActionStatusSchema,
    actorUserId: wonFlowIdSchema,
    reason: reasonSchema,
    targetUserId: wonFlowIdSchema.optional(),
    previousPlanTierCode: codeSchema.optional(),
    requestedPlanTierCode: codeSchema.optional(),
    moduleCode: moduleCodeSchema.optional(),
    requestedEntitlementStatus: z
      .enum([
        "active",
        "expired",
        "suspended",
        "revoked",
      ])
      .optional(),
    requestedActivationStatus: z
      .enum([
        "disabled",
        "pending-configuration",
        "enabled",
        "suspended",
      ])
      .optional(),
    effectiveAt: isoDateTimeSchema.optional(),
    requestedAt: isoDateTimeSchema,
    startedAt: isoDateTimeSchema.optional(),
    completedAt: isoDateTimeSchema.optional(),
    failedAt: isoDateTimeSchema.optional(),
    failureReason: reasonSchema.optional(),
    cancelledAt: isoDateTimeSchema.optional(),
    cancellationReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.type === "force-password-reset" &&
      value.targetUserId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetUserId"],
        message:
          "A forced password reset requires a target user.",
      });
    }

    if (
      ["upgrade", "downgrade"].includes(value.type) &&
      value.requestedPlanTierCode === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["requestedPlanTierCode"],
        message:
          "A subscription change requires the requested plan tier.",
      });
    }

    if (
      value.type === "set-module-entitlement" &&
      (
        value.moduleCode === undefined ||
        value.requestedEntitlementStatus === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["moduleCode"],
        message:
          "A module entitlement action requires a module and entitlement state.",
      });
    }

    if (
      value.status === "failed" &&
      (
        value.failedAt === undefined ||
        value.failureReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["failureReason"],
        message:
          "A failed control action needs a time and reason.",
      });
    }

    if (
      value.status === "cancelled" &&
      (
        value.cancelledAt === undefined ||
        value.cancellationReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["cancellationReason"],
        message:
          "A cancelled control action needs a time and reason.",
      });
    }
  }) satisfies z.ZodType<PlatformControlAction>;

export const tenantUsageSnapshotSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    periodStartsAt: isoDateTimeSchema,
    periodEndsAt: isoDateTimeSchema,
    patientCount: nonNegativeIntegerSchema,
    appointmentCount: nonNegativeIntegerSchema,
    storageBytes: nonNegativeIntegerSchema,
    messageCount: nonNegativeIntegerSchema,
    capturedAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isValidIsoDateTimeRange(
        value.periodStartsAt,
        value.periodEndsAt,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["periodEndsAt"],
        message:
          "The usage period must end after it starts.",
      });
    }
  }) satisfies z.ZodType<TenantUsageSnapshot>;

export const tenantProvisioningAggregateSchema = z
  .object({
    request: tenantProvisioningRequestSchema,
    subscription:
      organizationSubscriptionSchema.optional(),
    ownerAssignments: z.array(
      organizationOwnerAssignmentSchema,
    ),
    ownerInvitations: z.array(
      organizationOwnerInvitationSchema,
    ),

    onboardingState:
      tenantOnboardingStateSchema.optional(),

    moduleEntitlements: z.array(
      moduleEntitlementSchema,
    ),
    moduleActivations: z.array(
      organizationModuleActivationSchema,
    ),
    controlActions: z.array(
      platformControlActionSchema,
    ),
    usageSnapshots: z.array(
      tenantUsageSnapshotSchema,
    ),
    supportAccessSessions: z.array(
      supportAccessSessionSchema,
    ),
    supportAccessAuditEvents: z.array(
      supportAccessAuditEventSchema,
    ),
    breakGlassAccessSessions: z.array(
      breakGlassAccessSessionSchema,
    ),
  })
  .strict() satisfies z.ZodType<TenantProvisioningAggregate>;

/**
 * Platform-admin provisioning form. Lifecycle and audit fields remain
 * server controlled.
 */
export const tenantProvisioningFormSchema = z
  .object({
    requestedOrganizationName: shortTextSchema,
    requestedOrganizationCode: codeSchema,
    requestedOwnerUserId: wonFlowIdSchema,
    requestedPlanTierCode: codeSchema,
    requestedSeatCount: positiveIntegerSchema,
    requestedModuleCodes: z.array(moduleCodeSchema),
  })
  .strict();

export type TenantProvisioningFormInput =
  z.input<typeof tenantProvisioningFormSchema>;

export const platformTenantProvisioningFormSchema = z
  .object({
    organizationName: shortTextSchema,
    organizationCode: codeSchema,
    ownerEmail: z.string().trim().email(),
    intendedOwnerUserId: wonFlowIdSchema.optional(),
    planTierCode: codeSchema,
    seatCount: positiveIntegerSchema,
    moduleCodes: z.array(moduleCodeSchema),
    ownerInvitationExpiresAt: isoDateTimeSchema,
    reason: reasonSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.moduleCodes).size !== value.moduleCodes.length) {
      context.addIssue({
        code: "custom",
        path: ["moduleCodes"],
        message: "Module selections must be unique.",
      });
    }
  });

export type PlatformTenantProvisioningFormInput =
  z.input<typeof platformTenantProvisioningFormSchema>;

export const platformSubscriptionFormSchema = z
  .object({
    planTierCode: codeSchema,
    seatCount: positiveIntegerSchema,
    billingStatus: organizationSubscriptionBillingStatusSchema,
    trialStartsAt: isoDateTimeSchema.optional(),
    trialEndsAt: isoDateTimeSchema.optional(),
    currentBillingPeriodStartsAt: isoDateTimeSchema.optional(),
    currentBillingPeriodEndsAt: isoDateTimeSchema.optional(),
    expiresAt: isoDateTimeSchema.optional(),
    reason: reasonSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.trialStartsAt !== undefined &&
      value.trialEndsAt !== undefined &&
      !isValidIsoDateTimeRange(value.trialStartsAt, value.trialEndsAt, true)
    ) {
      context.addIssue({
        code: "custom",
        path: ["trialEndsAt"],
        message: "The trial cannot end before it starts.",
      });
    }
    if (
      value.currentBillingPeriodStartsAt !== undefined &&
      value.currentBillingPeriodEndsAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.currentBillingPeriodStartsAt,
        value.currentBillingPeriodEndsAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["currentBillingPeriodEndsAt"],
        message: "The billing period cannot end before it starts.",
      });
    }
  });

export const platformModuleEntitlementFormSchema = z
  .object({
    moduleCode: moduleCodeSchema,
    entitlementStatus: z.enum([
      "active",
      "expired",
      "suspended",
      "revoked",
    ]),
    activationStatus: z.enum([
      "disabled",
      "pending-configuration",
      "enabled",
      "suspended",
    ]),
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.optional(),
    notes: longTextSchema.optional(),
    reason: reasonSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveTo !== undefined &&
      !isValidIsoDateTimeRange(value.effectiveFrom, value.effectiveTo, true)
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "The entitlement cannot end before it begins.",
      });
    }
    if (
      value.entitlementStatus !== "active" &&
      value.activationStatus === "enabled"
    ) {
      context.addIssue({
        code: "custom",
        path: ["activationStatus"],
        message:
          "A module cannot remain enabled without an active entitlement.",
      });
    }
  });

export const platformTenantLifecycleActionFormSchema = z
  .object({
    action: z.enum(["suspend", "reactivate", "terminate"]),
    confirmation: shortTextSchema,
    reason: reasonSchema,
  })
  .strict();

export const platformSupportAccessRequestFormSchema = z
  .object({
    requestedReason: reasonSchema,
    allowedPermissionCodes: z
      .array(permissionCodeSchema)
      .min(1, "Select at least one support permission."),
    allowedBranchIds: z.array(wonFlowIdSchema).optional(),
    requestedExpiresAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(value.allowedPermissionCodes).size !==
      value.allowedPermissionCodes.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["allowedPermissionCodes"],
        message: "Support permissions must be unique.",
      });
    }
  });

export const platformSupportAccessDecisionFormSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    reason: reasonSchema,
    expiresAt: isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === "approve" && value.expiresAt === undefined) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Approved support access requires an expiry time.",
      });
    }
  });

export const platformSupportAccessRevocationFormSchema = z
  .object({
    confirmation: shortTextSchema,
    reason: reasonSchema,
  })
  .strict();
