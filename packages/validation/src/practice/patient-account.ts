/**
 * Runtime validation for patient accounts, patient links, invitations,
 * consent records and communication preferences.
 */

import * as z from "zod";

import type {
  PatientAccount,
  PatientAccountAggregate,
  PatientAccountInvitation,
  PatientAccountLink,
  PatientConsentRecord,
  PatientContactPreference,
  PatientDeviceRegistration,
} from "@wonflow/contracts";

import {
  emailAddressSchema,
  phoneNumberSchema,
} from "../contact";

import {
  isoDateTimeSchema,
  nonNegativeIntegerSchema,
  reasonSchema,
  shortTextSchema,
  wonFlowIdSchema,
} from "../primitives";

import {
  ipAddressSchema,
  isValidIsoDateTimeRange,
  opaqueReferenceSchema,
  userAgentSchema,
} from "./shared";

export const patientAccountStatusSchema = z.enum([
  "pending-verification",
  "active",
  "suspended",
  "disabled",
  "archived",
]);

export const patientAccountRelationshipSchema = z.enum([
  "self",
  "parent",
  "child",
  "spouse",
  "guardian",
]);

export const patientAccountLinkStatusSchema = z.enum([
  "pending-verification",
  "active",
  "revoked",
]);

export const patientAccountInvitationStatusSchema = z.enum([
  "pending",
  "redeemed",
  "revoked",
]);

export const patientConsentTypeSchema = z.enum([
  "data-storage",
  "treatment",
  "communication",
  "sharing-with-clinician",
]);

export const patientContactChannelSchema = z.enum([
  "whatsapp",
  "sms",
  "email",
  "call",
]);

export const patientDevicePlatformSchema = z.enum([
  "android",
  "ios",
  "web",
]);

export const patientAccountSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    email: emailAddressSchema,
    phoneNumber: phoneNumberSchema,
    whatsappNumber: phoneNumberSchema.optional(),
    emailVerifiedAt: isoDateTimeSchema.optional(),
    passwordUpdatedAt: isoDateTimeSchema,
    status: patientAccountStatusSchema,
    failedLoginCount: nonNegativeIntegerSchema,
    lockedUntil: isoDateTimeSchema.optional(),
    lastLoginAt: isoDateTimeSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<PatientAccount>;

export const patientAccountLinkSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientAccountId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    relationship: patientAccountRelationshipSchema,
    isPrimary: z.boolean(),
    status: patientAccountLinkStatusSchema,
    linkedByUserId: wonFlowIdSchema,
    verifiedByUserId: wonFlowIdSchema.optional(),
    verifiedAt: isoDateTimeSchema.optional(),
    revokedByUserId: wonFlowIdSchema.optional(),
    revokedAt: isoDateTimeSchema.optional(),
    revocationReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.status === "active" &&
      value.verifiedAt === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["verifiedAt"],
        message:
          "An active patient link must have a verification time.",
      });
    }

    if (
      value.status === "revoked" &&
      (
        value.revokedByUserId === undefined ||
        value.revokedAt === undefined ||
        value.revocationReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["revocationReason"],
        message:
          "A revoked patient link requires an actor, time and reason.",
      });
    }
  }) satisfies z.ZodType<PatientAccountLink>;

export const patientAccountInvitationSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    email: emailAddressSchema,
    phoneNumber: phoneNumberSchema,
    relationship: patientAccountRelationshipSchema,
    redemptionTokenReference: opaqueReferenceSchema,
    status: patientAccountInvitationStatusSchema,
    invitedByUserId: wonFlowIdSchema,
    expiresAt: isoDateTimeSchema,
    redeemedPatientAccountId:
      wonFlowIdSchema.optional(),
    redeemedAt: isoDateTimeSchema.optional(),
    revokedByUserId: wonFlowIdSchema.optional(),
    revokedAt: isoDateTimeSchema.optional(),
    revocationReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isValidIsoDateTimeRange(
        value.createdAt,
        value.expiresAt,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message:
          "The invitation must expire after it is created.",
      });
    }

    if (
      value.status === "redeemed" &&
      (
        value.redeemedPatientAccountId === undefined ||
        value.redeemedAt === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["redeemedAt"],
        message:
          "A redeemed invitation must reference the account and redemption time.",
      });
    }

    if (
      value.status === "revoked" &&
      (
        value.revokedByUserId === undefined ||
        value.revokedAt === undefined ||
        value.revocationReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["revocationReason"],
        message:
          "A revoked invitation requires an actor, time and reason.",
      });
    }
  }) satisfies z.ZodType<PatientAccountInvitation>;

