/**
 * Runtime validation for temporary, consented patient-record sharing.
 */

import * as z from "zod";

import type {
  ExternalClinicianProfile,
  PatientSharingAggregate,
  PatientSharingConsent,
  PatientSharingExternalClinicianGrant,
  PatientSharingGrant,
  PatientSharingGrantBase,
  PatientSharingOrganizationGrant,
  PatientSharingUserGrant,
  SharingAccessEvent,
} from "@wonflow/contracts";

import {
  emailAddressSchema,
  phoneNumberSchema,
} from "../contact";

import {
  isoDateTimeSchema,
  longTextSchema,
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

export const patientSharingRecordCategorySchema = z.enum([
  "demographics",
  "appointments",
  "consultations",
  "diagnoses",
  "medications",
  "prescriptions",
  "laboratory-reports",
  "radiology-reports",
  "histopathology-reports",
  "discharge-summaries",
  "documents",
  "follow-ups",
  "messages",
]);

export const patientSharingTargetTypeSchema = z.enum([
  "user",
  "organization",
  "external-clinician",
]);

export const sharingAccessActionSchema = z.enum([
  "view",
  "open",
  "download",
  "print",
]);

const patientSharingGrantBaseShape = {
  id: wonFlowIdSchema,
  organizationId: wonFlowIdSchema,
  patientId: wonFlowIdSchema,
  grantedByTeamMemberId: wonFlowIdSchema,
  scope: z
    .array(patientSharingRecordCategorySchema)
    .min(1, "Select at least one record category."),
  purpose: reasonSchema,
  grantedAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  revokedByTeamMemberId: wonFlowIdSchema.optional(),
  revokedAt: isoDateTimeSchema.optional(),
  revocationReason: reasonSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
};

function refinePatientSharingGrant(
  value: {
    grantedAt: string;
    expiresAt: string;
    revokedByTeamMemberId?: string;
    revokedAt?: string;
    revocationReason?: string;
  },
  context: z.RefinementCtx,
): void {
  if (
    !isValidIsoDateTimeRange(
      value.grantedAt,
      value.expiresAt,
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["expiresAt"],
      message:
        "The sharing grant must expire after it is granted.",
    });
  }

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
        "Revocation requires the team member, time and reason.",
    });
  }

  if (
    value.revokedAt !== undefined &&
    !isValidIsoDateTimeRange(
      value.grantedAt,
      value.revokedAt,
      true,
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["revokedAt"],
      message:
        "A sharing grant cannot be revoked before it is granted.",
    });
  }
}

export const patientSharingGrantBaseSchema = z
  .object({
    ...patientSharingGrantBaseShape,
    targetType: patientSharingTargetTypeSchema,
  })
  .strict()
  .superRefine(refinePatientSharingGrant) satisfies z.ZodType<PatientSharingGrantBase>;

export const patientSharingUserGrantSchema = z
  .object({
    ...patientSharingGrantBaseShape,
    targetType: z.literal("user"),
    grantedToUserId: wonFlowIdSchema,
    grantedToOrganizationId: z.never().optional(),
    grantedToExternalClinicianProfileId:
      z.never().optional(),
  })
  .strict()
  .superRefine(refinePatientSharingGrant) satisfies z.ZodType<PatientSharingUserGrant>;

export const patientSharingOrganizationGrantSchema = z
  .object({
    ...patientSharingGrantBaseShape,
    targetType: z.literal("organization"),
    grantedToOrganizationId: wonFlowIdSchema,
    grantedToUserId: z.never().optional(),
    grantedToExternalClinicianProfileId:
      z.never().optional(),
  })
  .strict()
  .superRefine(refinePatientSharingGrant) satisfies z.ZodType<PatientSharingOrganizationGrant>;

export const patientSharingExternalClinicianGrantSchema = z
  .object({
    ...patientSharingGrantBaseShape,
    targetType: z.literal("external-clinician"),
    grantedToExternalClinicianProfileId:
      wonFlowIdSchema,
    grantedToUserId: z.never().optional(),
    grantedToOrganizationId: z.never().optional(),
  })
  .strict()
  .superRefine(refinePatientSharingGrant) satisfies z.ZodType<PatientSharingExternalClinicianGrant>;

export const patientSharingGrantSchema = z.union([
  patientSharingUserGrantSchema,
  patientSharingOrganizationGrantSchema,
  patientSharingExternalClinicianGrantSchema,
]) satisfies z.ZodType<PatientSharingGrant>;

