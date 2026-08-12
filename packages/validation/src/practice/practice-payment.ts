/**
 * Runtime validation for tenant-configured payment providers, payment
 * intents, settlements, transfer proofs, refunds and receipt templates.
 */

import * as z from "zod";

import type {
  PaymentProviderConfig,
  PracticeExternalCollectedPaymentRecord,
  PracticeOfflinePaymentRecord,
  PracticeOnlinePaymentRecord,
  PracticePaymentAggregate,
  PracticePaymentIntent,
  PracticePaymentRecord,
  PracticeReceipt,
  PracticeReceiptFieldValue,
  PracticeReceiptTemplate,
  PracticeReceiptTemplateField,
  PracticeRefund,
  PracticeTransferProof,
  PracticeWaivedPaymentRecord,
} from "@wonflow/contracts";

import {
  currencyCodeSchema,
} from "../money";

import {
  codeSchema,
  isoDateTimeSchema,
  longTextSchema,
  reasonSchema,
  shortTextSchema,
  wonFlowIdSchema,
} from "../primitives";

import {
  isValidIsoDateTimeRange,
  opaqueReferenceSchema,
  recordStatusSchema,
} from "./shared";

import {
  practiceMoneySchema,
} from "./service-catalogue";

export const paymentProviderCollectionModeSchema = z.enum([
  "online",
  "offline",
  "external-facility",
  "waiver",
]);

export const practicePaymentIntentStatusSchema = z.enum([
  "draft",
  "pending",
  "requires-action",
  "processing",
  "succeeded",
  "failed",
  "expired",
  "cancelled",
  "waived",
]);

export const practicePaymentReconciliationStateSchema = z.enum([
  "not-required",
  "pending",
  "reconciled",
  "exception",
  "not-applicable",
]);

export const practiceTransferProofVerificationStatusSchema =
  z.enum([
    "pending",
    "approved",
    "rejected",
    "needs-clarification",
  ]);

export const practiceRefundStatusSchema = z.enum([
  "requested",
  "approved",
  "rejected",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const paymentProviderConfigSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId: wonFlowIdSchema,

    code: codeSchema,

    displayName: shortTextSchema,

    description:
      longTextSchema.optional(),

    collectionMode:
      paymentProviderCollectionModeSchema,

    integrationKey:
      opaqueReferenceSchema.optional(),

    supportedCurrencyCodes: z
      .array(currencyCodeSchema)
      .min(
        1,
        "Select at least one supported currency.",
      ),

    allPracticeLocations: z.boolean(),

    practiceLocationIds: z.array(
      wonFlowIdSchema,
    ),

    allServiceOfferings: z.boolean(),

    practiceServiceOfferingIds:
      z.array(wonFlowIdSchema),

    requiresTransferProof: z.boolean(),

    supportsRefunds: z.boolean(),

    patientFacing: z.boolean(),

    status: recordStatusSchema,

    createdAt: isoDateTimeSchema,

    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.collectionMode ===
        "online" &&
      value.integrationKey ===
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["integrationKey"],
        message:
          "An online provider requires an integration key.",
      });
    }

    if (
      value.collectionMode !==
        "online" &&
      value.integrationKey !==
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["integrationKey"],
        message:
          "Only an online provider may use an integration key.",
      });
    }

    if (
      value.collectionMode !==
        "offline" &&
      value.requiresTransferProof
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "requiresTransferProof",
        ],
        message:
          "Only an offline provider may require transfer proof.",
      });
    }

    if (
      !value.allPracticeLocations &&
      value.practiceLocationIds
        .length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "practiceLocationIds",
        ],
        message:
          "Select at least one location or enable all locations.",
      });
    }

    if (
      value.allPracticeLocations &&
      value.practiceLocationIds
        .length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "practiceLocationIds",
        ],
        message:
          "Do not provide location IDs when all locations are enabled.",
      });
    }

    if (
      !value.allServiceOfferings &&
      value.practiceServiceOfferingIds
        .length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "practiceServiceOfferingIds",
        ],
        message:
          "Select at least one offering or enable all offerings.",
      });
    }

    if (
      value.allServiceOfferings &&
      value.practiceServiceOfferingIds
        .length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "practiceServiceOfferingIds",
        ],
        message:
          "Do not provide offering IDs when all offerings are enabled.",
      });
    }

    if (
      new Set(
        value.supportedCurrencyCodes,
      ).size !==
      value.supportedCurrencyCodes
        .length
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supportedCurrencyCodes",
        ],
        message:
          "Supported currencies must be unique.",
      });
    }
  }) satisfies z.ZodType<PaymentProviderConfig>;

