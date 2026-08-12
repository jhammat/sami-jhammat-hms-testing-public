/**
 * Runtime validation for patient message threads, messages, triage
 * rules, escalation events and safety acknowledgements.
 */

import * as z from "zod";

import type {
  PracticeMessage,
  PracticeMessageCategoryConfig,
  PracticeMessageEscalation,
  PracticeMessageReadReceipt,
  PracticeMessageSafetyNotice,
  PracticeMessageThread,
  PracticeMessageThreadAggregate,
  PracticeMessageTriageRule,
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
  ipAddressSchema,
  isValidIsoDateTimeRange,
  recordStatusSchema,
  userAgentSchema,
} from "./shared";

import {
  practiceClinicalSignatureSchema,
} from "./practice-document";

export const practiceMessageCategoryConfigSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    code: codeSchema,
    displayName: shortTextSchema,
    description: longTextSchema.optional(),
    sortOrder: z.number().int().nonnegative(),
    status: recordStatusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<PracticeMessageCategoryConfig>;

export const practiceMessageThreadStatusSchema = z.enum([
  "open",
  "awaiting-practice",
  "awaiting-patient",
  "resolved",
  "closed",
]);

export const practiceMessagePrioritySchema = z.enum([
  "routine",
  "high",
  "urgent",
]);

export const practiceMessageAuthorRoleSchema = z.enum([
  "owner",
  "consultant",
  "senior-registrar",
  "resident",
  "house-surgeon",
  "clinical-dietitian",
  "coordinator",
  "patient",
  "patient-representative",
  "system",
]);

export const practiceMessageStatusSchema = z.enum([
  "draft",
  "awaiting-countersignature",
  "approved",
  "sent",
  "failed",
]);

export const practiceMessageReadReceiptSchema = z
  .object({
    userId: wonFlowIdSchema,
    teamMemberId: wonFlowIdSchema.optional(),
    patientAccountId: wonFlowIdSchema.optional(),
    readAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<PracticeMessageReadReceipt>;

export const practiceMessageThreadSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    subject: shortTextSchema,
    categoryId: wonFlowIdSchema,
    status: practiceMessageThreadStatusSchema,
    priority: practiceMessagePrioritySchema,
    assignedTeamMemberId: wonFlowIdSchema.optional(),
    assignedAt: isoDateTimeSchema.optional(),
    assignedByTeamMemberId:
      wonFlowIdSchema.optional(),
    lastMessageAt: isoDateTimeSchema,
    lastPatientMessageAt:
      isoDateTimeSchema.optional(),
    lastPracticeMessageAt:
      isoDateTimeSchema.optional(),
    openedByUserId: wonFlowIdSchema,
    resolvedByTeamMemberId:
      wonFlowIdSchema.optional(),
    resolvedAt: isoDateTimeSchema.optional(),
    closedByTeamMemberId:
      wonFlowIdSchema.optional(),
    closedAt: isoDateTimeSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const assignmentFields = [
      value.assignedTeamMemberId,
      value.assignedAt,
      value.assignedByTeamMemberId,
    ];

    const suppliedAssignmentFields =
      assignmentFields.filter(
        (field) => field !== undefined,
      ).length;

    if (
      suppliedAssignmentFields > 0 &&
      suppliedAssignmentFields < 3
    ) {
      context.addIssue({
        code: "custom",
        path: ["assignedTeamMemberId"],
        message:
          "Thread assignment requires the assignee, assigning member and time.",
      });
    }

    if (
      value.status === "resolved" &&
      (
        value.resolvedByTeamMemberId === undefined ||
        value.resolvedAt === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["resolvedAt"],
        message:
          "A resolved thread requires the resolving member and time.",
      });
    }

    if (
      value.status === "closed" &&
      (
        value.closedByTeamMemberId === undefined ||
        value.closedAt === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["closedAt"],
        message:
          "A closed thread requires the closing member and time.",
      });
    }
  }) satisfies z.ZodType<PracticeMessageThread>;

