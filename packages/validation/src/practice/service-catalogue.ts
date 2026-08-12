/**
 * Runtime validation for practice services, location offerings and fee
 * history.
 */

import * as z from "zod";

import type {
  PracticeMoney,
  PracticeService,
  PracticeServiceCatalogue,
  PracticeServiceFeeChange,
  PracticeServiceOffering,
} from "@wonflow/contracts";

import {
  currencyCodeSchema,
  nonNegativeMinorUnitAmountSchema,
} from "../money";

import {
  codeSchema,
  isoDateTimeSchema,
  longTextSchema,
  positiveIntegerSchema,
  reasonSchema,
  shortTextSchema,
  wonFlowIdSchema,
} from "../primitives";

import {
  doctorConsultationModeSchema,
  isValidIsoDateTimeRange,
  recordStatusSchema,
} from "./shared";

export const practiceServiceCategorySchema = z.enum([
  "initial-consultation",
  "follow-up-consultation",
  "dietitian-consultation",
  "teleconsultation",
  "report-review",
  "procedure",
  "post-operative-review",
  "multidisciplinary-review",
  "home-visit",
  "other",
]);

export const practiceServiceEligibilitySchema = z.enum([
  "new-patient",
  "existing-patient",
  "post-operative-patient",
  "referred-patient",
  "adult",
  "child",
  "all-patients",
]);

export const practiceServiceDeliveryScopeSchema = z.enum([
  "unassigned",
  "any-active-clinician",
  "selected-clinicians",
]);

export const practiceFeeCollectorSchema = z.enum([
  "practice",
  "hospital",
]);

export const practicePaymentTimingSchema = z.enum([
  "not-required",
  "at-booking",
  "before-appointment",
  "at-location",
  "after-service",
]);

export const practiceMoneySchema = z
  .object({
    amountMinorUnits:
      nonNegativeMinorUnitAmountSchema,
    currencyCode: currencyCodeSchema,
  })
  .strict() satisfies z.ZodType<PracticeMoney>;

export const practiceServiceSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practitionerId: wonFlowIdSchema.optional(),
    deliveryScope:
      practiceServiceDeliveryScopeSchema,
    eligiblePractitionerIds:
      z.array(wonFlowIdSchema),
    code: codeSchema,
    name: shortTextSchema,
    description: longTextSchema.optional(),
    category: practiceServiceCategorySchema,
    defaultDurationMinutes: positiveIntegerSchema,
    consultationModes: z
      .array(doctorConsultationModeSchema)
      .min(1, "Select at least one consultation mode."),
    eligibility: z
      .array(practiceServiceEligibilitySchema)
      .min(1, "Select at least one eligibility rule."),
    preparationInstructions:
      longTextSchema.optional(),
    requiresDocumentUpload: z.boolean(),
    publicVisible: z.boolean(),
    publiclyBookable: z.boolean(),
    status: recordStatusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(
        value.eligiblePractitionerIds,
      ).size !==
      value.eligiblePractitionerIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "eligiblePractitionerIds",
        ],
        message:
          "Eligible clinician references must be unique.",
      });
    }

    if (
      value.deliveryScope ===
        "selected-clinicians" &&
      value.eligiblePractitionerIds
        .length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "eligiblePractitionerIds",
        ],
        message:
          "Select at least one clinician for this delivery scope.",
      });
    }

    if (
      value.deliveryScope !==
        "selected-clinicians" &&
      value.eligiblePractitionerIds
        .length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "eligiblePractitionerIds",
        ],
        message:
          "Clinician selections are only valid for selected-clinicians scope.",
      });
    }

    if (
      value.practitionerId !==
        undefined &&
      (
        value.deliveryScope !==
          "selected-clinicians" ||
        !value.eligiblePractitionerIds
          .includes(
            value.practitionerId,
          )
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "practitionerId",
        ],
        message:
          "A clinician-specific service must include that clinician in its delivery list.",
      });
    }

    if (
      value.publiclyBookable &&
      !value.publicVisible
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "publiclyBookable",
        ],
        message:
          "Public booking requires public visibility.",
      });
    }

    if (
      value.publiclyBookable &&
      value.deliveryScope ===
        "unassigned"
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "deliveryScope",
        ],
        message:
          "An unassigned service cannot be publicly bookable.",
      });
    }

    if (
      value.publiclyBookable &&
      value.status !== "active"
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Only an active service may be publicly bookable.",
      });
    }
  }) satisfies z.ZodType<PracticeService>;

