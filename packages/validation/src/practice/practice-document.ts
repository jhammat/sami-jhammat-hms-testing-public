/**
 * Runtime validation for practice documents, reviews, releases,
 * requests, access events and clinical signatures.
 */

import * as z from "zod";

import type {
  PracticeClinicalSignature,
  PracticeDocument,
  PracticeDocumentAccessEvent,
  PracticeDocumentAggregate,
  PracticeDocumentFile,
  PracticeDocumentRelease,
  PracticeDocumentRequest,
  PracticeDocumentReview,
} from "@wonflow/contracts";

import {
  isoDateSchema,
  isoDateTimeSchema,
  longTextSchema,
  nonNegativeIntegerSchema,
  reasonSchema,
  shortTextSchema,
  wonFlowIdSchema,
} from "../primitives";

import {
  fileNameSchema,
  isValidIsoDateTimeRange,
  mimeTypeSchema,
  opaqueReferenceSchema,
  sha256Schema,
} from "./shared";

export const practiceDocumentCategorySchema = z.enum([
  "previous-visit",
  "prescription",
  "laboratory-report",
  "radiology-report",
  "histopathology-report",
  "discharge-summary",
  "referral",
  "medical-certificate",
  "consent",
  "patient-instruction",
  "consultation-summary",
  "other",
]);

export const practiceDocumentSourceSchema = z.enum([
  "patient-upload",
  "practice-generated",
  "external-provider",
  "external-hospital",
  "system-generated",
]);

export const practiceDocumentLifecycleStatusSchema = z.enum([
  "draft",
  "processing",
  "available",
  "archived",
  "entered-in-error",
]);

export const practiceDocumentScanStatusSchema = z.enum([
  "pending",
  "scanning",
  "clean",
  "infected",
  "failed",
  "not-required",
]);

export const practiceDocumentReviewDispositionSchema = z.enum([
  "unreviewed",
  "reviewed",
  "needs-clarification",
  "not-relevant",
  "superseded",
]);

export const practiceDocumentReviewCompletedDispositionSchema =
  z.enum([
    "reviewed",
    "needs-clarification",
    "not-relevant",
    "superseded",
  ]);

export const practiceDocumentVisibilitySchema = z.enum([
  "practice-only",
  "patient-visible",
  "shared-with-external-clinician",
]);

export const practiceDocumentReleaseVisibilitySchema = z.enum([
  "patient-visible",
  "shared-with-external-clinician",
]);

export const practiceDocumentRequestStatusSchema = z.enum([
  "open",
  "partially-fulfilled",
  "fulfilled",
  "cancelled",
  "expired",
]);

export const practiceDocumentAccessActionSchema = z.enum([
  "view-metadata",
  "open",
  "download",
  "print",
  "release",
  "revoke-release",
]);

export const practiceClinicalSignatureSubjectTypeSchema = z.enum([
  "consultation-note",
  "consultation-summary",
  "prescription",
  "patient-instructions",
  "document-review",
  "document-release",
  "message-reply",
  "other",
]);

export const practiceClinicalSignatureKindSchema = z.enum([
  "author",
  "countersignature",
  "amendment",
]);

export const practiceClinicalSignatureStatusSchema = z.enum([
  "pending",
  "signed",
  "rejected",
  "superseded",
]);

export const practiceDocumentFileSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practiceDocumentId: wonFlowIdSchema,
    fileName: fileNameSchema,
    mimeType: mimeTypeSchema,
    fileSizeBytes: nonNegativeIntegerSchema,
    checksumSha256: sha256Schema.optional(),
    storageKey: opaqueReferenceSchema,
    scanStatus: practiceDocumentScanStatusSchema,
    uploadedAt: isoDateTimeSchema,
    scanCompletedAt: isoDateTimeSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<PracticeDocumentFile>;