export const practiceMessageSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    threadId: wonFlowIdSchema,
    authorUserId: wonFlowIdSchema,
    authorRole: practiceMessageAuthorRoleSchema,
    authorTeamMemberId: wonFlowIdSchema.optional(),
    authorPatientAccountId:
      wonFlowIdSchema.optional(),
    body: longTextSchema,
    attachedDocumentIds: z.array(wonFlowIdSchema),
    status: practiceMessageStatusSchema,
    countersignatureRequired: z.boolean(),
    clinicalSignatureId: wonFlowIdSchema.optional(),
    sentAt: isoDateTimeSchema.optional(),
    failedAt: isoDateTimeSchema.optional(),
    failureReason: reasonSchema.optional(),
    readReceipts: z.array(
      practiceMessageReadReceiptSchema,
    ),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.countersignatureRequired &&
      value.clinicalSignatureId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["clinicalSignatureId"],
        message:
          "A supervised clinical reply requires a clinical signature record.",
      });
    }

    if (
      value.countersignatureRequired &&
      value.status === "draft"
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "A supervised reply must enter the countersignature workflow before sending.",
      });
    }

    if (
      value.status === "sent" &&
      value.sentAt === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["sentAt"],
        message:
          "A sent message requires a sent timestamp.",
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
          "A failed message requires a time and reason.",
      });
    }
  }) satisfies z.ZodType<PracticeMessage>;

export const practiceMessageTriageRuleSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    name: shortTextSchema,
    description: longTextSchema.optional(),
    categoryIds: z.array(wonFlowIdSchema),
    priorities: z.array(
      practiceMessagePrioritySchema,
    ),
    escalateAfterMinutes: nonNegativeIntegerSchema,
    fromTeamMemberId: wonFlowIdSchema.optional(),
    toTeamMemberId: wonFlowIdSchema,
    reason: reasonSchema,
    status: recordStatusSchema,
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.optional(),
    createdByTeamMemberId: wonFlowIdSchema,
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
          "The triage rule cannot end before it begins.",
      });
    }

    if (
      value.fromTeamMemberId !== undefined &&
      value.fromTeamMemberId === value.toTeamMemberId
    ) {
      context.addIssue({
        code: "custom",
        path: ["toTeamMemberId"],
        message:
          "An escalation must move to a different team member.",
      });
    }

    if (
      new Set(value.categoryIds).size !==
      value.categoryIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["categoryIds"],
        message:
          "Triage-rule category references must be unique.",
      });
    }
  }) satisfies z.ZodType<PracticeMessageTriageRule>;

/**
 * Owner-facing message-triage rule.
 *
 * Organization ownership, identifiers, creator attribution and
 * timestamps are supplied by the service operation.
 */
export const practiceMessageTriageRuleFormSchema = z
  .object({
    name: shortTextSchema,
    description: longTextSchema.optional(),
    categoryIds: z.array(wonFlowIdSchema),
    priorities: z.array(practiceMessagePrioritySchema),
    escalateAfterMinutes: nonNegativeIntegerSchema,
    fromTeamMemberId: wonFlowIdSchema.optional(),
    toTeamMemberId: wonFlowIdSchema,
    reason: reasonSchema,
    status: recordStatusSchema,
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.optional(),
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
          "The triage rule cannot end before it begins.",
      });
    }

    if (
      value.fromTeamMemberId !== undefined &&
      value.fromTeamMemberId === value.toTeamMemberId
    ) {
      context.addIssue({
        code: "custom",
        path: ["toTeamMemberId"],
        message:
          "An escalation must move to a different team member.",
      });
    }

    if (
      new Set(value.categoryIds).size !==
      value.categoryIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["categoryIds"],
        message:
          "Message-category selections must be unique.",
      });
    }

    if (
      new Set(value.priorities).size !==
      value.priorities.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["priorities"],
        message:
          "Message priorities must be unique.",
      });
    }

    if (value.status === "archived") {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Archived triage rules are read-only.",
      });
    }
  });

export type PracticeMessageTriageRuleFormInput =
  z.input<typeof practiceMessageTriageRuleFormSchema>;