export const practiceServiceOfferingSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practiceServiceId: wonFlowIdSchema,
    practiceLocationId: wonFlowIdSchema,
    fee: practiceMoneySchema,
    feeCollector: practiceFeeCollectorSchema,
    paymentTiming: practicePaymentTimingSchema,
    durationOverrideMinutes:
      positiveIntegerSchema.optional(),
    locationInstructions: longTextSchema.optional(),
    publiclyBookable: z.boolean(),
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.optional(),
    status: recordStatusSchema,
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
          "The offering end time cannot be before its start time.",
      });
    }
  }) satisfies z.ZodType<PracticeServiceOffering>;

export const practiceServiceFeeChangeSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practiceServiceOfferingId: wonFlowIdSchema,
    previousFee: practiceMoneySchema.optional(),
    newFee: practiceMoneySchema,
    effectiveFrom: isoDateTimeSchema,
    changedByUserId: wonFlowIdSchema,
    reason: reasonSchema,
    createdAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.previousFee !== undefined &&
      value.previousFee.currencyCode !==
        value.newFee.currencyCode
    ) {
      context.addIssue({
        code: "custom",
        path: ["newFee", "currencyCode"],
        message:
          "A fee change must use the same currency as the previous fee.",
      });
    }
  }) satisfies z.ZodType<PracticeServiceFeeChange>;

export const practiceServiceCatalogueSchema = z
  .object({
    services: z.array(practiceServiceSchema),
    offerings: z.array(
      practiceServiceOfferingSchema,
    ),
    feeHistory: z.array(
      practiceServiceFeeChangeSchema,
    ),
  })
  .strict() satisfies z.ZodType<PracticeServiceCatalogue>;

/**
 * Staff-facing service editor input. Organization ownership, record IDs
 * and audit timestamps are supplied by the service layer.
 */
export const practiceServiceFormSchema = z
  .object({
    practitionerId: wonFlowIdSchema.optional(),
    deliveryScope:
      practiceServiceDeliveryScopeSchema,
    eligiblePractitionerIds:
      z.array(wonFlowIdSchema),
    code: codeSchema,
    name: shortTextSchema,
    description: longTextSchema.optional(),
    category: practiceServiceCategorySchema,
    defaultDurationMinutes: positiveIntegerSchema,
    consultationModes: z
      .array(doctorConsultationModeSchema)
      .min(1),
    eligibility: z
      .array(practiceServiceEligibilitySchema)
      .min(1),
    preparationInstructions:
      longTextSchema.optional(),
    requiresDocumentUpload: z.boolean(),
    publicVisible: z.boolean(),
    publiclyBookable: z.boolean(),
    status: recordStatusSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(
        value.eligiblePractitionerIds,
      ).size !==
      value.eligiblePractitionerIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "eligiblePractitionerIds",
        ],
        message:
          "Eligible clinician references must be unique.",
      });
    }

    if (
      value.deliveryScope ===
        "selected-clinicians" &&
      value.eligiblePractitionerIds
        .length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "eligiblePractitionerIds",
        ],
        message:
          "Select at least one clinician.",
      });
    }

    if (
      value.deliveryScope !==
        "selected-clinicians" &&
      value.eligiblePractitionerIds
        .length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "eligiblePractitionerIds",
        ],
        message:
          "Clear clinician selections or use selected-clinicians scope.",
      });
    }

    if (
      value.practitionerId !==
        undefined &&
      (
        value.deliveryScope !==
          "selected-clinicians" ||
        !value.eligiblePractitionerIds
          .includes(
            value.practitionerId,
          )
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "practitionerId",
        ],
        message:
          "The specific clinician must also be selected as eligible.",
      });
    }

    if (
      value.publiclyBookable &&
      !value.publicVisible
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "publiclyBookable",
        ],
        message:
          "Public booking requires public visibility.",
      });
    }

    if (
      value.publiclyBookable &&
      value.deliveryScope ===
        "unassigned"
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "deliveryScope",
        ],
        message:
          "Assign clinicians before enabling public booking.",
      });
    }

    if (
      value.publiclyBookable &&
      value.status !== "active"
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Only an active service may be publicly bookable.",
      });
    }
  });

export const practiceServiceOfferingFormSchema = z
  .object({
    practiceServiceId: wonFlowIdSchema,
    practiceLocationId: wonFlowIdSchema,
    fee: practiceMoneySchema,
    feeCollector: practiceFeeCollectorSchema,
    paymentTiming: practicePaymentTimingSchema,
    durationOverrideMinutes:
      positiveIntegerSchema.optional(),
    locationInstructions: longTextSchema.optional(),
    publiclyBookable: z.boolean(),
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.optional(),
    status: recordStatusSchema,
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
          "The offering end time cannot be before its start time.",
      });
    }
  });

export type PracticeServiceFormInput =
  z.input<typeof practiceServiceFormSchema>;

export type PracticeServiceOfferingFormInput =
  z.input<typeof practiceServiceOfferingFormSchema>;