export const patientSharingConsentSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    patientSharingGrantId: wonFlowIdSchema,
    patientConsentRecordId: wonFlowIdSchema,
    patientAccountId: wonFlowIdSchema,
    consentedAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<PatientSharingConsent>;

export const externalClinicianProfileSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    name: shortTextSchema,
    specialty: shortTextSchema,
    pmdcNumber: shortTextSchema.optional(),
    organizationName: shortTextSchema.optional(),
    email: emailAddressSchema.optional(),
    phoneNumber: phoneNumberSchema.optional(),
    address: longTextSchema.optional(),
    notes: longTextSchema.optional(),
    status: recordStatusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<ExternalClinicianProfile>;

export const sharingAccessEventSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientSharingGrantId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    targetType: patientSharingTargetTypeSchema,
    granteeUserId: wonFlowIdSchema.optional(),
    granteeOrganizationId:
      wonFlowIdSchema.optional(),
    externalClinicianProfileId:
      wonFlowIdSchema.optional(),
    recordCategory:
      patientSharingRecordCategorySchema,
    resourceType: shortTextSchema,
    resourceId: wonFlowIdSchema,
    action: sharingAccessActionSchema,
    purpose: longTextSchema.optional(),
    ipAddress: ipAddressSchema.optional(),
    userAgent: userAgentSchema.optional(),
    occurredAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const matchingTargetCount = [
      value.targetType === "user" &&
      value.granteeUserId !== undefined,
      value.targetType === "organization" &&
      value.granteeOrganizationId !== undefined,
      value.targetType === "external-clinician" &&
      value.externalClinicianProfileId !== undefined,
    ].filter(Boolean).length;

    if (matchingTargetCount !== 1) {
      context.addIssue({
        code: "custom",
        path: ["targetType"],
        message:
          "The access event must identify the grantee matching its target type.",
      });
    }
  }) satisfies z.ZodType<SharingAccessEvent>;

export const patientSharingAggregateSchema = z
  .object({
    grants: z.array(patientSharingGrantSchema),
    consents: z.array(patientSharingConsentSchema),
    externalClinicians: z.array(
      externalClinicianProfileSchema,
    ),
    accessEvents: z.array(sharingAccessEventSchema),
  })
  .strict() satisfies z.ZodType<PatientSharingAggregate>;

/**
 * Staff-facing grant input. Grant time is explicit so expiry validation
 * remains deterministic in both mock and live implementations.
 */
export const patientSharingGrantFormSchema = z
  .discriminatedUnion("targetType", [
    z
      .object({
        patientId: wonFlowIdSchema,
        targetType: z.literal("user"),
        grantedToUserId: wonFlowIdSchema,
        scope: z
          .array(patientSharingRecordCategorySchema)
          .min(1),
        purpose: reasonSchema,
        grantedAt: isoDateTimeSchema,
        expiresAt: isoDateTimeSchema,
      })
      .strict(),
    z
      .object({
        patientId: wonFlowIdSchema,
        targetType: z.literal("organization"),
        grantedToOrganizationId: wonFlowIdSchema,
        scope: z
          .array(patientSharingRecordCategorySchema)
          .min(1),
        purpose: reasonSchema,
        grantedAt: isoDateTimeSchema,
        expiresAt: isoDateTimeSchema,
      })
      .strict(),
    z
      .object({
        patientId: wonFlowIdSchema,
        targetType: z.literal("external-clinician"),
        grantedToExternalClinicianProfileId:
          wonFlowIdSchema,
        scope: z
          .array(patientSharingRecordCategorySchema)
          .min(1),
        purpose: reasonSchema,
        grantedAt: isoDateTimeSchema,
        expiresAt: isoDateTimeSchema,
      })
      .strict(),
  ])
  .superRefine((value, context) => {
    if (
      !isValidIsoDateTimeRange(
        value.grantedAt,
        value.expiresAt,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message:
          "The sharing grant must expire after it is granted.",
      });
    }
  });

/**
 * Patient-facing consent confirmation. The authenticated account and
 * consent-capture metadata are attached by the server.
 */
export const patientSharingConsentFormSchema = z
  .object({
    patientSharingGrantId: wonFlowIdSchema,
    patientConsentRecordId: wonFlowIdSchema,
    accepted: z.literal(true),
  })
  .strict();

export type PatientSharingGrantFormInput =
  z.input<typeof patientSharingGrantFormSchema>;

export type PatientSharingConsentFormInput =
  z.input<typeof patientSharingConsentFormSchema>;