export const practiceMessageEscalationSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    threadId: wonFlowIdSchema,
    triageRuleId: wonFlowIdSchema,
    fromTeamMemberId: wonFlowIdSchema.optional(),
    toTeamMemberId: wonFlowIdSchema,
    reason: reasonSchema,
    thresholdReachedAt: isoDateTimeSchema,
    firedAt: isoDateTimeSchema,
    acknowledgedByTeamMemberId:
      wonFlowIdSchema.optional(),
    acknowledgedAt: isoDateTimeSchema.optional(),
    resolvedByTeamMemberId:
      wonFlowIdSchema.optional(),
    resolvedAt: isoDateTimeSchema.optional(),
    cancelledByTeamMemberId:
      wonFlowIdSchema.optional(),
    cancelledAt: isoDateTimeSchema.optional(),
    cancellationReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isValidIsoDateTimeRange(
        value.thresholdReachedAt,
        value.firedAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["firedAt"],
        message:
          "An escalation cannot fire before its threshold is reached.",
      });
    }

    if (
      value.acknowledgedAt !== undefined &&
      value.acknowledgedByTeamMemberId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["acknowledgedByTeamMemberId"],
        message:
          "An acknowledgement requires the acknowledging team member.",
      });
    }

    if (
      value.resolvedAt !== undefined &&
      value.resolvedByTeamMemberId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["resolvedByTeamMemberId"],
        message:
          "A resolution requires the resolving team member.",
      });
    }

    if (
      value.cancelledAt !== undefined &&
      (
        value.cancelledByTeamMemberId === undefined ||
        value.cancellationReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["cancellationReason"],
        message:
          "A cancelled escalation requires an actor and reason.",
      });
    }
  }) satisfies z.ZodType<PracticeMessageEscalation>;

export const practiceMessageSafetyNoticeSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    patientAccountId: wonFlowIdSchema,
    noticeVersion: shortTextSchema,
    emergencyWarningText: longTextSchema,
    expectedResponseWindowMinutes:
      positiveIntegerSchema,
    emergencyLimitationAcknowledged:
      z.literal(true),
    acknowledgedAt: isoDateTimeSchema,
    ipAddress: ipAddressSchema,
    userAgent: userAgentSchema,
    createdAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<PracticeMessageSafetyNotice>;

export const practiceMessageThreadAggregateSchema = z
  .object({
    thread: practiceMessageThreadSchema,
    categories: z.array(
      practiceMessageCategoryConfigSchema,
    ),
    messages: z.array(practiceMessageSchema),
    escalations: z.array(
      practiceMessageEscalationSchema,
    ),
    signatures: z.array(
      practiceClinicalSignatureSchema,
    ),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [index, message] of
      value.messages.entries()) {
      if (
        message.threadId !== value.thread.id ||
        message.patientId !== value.thread.patientId ||
        message.organizationId !==
          value.thread.organizationId
      ) {
        context.addIssue({
          code: "custom",
          path: ["messages", index],
          message:
            "Every message must belong to this thread, patient and organization.",
        });
      }
    }
  }) satisfies z.ZodType<PracticeMessageThreadAggregate>;

/**
 * Patient-facing new-thread form. Patient and account ownership are
 * resolved from the authenticated session, not accepted from the body.
 */
export const patientMessageThreadFormSchema = z
  .object({
    subject: shortTextSchema,
    /**
     * Must reference an active category belonging to the same
     * organization. Repository and service validation enforce that
     * tenant-scoped lookup.
     */
    categoryId: wonFlowIdSchema,
    body: longTextSchema,
    attachedDocumentIds: z.array(wonFlowIdSchema),
    safetyNoticeVersion: shortTextSchema,
    emergencyLimitationAcknowledged:
      z.literal(true),
  })
  .strict();

export const patientMessageReplyFormSchema = z
  .object({
    threadId: wonFlowIdSchema,
    body: longTextSchema,
    attachedDocumentIds: z.array(wonFlowIdSchema),
  })
  .strict();

export type PatientMessageThreadFormInput =
  z.input<typeof patientMessageThreadFormSchema>;

export type PatientMessageReplyFormInput =
  z.input<typeof patientMessageReplyFormSchema>;