export const practiceDocumentSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    category: practiceDocumentCategorySchema,
    source: practiceDocumentSourceSchema,
    title: shortTextSchema,
    description: longTextSchema.optional(),
    clinicalDate: isoDateSchema.optional(),
    externalProviderName: shortTextSchema.optional(),
    externalDoctorName: shortTextSchema.optional(),
    externalSpecialtyName:
      shortTextSchema.optional(),
    fileIds: z.array(wonFlowIdSchema),
    currentFileId: wonFlowIdSchema.optional(),
    reviewDisposition:
      practiceDocumentReviewDispositionSchema,
    visibility: practiceDocumentVisibilitySchema,
    lifecycleStatus:
      practiceDocumentLifecycleStatusSchema,
    supersedesDocumentId: wonFlowIdSchema.optional(),
    supersededByDocumentId:
      wonFlowIdSchema.optional(),
    uploadedByUserId: wonFlowIdSchema.optional(),
    uploadedByPatientAccountId:
      wonFlowIdSchema.optional(),
    uploadedByTeamMemberId:
      wonFlowIdSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.currentFileId !== undefined &&
      !value.fileIds.includes(value.currentFileId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["currentFileId"],
        message:
          "The current file must be included in fileIds.",
      });
    }

    if (
      value.supersedesDocumentId === value.id ||
      value.supersededByDocumentId === value.id
    ) {
      context.addIssue({
        code: "custom",
        path: ["supersedesDocumentId"],
        message:
          "A document cannot supersede itself.",
      });
    }
  }) satisfies z.ZodType<PracticeDocument>;

export const practiceDocumentReviewSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practiceDocumentId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    disposition:
      practiceDocumentReviewCompletedDispositionSchema,
    reviewedByTeamMemberId: wonFlowIdSchema,
    privateClinicalNote: longTextSchema.optional(),
    clarificationMessage: longTextSchema.optional(),
    supersedingDocumentId:
      wonFlowIdSchema.optional(),
    reviewedAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.disposition === "superseded" &&
      value.supersedingDocumentId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["supersedingDocumentId"],
        message:
          "A superseded review must reference the replacement document.",
      });
    }
  }) satisfies z.ZodType<PracticeDocumentReview>;

export const practiceDocumentReleaseSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practiceDocumentId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    visibility: practiceDocumentReleaseVisibilitySchema,
    releasedByTeamMemberId: wonFlowIdSchema,
    releasedAt: isoDateTimeSchema,
    revokedByTeamMemberId: wonFlowIdSchema.optional(),
    revokedAt: isoDateTimeSchema.optional(),
    revocationReason: reasonSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const revocationFields = [
      value.revokedByTeamMemberId,
      value.revokedAt,
      value.revocationReason,
    ];

    const suppliedCount = revocationFields.filter(
      (field) => field !== undefined,
    ).length;

    if (suppliedCount > 0 && suppliedCount < 3) {
      context.addIssue({
        code: "custom",
        path: ["revokedAt"],
        message:
          "Revocation requires the actor, time and reason.",
      });
    }

    if (
      value.revokedAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.releasedAt,
        value.revokedAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["revokedAt"],
        message:
          "Revocation cannot occur before release.",
      });
    }
  }) satisfies z.ZodType<PracticeDocumentRelease>;

export const practiceDocumentRequestSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    requestedByTeamMemberId: wonFlowIdSchema,
    category: practiceDocumentCategorySchema,
    title: shortTextSchema,
    instructions: longTextSchema.optional(),
    requestedAt: isoDateTimeSchema,
    dueAt: isoDateTimeSchema.optional(),
    status: practiceDocumentRequestStatusSchema,
    fulfilledDocumentIds: z.array(wonFlowIdSchema),
    fulfilledAt: isoDateTimeSchema.optional(),
    cancelledByTeamMemberId:
      wonFlowIdSchema.optional(),
    cancelledAt: isoDateTimeSchema.optional(),
    cancellationReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.dueAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.requestedAt,
        value.dueAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["dueAt"],
        message:
          "The due time cannot be before the request time.",
      });
    }

    if (
      value.status === "fulfilled" &&
      (
        value.fulfilledAt === undefined ||
        value.fulfilledDocumentIds.length === 0
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["fulfilledDocumentIds"],
        message:
          "A fulfilled request needs a completion time and at least one document.",
      });
    }
  }) satisfies z.ZodType<PracticeDocumentRequest>;

export const practiceDocumentAccessEventSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    practiceDocumentId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    actorUserId: wonFlowIdSchema,
    actorTeamMemberId: wonFlowIdSchema.optional(),
    actorPatientAccountId:
      wonFlowIdSchema.optional(),
    action: practiceDocumentAccessActionSchema,
    purpose: longTextSchema.optional(),
    occurredAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<PracticeDocumentAccessEvent>;

export const practiceClinicalSignatureSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    subjectType:
      practiceClinicalSignatureSubjectTypeSchema,
    subjectId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    kind: practiceClinicalSignatureKindSchema,
    status: practiceClinicalSignatureStatusSchema,
    authoredByTeamMemberId: wonFlowIdSchema,
    countersignatureRequired: z.boolean(),
    requestedFromTeamMemberId:
      wonFlowIdSchema.optional(),
    requestedAt: isoDateTimeSchema.optional(),
    signedByTeamMemberId: wonFlowIdSchema.optional(),
    signedAt: isoDateTimeSchema.optional(),
    rejectedByTeamMemberId:
      wonFlowIdSchema.optional(),
    rejectedAt: isoDateTimeSchema.optional(),
    rejectionReason: reasonSchema.optional(),
    amendsSignatureId: wonFlowIdSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.countersignatureRequired) {
      if (
        value.requestedFromTeamMemberId === undefined
      ) {
        context.addIssue({
          code: "custom",
          path: ["requestedFromTeamMemberId"],
          message:
            "A countersignature must identify the requested supervisor.",
        });
      }

      if (
        value.requestedFromTeamMemberId ===
        value.authoredByTeamMemberId
      ) {
        context.addIssue({
          code: "custom",
          path: ["requestedFromTeamMemberId"],
          message:
            "A supervised author cannot request their own countersignature.",
        });
      }
    }

    if (value.status === "signed") {
      if (
        value.signedByTeamMemberId === undefined ||
        value.signedAt === undefined
      ) {
        context.addIssue({
          code: "custom",
          path: ["signedByTeamMemberId"],
          message:
            "A signed record requires the signer and signing time.",
        });
      }

      if (
        value.countersignatureRequired &&
        value.signedByTeamMemberId ===
          value.authoredByTeamMemberId
      ) {
        context.addIssue({
          code: "custom",
          path: ["signedByTeamMemberId"],
          message:
            "A countersigned member cannot self-sign.",
        });
      }
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
          "A rejected signature requires an actor, time and reason.",
      });
    }

    if (
      value.kind === "amendment" &&
      value.amendsSignatureId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["amendsSignatureId"],
        message:
          "An amendment must reference the signature it amends.",
      });
    }
  }) satisfies z.ZodType<PracticeClinicalSignature>;

export const practiceDocumentAggregateSchema = z
  .object({
    document: practiceDocumentSchema,
    files: z.array(practiceDocumentFileSchema),
    reviews: z.array(practiceDocumentReviewSchema),
    releases: z.array(practiceDocumentReleaseSchema),
    accessEvents: z.array(
      practiceDocumentAccessEventSchema,
    ),
    signatures: z.array(
      practiceClinicalSignatureSchema,
    ),
  })
  .strict() satisfies z.ZodType<PracticeDocumentAggregate>;

/**
 * Patient-facing upload form. Storage keys, scan state, ownership and
 * audit fields are server controlled and intentionally absent.
 */
export const patientDocumentUploadFileFormSchema = z
  .object({
    fileName: fileNameSchema,
    mimeType: mimeTypeSchema,
    fileSizeBytes: nonNegativeIntegerSchema,
  })
  .strict();

export const patientDocumentUploadFormSchema = z
  .object({
    patientId: wonFlowIdSchema,
    category: practiceDocumentCategorySchema,
    title: shortTextSchema,
    description: longTextSchema.optional(),
    clinicalDate: isoDateSchema.optional(),
    externalProviderName: shortTextSchema.optional(),
    externalDoctorName: shortTextSchema.optional(),
    externalSpecialtyName:
      shortTextSchema.optional(),
    files: z
      .array(patientDocumentUploadFileFormSchema)
      .min(1, "Attach at least one file.")
      .max(10, "Attach no more than ten files."),
  })
  .strict();

export type PatientDocumentUploadFormInput =
  z.input<typeof patientDocumentUploadFormSchema>;