export const practicePaymentIntentSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId: wonFlowIdSchema,

    appointmentId: wonFlowIdSchema,

    paymentProviderConfigId:
      wonFlowIdSchema,

    methodCode: codeSchema,

    amount: practiceMoneySchema,

    status:
      practicePaymentIntentStatusSchema,

    gatewayReference:
      opaqueReferenceSchema.optional(),

    gatewaySessionReference:
      opaqueReferenceSchema.optional(),

    expiresAt:
      isoDateTimeSchema.optional(),

    failureReason:
      reasonSchema.optional(),

    cancelledAt:
      isoDateTimeSchema.optional(),

    cancellationReason:
      reasonSchema.optional(),

    createdAt: isoDateTimeSchema,

    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.expiresAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.createdAt,
        value.expiresAt,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message:
          "The payment intent must expire after it is created.",
      });
    }

    if (
      value.status === "failed" &&
      value.failureReason === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["failureReason"],
        message:
          "A failed payment intent requires a reason.",
      });
    }

    if (
      value.status ===
        "cancelled" &&
      (
        value.cancelledAt ===
          undefined ||
        value.cancellationReason ===
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "cancellationReason",
        ],
        message:
          "A cancelled payment intent requires a time and reason.",
      });
    }
  }) satisfies z.ZodType<PracticePaymentIntent>;

const practicePaymentRecordBaseShape = {
  id: wonFlowIdSchema,

  organizationId: wonFlowIdSchema,

  appointmentId: wonFlowIdSchema,

  paymentIntentId:
    wonFlowIdSchema.optional(),

  paymentProviderConfigId:
    wonFlowIdSchema,

  methodCode: codeSchema,

  collectionMode:
    paymentProviderCollectionModeSchema,

  amount: practiceMoneySchema,

  receiptNumber: shortTextSchema,

  reconciliationState:
    practicePaymentReconciliationStateSchema,

  settledAt: isoDateTimeSchema,

  createdAt: isoDateTimeSchema,

  updatedAt: isoDateTimeSchema,
};

export const practiceOnlinePaymentRecordSchema = z
  .object({
    ...practicePaymentRecordBaseShape,

    collectionMode:
      z.literal("online"),

    gatewayTransactionId:
      opaqueReferenceSchema,

    gatewayReference:
      opaqueReferenceSchema.optional(),

    collectedByTeamMemberId:
      z.never().optional(),

    transferProofId:
      z.never().optional(),

    externalCollectionReference:
      z.never().optional(),

    externalCollectorName:
      z.never().optional(),

    waivedByTeamMemberId:
      z.never().optional(),

    waiverReason:
      z.never().optional(),
  })
  .strict() satisfies z.ZodType<PracticeOnlinePaymentRecord>;

export const practiceOfflinePaymentRecordSchema = z
  .object({
    ...practicePaymentRecordBaseShape,

    collectionMode:
      z.literal("offline"),

    gatewayTransactionId:
      z.never().optional(),

    gatewayReference:
      z.never().optional(),

    collectedByTeamMemberId:
      wonFlowIdSchema,

    transferProofId:
      wonFlowIdSchema.optional(),

    externalCollectionReference:
      z.never().optional(),

    externalCollectorName:
      z.never().optional(),

    waivedByTeamMemberId:
      z.never().optional(),

    waiverReason:
      z.never().optional(),
  })
  .strict() satisfies z.ZodType<PracticeOfflinePaymentRecord>;

export const practiceExternalCollectedPaymentRecordSchema =
  z
    .object({
      ...practicePaymentRecordBaseShape,

      collectionMode:
        z.literal(
          "external-facility",
        ),

      reconciliationState:
        z.literal(
          "not-applicable",
        ),

      externalCollectionReference:
        opaqueReferenceSchema,

      externalCollectorName:
        shortTextSchema,

      collectedByTeamMemberId:
        z.never().optional(),

      transferProofId:
        z.never().optional(),

      gatewayTransactionId:
        z.never().optional(),

      gatewayReference:
        z.never().optional(),

      waivedByTeamMemberId:
        z.never().optional(),

      waiverReason:
        z.never().optional(),
    })
    .strict() satisfies z.ZodType<PracticeExternalCollectedPaymentRecord>;