export const patientConsentRecordSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientAccountId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    consentType: patientConsentTypeSchema,
    consentTextVersion: shortTextSchema,
    grantedAt: isoDateTimeSchema,
    ipAddress: ipAddressSchema,
    userAgent: userAgentSchema,
    withdrawnAt: isoDateTimeSchema.optional(),
    withdrawalReason: reasonSchema.optional(),
    withdrawalIpAddress: ipAddressSchema.optional(),
    withdrawalUserAgent: userAgentSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const withdrawalFields = [
      value.withdrawnAt,
      value.withdrawalReason,
      value.withdrawalIpAddress,
      value.withdrawalUserAgent,
    ];

    const suppliedCount = withdrawalFields.filter(
      (field) => field !== undefined,
    ).length;

    if (suppliedCount > 0 && suppliedCount < 4) {
      context.addIssue({
        code: "custom",
        path: ["withdrawnAt"],
        message:
          "Consent withdrawal requires the time, reason, IP address and user agent.",
      });
    }

    if (
      value.withdrawnAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.grantedAt,
        value.withdrawnAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["withdrawnAt"],
        message:
          "Consent cannot be withdrawn before it was granted.",
      });
    }
  }) satisfies z.ZodType<PatientConsentRecord>;

export const patientContactPreferenceSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientAccountId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    channel: patientContactChannelSchema,
    optedIn: z.boolean(),
    optedInAt: isoDateTimeSchema.optional(),
    optedOutAt: isoDateTimeSchema.optional(),
    updatedByUserId: wonFlowIdSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.optedIn &&
      value.optedInAt === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["optedInAt"],
        message:
          "An enabled contact channel needs an opt-in time.",
      });
    }

    if (
      !value.optedIn &&
      value.optedOutAt === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["optedOutAt"],
        message:
          "A disabled contact channel needs an opt-out time.",
      });
    }
  }) satisfies z.ZodType<PatientContactPreference>;

export const patientDeviceRegistrationSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    patientAccountId: wonFlowIdSchema,
    platform: patientDevicePlatformSchema,
    installationId: shortTextSchema,
    tokenReference: opaqueReferenceSchema,
    applicationVersion: shortTextSchema.optional(),
    operatingSystemVersion: shortTextSchema.optional(),
    lastSeenAt: isoDateTimeSchema,
    registeredAt: isoDateTimeSchema,
    revokedByUserId: wonFlowIdSchema.optional(),
    revokedAt: isoDateTimeSchema.optional(),
    revocationReason: reasonSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isValidIsoDateTimeRange(
        value.registeredAt,
        value.lastSeenAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["lastSeenAt"],
        message:
          "The device last-seen time cannot be earlier than registration.",
      });
    }

    if (
      value.revokedAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.registeredAt,
        value.revokedAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["revokedAt"],
        message:
          "A device registration cannot be revoked before it was registered.",
      });
    }

    if (
      value.revokedAt !== undefined &&
      (
        value.revokedByUserId === undefined ||
        value.revocationReason === undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["revocationReason"],
        message:
          "A revoked device registration requires an actor, time and reason.",
      });
    }
  }) satisfies z.ZodType<PatientDeviceRegistration>;

export const patientAccountAggregateSchema = z
  .object({
    account: patientAccountSchema,
    links: z.array(patientAccountLinkSchema),
    invitations: z.array(
      patientAccountInvitationSchema,
    ),
    consentRecords: z.array(
      patientConsentRecordSchema,
    ),
    contactPreferences: z.array(
      patientContactPreferenceSchema,
    ),
    deviceRegistrations: z.array(
      patientDeviceRegistrationSchema,
    ),
  })
  .strict() satisfies z.ZodType<PatientAccountAggregate>;

/**
 * Patient-facing registration input. Password fields exist only on the
 * form schema and never on PatientAccount.
 */
export const patientAccountRegistrationFormSchema = z
  .object({
    email: emailAddressSchema,
    phoneNumber: phoneNumberSchema,
    whatsappNumber: phoneNumberSchema.optional(),
    password: z
      .string()
      .min(1, "A password is required.")
      .max(1_024, "The password is too long."),
    confirmPassword: z
      .string()
      .min(1, "Confirm the password."),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "The passwords do not match.",
      });
    }
  });

export const patientAccountInvitationRedemptionFormSchema = z
  .object({
    invitationId: wonFlowIdSchema,
    redemptionToken: opaqueReferenceSchema,
    password: z
      .string()
      .min(1, "A password is required.")
      .max(1_024, "The password is too long."),
    confirmPassword: z
      .string()
      .min(1, "Confirm the password."),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "The passwords do not match.",
      });
    }
  });

export const patientConsentFormSchema = z
  .object({
    patientId: wonFlowIdSchema,
    consentType: patientConsentTypeSchema,
    consentTextVersion: shortTextSchema,
    accepted: z.literal(true),
  })
  .strict();

export const patientContactPreferenceFormSchema = z
  .object({
    patientId: wonFlowIdSchema,
    channel: patientContactChannelSchema,
    optedIn: z.boolean(),
  })
  .strict();

export type PatientAccountRegistrationFormInput =
  z.input<typeof patientAccountRegistrationFormSchema>;

export type PatientConsentFormInput =
  z.input<typeof patientConsentFormSchema>;

export type PatientContactPreferenceFormInput =
  z.input<typeof patientContactPreferenceFormSchema>;