export const practiceWaivedPaymentRecordSchema = z
  .object({
    ...practicePaymentRecordBaseShape,

    collectionMode:
      z.literal("waiver"),

    reconciliationState:
      z.literal("not-required"),

    waivedByTeamMemberId:
      wonFlowIdSchema,

    waiverReason: reasonSchema,

    collectedByTeamMemberId:
      z.never().optional(),

    transferProofId:
      z.never().optional(),

    gatewayTransactionId:
      z.never().optional(),

    gatewayReference:
      z.never().optional(),

    externalCollectionReference:
      z.never().optional(),

    externalCollectorName:
      z.never().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.amount.amountMinorUnits !== 0) {
      context.addIssue({
        code: "custom",
        path: ["amount", "amountMinorUnits"],
        message:
          "A waived payment record must have a zero amount.",
      });
    }
  }) satisfies z.ZodType<PracticeWaivedPaymentRecord>;

export const practicePaymentRecordSchema = z.union([
  practiceOnlinePaymentRecordSchema,
  practiceOfflinePaymentRecordSchema,
  practiceExternalCollectedPaymentRecordSchema,
  practiceWaivedPaymentRecordSchema,
]) satisfies z.ZodType<PracticePaymentRecord>;

export const practiceTransferProofSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId: wonFlowIdSchema,

    appointmentId: wonFlowIdSchema,

    paymentIntentId:
      wonFlowIdSchema.optional(),

    paymentProviderConfigId:
      wonFlowIdSchema,

    practiceDocumentId:
      wonFlowIdSchema,

    submittedAmount:
      practiceMoneySchema,

    verificationStatus:
      practiceTransferProofVerificationStatusSchema,

    submittedByPatientAccountId:
      wonFlowIdSchema.optional(),

    submittedByUserId:
      wonFlowIdSchema.optional(),

    submittedAt: isoDateTimeSchema,

    verifiedByTeamMemberId:
      wonFlowIdSchema.optional(),

    verifiedAt:
      isoDateTimeSchema.optional(),

    verificationNote:
      longTextSchema.optional(),

    rejectedAt:
      isoDateTimeSchema.optional(),

    rejectionReason:
      reasonSchema.optional(),

    createdAt: isoDateTimeSchema,

    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.verificationStatus === "approved" &&
      (
        value.verifiedByTeamMemberId === undefined ||
        value.verifiedAt === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["verifiedAt"],
        message:
          "Approved transfer proof requires a verifier and verification time.",
      });
    }

    if (
      value.verificationStatus === "rejected" &&
      (
        value.rejectedAt === undefined ||
        value.rejectionReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message:
          "Rejected transfer proof requires a time and reason.",
      });
    }
  }) satisfies z.ZodType<PracticeTransferProof>;

export const practiceRefundSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId: wonFlowIdSchema,

    appointmentId: wonFlowIdSchema,

    paymentRecordId:
      wonFlowIdSchema,

    paymentProviderConfigId:
      wonFlowIdSchema.optional(),

    methodCode: codeSchema,

    amount: practiceMoneySchema,

    reason: reasonSchema,

    status:
      practiceRefundStatusSchema,

    requestedByUserId:
      wonFlowIdSchema,

    requestedAt: isoDateTimeSchema,

    approvedByTeamMemberId:
      wonFlowIdSchema.optional(),

    approvedAt:
      isoDateTimeSchema.optional(),

    rejectedByTeamMemberId:
      wonFlowIdSchema.optional(),

    rejectedAt:
      isoDateTimeSchema.optional(),

    rejectionReason:
      reasonSchema.optional(),

    gatewayRefundReference:
      opaqueReferenceSchema.optional(),

    processedByTeamMemberId:
      wonFlowIdSchema.optional(),

    completedAt:
      isoDateTimeSchema.optional(),

    failedAt:
      isoDateTimeSchema.optional(),

    failureReason:
      reasonSchema.optional(),

    cancelledAt:
      isoDateTimeSchema.optional(),

    cancellationReason:
      reasonSchema.optional(),

    createdAt: isoDateTimeSchema,

    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.status === "approved" &&
      (
        value.approvedByTeamMemberId === undefined ||
        value.approvedAt === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["approvedAt"],
        message:
          "An approved refund requires an approver and approval time.",
      });
    }

    if (
      value.status === "rejected" &&
      (
        value.rejectedByTeamMemberId === undefined ||
        value.rejectedAt === undefined ||
        value.rejectionReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message:
          "A rejected refund requires an actor, time and reason.",
      });
    }

    if (
      value.status === "completed" &&
      value.completedAt === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message:
          "A completed refund requires a completion time.",
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
          "A failed refund requires a time and reason.",
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
          "A cancelled refund requires a time and reason.",
      });
    }
  }) satisfies z.ZodType<PracticeRefund>;

export const practiceReceiptTemplateFieldSchema =
  z
    .object({
      key: codeSchema,

      label: shortTextSchema,

      visible: z.boolean(),

      sortOrder: z
        .number()
        .int()
        .nonnegative(),
    })
    .strict() satisfies z.ZodType<PracticeReceiptTemplateField>;

export const practiceReceiptTemplateSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId: wonFlowIdSchema,

    name: shortTextSchema,

    version: shortTextSchema,

    headerText:
      longTextSchema.optional(),

    footerText:
      longTextSchema.optional(),

    taxNote:
      longTextSchema.optional(),

    fields: z.array(
      practiceReceiptTemplateFieldSchema,
    ),

    effectiveFrom:
      isoDateTimeSchema,

    effectiveTo:
      isoDateTimeSchema.optional(),

    status: recordStatusSchema,

    createdAt: isoDateTimeSchema,

    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveTo !==
        undefined &&
      !isValidIsoDateTimeRange(
        value.effectiveFrom,
        value.effectiveTo,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message:
          "The template end time must be after its start time.",
      });
    }

    const keys = value.fields.map(
      (field) => field.key,
    );

    if (
      new Set(keys).size !==
      keys.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["fields"],
        message:
          "Receipt template field keys must be unique.",
      });
    }

    const sortOrders =
      value.fields.map(
        (field) =>
          field.sortOrder,
      );

    if (
      new Set(sortOrders).size !==
      sortOrders.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["fields"],
        message:
          "Receipt template sort orders must be unique.",
      });
    }
  }) satisfies z.ZodType<PracticeReceiptTemplate>;

export const practiceReceiptFieldValueSchema =
  z
    .object({
      key: codeSchema,

      label: shortTextSchema,

      value: z
        .string()
        .trim()
        .max(
          2_000,
          "The receipt field value is too long.",
        ),

      sortOrder: z
        .number()
        .int()
        .nonnegative(),
    })
    .strict() satisfies z.ZodType<PracticeReceiptFieldValue>;

export const practiceReceiptSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId: wonFlowIdSchema,

    paymentRecordId:
      wonFlowIdSchema,

    appointmentId:
      wonFlowIdSchema,

    receiptTemplateId:
      wonFlowIdSchema,

    receiptTemplateVersion:
      shortTextSchema,

    receiptNumber:
      shortTextSchema,

    total: practiceMoneySchema,

    headerText:
      longTextSchema.optional(),

    footerText:
      longTextSchema.optional(),

    taxNote:
      longTextSchema.optional(),

    fieldValues: z.array(
      practiceReceiptFieldValueSchema,
    ),

    issuedAt: isoDateTimeSchema,

    issuedByTeamMemberId:
      wonFlowIdSchema.optional(),

    createdAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const keys =
      value.fieldValues.map(
        (field) => field.key,
      );

    if (
      new Set(keys).size !==
      keys.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["fieldValues"],
        message:
          "Rendered receipt field keys must be unique.",
      });
    }
  }) satisfies z.ZodType<PracticeReceipt>;

export const practicePaymentAggregateSchema = z
  .object({
    providerConfigs: z.array(
      paymentProviderConfigSchema,
    ),

    intents: z.array(
      practicePaymentIntentSchema,
    ),

    records: z.array(
      practicePaymentRecordSchema,
    ),

    transferProofs: z.array(
      practiceTransferProofSchema,
    ),

    refunds: z.array(
      practiceRefundSchema,
    ),

    receiptTemplates: z.array(
      practiceReceiptTemplateSchema,
    ),

    receipts: z.array(
      practiceReceiptSchema,
    ),
  })
  .strict() satisfies z.ZodType<PracticePaymentAggregate>;

/**
 * Patient-facing provider selection.
 *
 * Available provider IDs and method codes must come from the tenant's
 * active PaymentProviderConfig records.
 */
export const patientPracticePaymentSelectionFormSchema =
  z
    .object({
      appointmentId:
        wonFlowIdSchema,

      paymentProviderConfigId:
        wonFlowIdSchema,

      methodCode: codeSchema,

      amount: practiceMoneySchema,
    })
    .strict();

/**
 * Patient-facing submission of payment evidence.
 */
export const patientTransferProofFormSchema = z
  .object({
    appointmentId:
      wonFlowIdSchema,

    paymentIntentId:
      wonFlowIdSchema.optional(),

    paymentProviderConfigId:
      wonFlowIdSchema,

    practiceDocumentId:
      wonFlowIdSchema,

    submittedAmount:
      practiceMoneySchema,
  })
  .strict();

export type PatientPracticePaymentSelectionFormInput =
  z.input<
    typeof patientPracticePaymentSelectionFormSchema
  >;

export type PatientTransferProofFormInput =
  z.input<
    typeof patientTransferProofFormSchema
  >;