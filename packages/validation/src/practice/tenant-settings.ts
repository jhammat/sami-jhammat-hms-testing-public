/**
 * Runtime validation for tenant-owned profile, policy, content,
 * notification-template and terminology settings.
 *
 * Validation in this file checks structural and historical integrity.
 * Tenant-specific values are supplied as data and are never embedded as
 * defaults in these schemas.
 */

import * as z from "zod";

import type {
  TenantColourPalette,
  TenantContentBlock,
  TenantNotificationTemplate,
  TenantNotificationTemplateVariable,
  TenantPolicySettings,
  TenantProfile,
  TenantPublicContactDetails,
  TenantSettingsAggregate,
  TenantTerminology,
} from "@wonflow/contracts";

import {
  emailAddressSchema,
  phoneNumberSchema,
} from "../contact";

import {
  currencyCodeSchema,
} from "../money";

import {
  codeSchema,
  isoDateTimeSchema,
  longTextSchema,
  nonNegativeIntegerSchema,
  shortTextSchema,
  wonFlowIdSchema,
} from "../primitives";

import {
  isValidIsoDateTimeRange,
  opaqueReferenceSchema,
  recordStatusSchema,
  safeUrlSchema,
  timezoneSchema,
} from "./shared";

/**
 * A permissive BCP 47 shape.
 *
 * Exact language support remains tenant and deployment configuration.
 */
export const tenantLanguageCodeSchema = z
  .string()
  .trim()
  .min(
    2,
    "A language code is required.",
  )
  .max(
    64,
    "The language code is too long.",
  )
  .regex(
    /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
    "Use a valid language tag.",
  );

/**
 * ISO 3166-1 alpha-2 country-code shape.
 */
export const tenantCountryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{2}$/,
    "Use a two-letter country code.",
  );

/**
 * Tenant-entered colour value.
 *
 * The application may later support hex, RGB, design tokens or another
 * owner-facing format, so the contract does not force one colour system.
 */
export const tenantColourValueSchema = z
  .string()
  .trim()
  .min(
    1,
    "A colour value is required.",
  )
  .max(
    128,
    "The colour value is too long.",
  );

export const tenantColourPaletteSchema = z
  .object({
    primary:
      tenantColourValueSchema,

    secondary:
      tenantColourValueSchema.optional(),

    accent:
      tenantColourValueSchema.optional(),

    background:
      tenantColourValueSchema.optional(),

    foreground:
      tenantColourValueSchema.optional(),
  })
  .strict() satisfies z.ZodType<TenantColourPalette>;

export const tenantPublicContactDetailsSchema = z
  .object({
    email:
      emailAddressSchema.optional(),

    phoneNumber:
      phoneNumberSchema.optional(),

    whatsappNumber:
      phoneNumberSchema.optional(),

    addressLines: z.array(
      shortTextSchema,
    ),

    city:
      shortTextSchema.optional(),

    region:
      shortTextSchema.optional(),

    postalCode: z
      .string()
      .trim()
      .max(
        32,
        "The postal code is too long.",
      )
      .optional(),

    countryCode:
      tenantCountryCodeSchema.optional(),

    mapUrl:
      safeUrlSchema.optional(),
  })
  .strict() satisfies z.ZodType<TenantPublicContactDetails>;

export const tenantProfileSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId:
      wonFlowIdSchema,

    displayName:
      shortTextSchema,

    specialtyDescription:
      longTextSchema.optional(),

    logoReference:
      opaqueReferenceSchema.optional(),

    colours:
      tenantColourPaletteSchema,

    publicContact:
      tenantPublicContactDetailsSchema,

    publicSiteUrl:
      safeUrlSchema.optional(),

    timeZone:
      timezoneSchema,

    defaultCurrencyCode:
      currencyCodeSchema,

    supportedLanguageCodes: z
      .array(
        tenantLanguageCodeSchema,
      )
      .min(
        1,
        "Select at least one supported language.",
      ),

    defaultLanguageCode:
      tenantLanguageCodeSchema,

    status:
      recordStatusSchema,

    createdAt:
      isoDateTimeSchema,

    updatedAt:
      isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const uniqueLanguageCodes =
      new Set(
        value.supportedLanguageCodes,
      );

    if (
      uniqueLanguageCodes.size !==
      value.supportedLanguageCodes
        .length
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supportedLanguageCodes",
        ],
        message:
          "Supported languages must be unique.",
      });
    }

    if (
      !uniqueLanguageCodes.has(
        value.defaultLanguageCode,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "defaultLanguageCode",
        ],
        message:
          "The default language must also be a supported language.",
      });
    }
  }) satisfies z.ZodType<TenantProfile>;

export const tenantPolicySettingsSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId:
      wonFlowIdSchema,

    defaultBookingPolicyId:
      wonFlowIdSchema.optional(),

    cancellationPolicyContentBlockId:
      wonFlowIdSchema.optional(),

    refundPolicyContentBlockId:
      wonFlowIdSchema.optional(),

    messageResponseCommitmentMinutes:
      nonNegativeIntegerSchema.optional(),

    documentRetentionDays:
      nonNegativeIntegerSchema.optional(),

    updatedByUserId:
      wonFlowIdSchema,

    createdAt:
      isoDateTimeSchema,

    updatedAt:
      isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<TenantPolicySettings>;

export const tenantContentBlockStatusSchema = z.enum([
  "draft",
  "scheduled",
  "active",
  "retired",
]);

export const tenantContentBlockSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId:
      wonFlowIdSchema,

    purpose:
      codeSchema,

    languageCode:
      tenantLanguageCodeSchema,

    version:
      shortTextSchema,

    title:
      shortTextSchema.optional(),

    body:
      longTextSchema,

    status:
      tenantContentBlockStatusSchema,

    effectiveFrom:
      isoDateTimeSchema.optional(),

    effectiveTo:
      isoDateTimeSchema.optional(),

    supersedesContentBlockId:
      wonFlowIdSchema.optional(),

    createdByUserId:
      wonFlowIdSchema,

    createdAt:
      isoDateTimeSchema,

    updatedAt:
      isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveFrom !==
        undefined &&
      value.effectiveTo !==
        undefined &&
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
          "The content end time cannot be before its start time.",
      });
    }

    if (
      value.supersedesContentBlockId ===
      value.id
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supersedesContentBlockId",
        ],
        message:
          "A content block cannot supersede itself.",
      });
    }
  }) satisfies z.ZodType<TenantContentBlock>;

export const tenantNotificationChannelSchema = z.enum([
  "email",
  "sms",
  "whatsapp",
  "push",
]);

export const tenantNotificationTemplateStatusSchema =
  z.enum([
    "draft",
    "scheduled",
    "active",
    "retired",
  ]);

export const tenantNotificationTemplateVariableNameSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "A template variable name is required.",
    )
    .max(
      128,
      "The template variable name is too long.",
    )
    .regex(
      /^[A-Za-z][A-Za-z0-9_.-]*$/,
      "Use letters, numbers, dots, underscores or hyphens.",
    );

export const tenantNotificationTemplateVariableSchema =
  z
    .object({
      name:
        tenantNotificationTemplateVariableNameSchema,

      description:
        longTextSchema.optional(),

      required: z.boolean(),
    })
    .strict() satisfies z.ZodType<TenantNotificationTemplateVariable>;

const TEMPLATE_VARIABLE_PATTERN =
  /\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/g;

/**
 * Extracts named variables such as {{patient.name}}.
 */
function extractTenantTemplateVariables(
  template: string,
): string[] {
  return Array.from(
    template.matchAll(
      TEMPLATE_VARIABLE_PATTERN,
    ),
  )
    .map(
      (match) => match[1],
    )
    .filter(
      (
        value,
      ): value is string =>
        value !== undefined,
    );
}

export const tenantNotificationTemplateSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId:
      wonFlowIdSchema,

    eventCode:
      codeSchema,

    channel:
      tenantNotificationChannelSchema,

    languageCode:
      tenantLanguageCodeSchema,

    version:
      shortTextSchema,

    subjectTemplate:
      longTextSchema.optional(),

    bodyTemplate:
      longTextSchema,

    variables: z.array(
      tenantNotificationTemplateVariableSchema,
    ),

    status:
      tenantNotificationTemplateStatusSchema,

    effectiveFrom:
      isoDateTimeSchema.optional(),

    effectiveTo:
      isoDateTimeSchema.optional(),

    supersedesTemplateId:
      wonFlowIdSchema.optional(),

    createdByUserId:
      wonFlowIdSchema,

    createdAt:
      isoDateTimeSchema,

    updatedAt:
      isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveFrom !==
        undefined &&
      value.effectiveTo !==
        undefined &&
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
          "The template end time cannot be before its start time.",
      });
    }

    if (
      value.supersedesTemplateId ===
      value.id
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supersedesTemplateId",
        ],
        message:
          "A notification template cannot supersede itself.",
      });
    }

    const declaredNames =
      value.variables.map(
        (variable) =>
          variable.name,
      );

    if (
      new Set(declaredNames).size !==
      declaredNames.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["variables"],
        message:
          "Notification template variable names must be unique.",
      });
    }

    const completeTemplate = [
      value.subjectTemplate ?? "",
      value.bodyTemplate,
    ].join("\n");

    const referencedNames =
      new Set(
        extractTenantTemplateVariables(
          completeTemplate,
        ),
      );

    const declaredNameSet =
      new Set(declaredNames);

    for (const referencedName of
      referencedNames) {
      if (
        !declaredNameSet.has(
          referencedName,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["bodyTemplate"],
          message:
            `Template variable "${referencedName}" is not declared.`,
        });
      }
    }

    for (const [
      index,
      variable,
    ] of value.variables.entries()) {
      if (
        variable.required &&
        !referencedNames.has(
          variable.name,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "variables",
            index,
            "name",
          ],
          message:
            "A required variable must be referenced by the template.",
        });
      }
    }
  }) satisfies z.ZodType<TenantNotificationTemplate>;

export const tenantTerminologyStatusSchema = z.enum([
  "draft",
  "active",
  "retired",
]);

export const tenantTerminologyKeySchema = z
  .string()
  .trim()
  .min(
    1,
    "A terminology key is required.",
  )
  .max(
    200,
    "The terminology key is too long.",
  )
  .regex(
    /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/,
    "Use letters, numbers, dots, underscores or hyphens.",
  );

export const tenantTerminologySchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId:
      wonFlowIdSchema,

    termKey:
      tenantTerminologyKeySchema,

    languageCode:
      tenantLanguageCodeSchema,

    singularLabel:
      shortTextSchema,

    pluralLabel:
      shortTextSchema.optional(),

    shortLabel:
      shortTextSchema.optional(),

    status:
      tenantTerminologyStatusSchema,

    effectiveFrom:
      isoDateTimeSchema.optional(),

    effectiveTo:
      isoDateTimeSchema.optional(),

    createdByUserId:
      wonFlowIdSchema,

    createdAt:
      isoDateTimeSchema,

    updatedAt:
      isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveFrom !==
        undefined &&
      value.effectiveTo !==
        undefined &&
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
          "The terminology end time cannot be before its start time.",
      });
    }
  }) satisfies z.ZodType<TenantTerminology>;

export const tenantSettingsAggregateSchema = z
  .object({
    profile:
      tenantProfileSchema.optional(),

    policySettings:
      tenantPolicySettingsSchema.optional(),

    contentBlocks: z.array(
      tenantContentBlockSchema,
    ),

    notificationTemplates: z.array(
      tenantNotificationTemplateSchema,
    ),

    terminology: z.array(
      tenantTerminologySchema,
    ),
  })
  .strict()
  .superRefine((value, context) => {
    const scopedRecords: {
      organizationId: string;
      path: (string | number)[];
    }[] = [];

    if (value.profile !== undefined) {
      scopedRecords.push({
        organizationId:
          value.profile.organizationId,

        path: ["profile"],
      });
    }

    if (
      value.policySettings !==
      undefined
    ) {
      scopedRecords.push({
        organizationId:
          value.policySettings
            .organizationId,

        path: ["policySettings"],
      });
    }

    for (const [
      index,
      contentBlock,
    ] of value.contentBlocks.entries()) {
      scopedRecords.push({
        organizationId:
          contentBlock.organizationId,

        path: [
          "contentBlocks",
          index,
        ],
      });
    }

    for (const [
      index,
      template,
    ] of value.notificationTemplates.entries()) {
      scopedRecords.push({
        organizationId:
          template.organizationId,

        path: [
          "notificationTemplates",
          index,
        ],
      });
    }

    for (const [
      index,
      terminology,
    ] of value.terminology.entries()) {
      scopedRecords.push({
        organizationId:
          terminology.organizationId,

        path: [
          "terminology",
          index,
        ],
      });
    }

    const organizationId =
      scopedRecords[0]
        ?.organizationId;

    if (organizationId !== undefined) {
      for (const record of
        scopedRecords) {
        if (
          record.organizationId !==
          organizationId
        ) {
          context.addIssue({
            code: "custom",
            path: record.path,
            message:
              "Every tenant setting must belong to the same organization.",
          });
        }
      }
    }

    const cancellationContentId =
      value.policySettings
        ?.cancellationPolicyContentBlockId;

    if (
      cancellationContentId !==
        undefined &&
      !value.contentBlocks.some(
        (contentBlock) =>
          contentBlock.id ===
          cancellationContentId,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "policySettings",
          "cancellationPolicyContentBlockId",
        ],
        message:
          "The cancellation policy must reference a content block in this aggregate.",
      });
    }

    const refundContentId =
      value.policySettings
        ?.refundPolicyContentBlockId;

    if (
      refundContentId !== undefined &&
      !value.contentBlocks.some(
        (contentBlock) =>
          contentBlock.id ===
          refundContentId,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "policySettings",
          "refundPolicyContentBlockId",
        ],
        message:
          "The refund policy must reference a content block in this aggregate.",
      });
    }
  }) satisfies z.ZodType<TenantSettingsAggregate>;

/**
 * Owner-facing profile input.
 *
 * Organization ownership, identifiers, status and audit timestamps are
 * supplied by the service layer.
 */
export const tenantProfileFormSchema = z
  .object({
    displayName:
      shortTextSchema,

    specialtyDescription:
      longTextSchema.optional(),

    logoReference:
      opaqueReferenceSchema.optional(),

    colours:
      tenantColourPaletteSchema,

    publicContact:
      tenantPublicContactDetailsSchema,

    publicSiteUrl:
      safeUrlSchema.optional(),

    timeZone:
      timezoneSchema,

    defaultCurrencyCode:
      currencyCodeSchema,

    supportedLanguageCodes: z
      .array(
        tenantLanguageCodeSchema,
      )
      .min(
        1,
        "Select at least one supported language.",
      ),

    defaultLanguageCode:
      tenantLanguageCodeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const supportedLanguages =
      new Set(
        value.supportedLanguageCodes,
      );

    if (
      supportedLanguages.size !==
      value.supportedLanguageCodes
        .length
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supportedLanguageCodes",
        ],
        message:
          "Supported languages must be unique.",
      });
    }

    if (
      !supportedLanguages.has(
        value.defaultLanguageCode,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "defaultLanguageCode",
        ],
        message:
          "The default language must also be supported.",
      });
    }
  });

export const tenantContentBlockFormSchema = z
  .object({
    purpose:
      codeSchema,

    languageCode:
      tenantLanguageCodeSchema,

    version:
      shortTextSchema,

    title:
      shortTextSchema.optional(),

    body:
      longTextSchema,

    status:
      tenantContentBlockStatusSchema,

    effectiveFrom:
      isoDateTimeSchema.optional(),

    effectiveTo:
      isoDateTimeSchema.optional(),

    supersedesContentBlockId:
      wonFlowIdSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveFrom !==
        undefined &&
      value.effectiveTo !==
        undefined &&
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
          "The content end time cannot be before its start time.",
      });
    }
  });

/**
 * Creates a new immutable content version.
 *
 * Version number, superseded record, organization ownership and creator
 * attribution are supplied by the service operation.
 */
export const tenantContentVersionFormSchema = z
  .object({
    purpose: codeSchema,
    languageCode: tenantLanguageCodeSchema,
    title: shortTextSchema.optional(),
    body: longTextSchema,
    status: tenantContentBlockStatusSchema,
    effectiveFrom: isoDateTimeSchema.optional(),
    effectiveTo: isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "retired") {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Create a draft, scheduled or active version. Existing versions are retired.",
      });
    }

    if (
      (value.status === "active" || value.status === "scheduled") &&
      value.effectiveFrom === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveFrom"],
        message:
          "Active and scheduled content requires an effective start time.",
      });
    }

    if (
      value.effectiveTo !== undefined &&
      value.effectiveFrom === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveFrom"],
        message:
          "Provide an effective start time when an end time is set.",
      });
    }

    if (
      value.effectiveFrom !== undefined &&
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
          "The content end time must be after its start time.",
      });
    }
  });

export type TenantContentVersionFormInput =
  z.input<typeof tenantContentVersionFormSchema>;

export const tenantNotificationTemplateFormSchema = z
  .object({
    eventCode:
      codeSchema,

    channel:
      tenantNotificationChannelSchema,

    languageCode:
      tenantLanguageCodeSchema,

    version:
      shortTextSchema,

    subjectTemplate:
      longTextSchema.optional(),

    bodyTemplate:
      longTextSchema,

    variables: z.array(
      tenantNotificationTemplateVariableSchema,
    ),

    status:
      tenantNotificationTemplateStatusSchema,

    effectiveFrom:
      isoDateTimeSchema.optional(),

    effectiveTo:
      isoDateTimeSchema.optional(),

    supersedesTemplateId:
      wonFlowIdSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveFrom !==
        undefined &&
      value.effectiveTo !==
        undefined &&
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
          "The template end time cannot be before its start time.",
      });
    }

    const declaredNames =
      value.variables.map(
        (variable) =>
          variable.name,
      );

    if (
      new Set(declaredNames).size !==
      declaredNames.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["variables"],
        message:
          "Template variable names must be unique.",
      });
    }

    const referencedNames =
      new Set(
        extractTenantTemplateVariables(
          [
            value.subjectTemplate ??
              "",
            value.bodyTemplate,
          ].join("\n"),
        ),
      );

    const declaredNameSet =
      new Set(declaredNames);

    for (const referencedName of
      referencedNames) {
      if (
        !declaredNameSet.has(
          referencedName,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["bodyTemplate"],
          message:
            `Template variable "${referencedName}" is not declared.`,
        });
      }
    }
  });

/**
 * Creates a new immutable notification-template version.
 *
 * The service generates version and supersession metadata.
 */
export const tenantNotificationTemplateVersionFormSchema = z
  .object({
    eventCode: codeSchema,
    channel: tenantNotificationChannelSchema,
    languageCode: tenantLanguageCodeSchema,
    subjectTemplate: longTextSchema.optional(),
    bodyTemplate: longTextSchema,
    variables: z.array(
      tenantNotificationTemplateVariableSchema,
    ),
    status: tenantNotificationTemplateStatusSchema,
    effectiveFrom: isoDateTimeSchema.optional(),
    effectiveTo: isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "retired") {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Create a draft, scheduled or active template version.",
      });
    }

    if (
      (value.status === "active" || value.status === "scheduled") &&
      value.effectiveFrom === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveFrom"],
        message:
          "Active and scheduled templates require an effective start time.",
      });
    }

    if (
      value.effectiveTo !== undefined &&
      value.effectiveFrom === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveFrom"],
        message:
          "Provide an effective start time when an end time is set.",
      });
    }

    if (
      value.effectiveFrom !== undefined &&
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
          "The template end time must be after its start time.",
      });
    }

    const declaredNames = value.variables.map(
      (variable) => variable.name,
    );
    if (new Set(declaredNames).size !== declaredNames.length) {
      context.addIssue({
        code: "custom",
        path: ["variables"],
        message:
          "Template variable names must be unique.",
      });
    }

    const referencedNames = new Set(
      extractTenantTemplateVariables(
        [value.subjectTemplate ?? "", value.bodyTemplate].join("\n"),
      ),
    );
    const declaredNameSet = new Set(declaredNames);

    for (const referencedName of referencedNames) {
      if (!declaredNameSet.has(referencedName)) {
        context.addIssue({
          code: "custom",
          path: ["bodyTemplate"],
          message:
            `Template variable "${referencedName}" is not declared.`,
        });
      }
    }

    for (const variable of value.variables) {
      if (variable.required && !referencedNames.has(variable.name)) {
        context.addIssue({
          code: "custom",
          path: ["variables"],
          message:
            `Required variable "${variable.name}" must appear in the template.`,
        });
      }
    }
  });

export type TenantNotificationTemplateVersionFormInput =
  z.input<typeof tenantNotificationTemplateVersionFormSchema>;

export const tenantTerminologyFormSchema = z
  .object({
    termKey:
      tenantTerminologyKeySchema,

    languageCode:
      tenantLanguageCodeSchema,

    singularLabel:
      shortTextSchema,

    pluralLabel:
      shortTextSchema.optional(),

    shortLabel:
      shortTextSchema.optional(),

    status:
      tenantTerminologyStatusSchema,

    effectiveFrom:
      isoDateTimeSchema.optional(),

    effectiveTo:
      isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveFrom !==
        undefined &&
      value.effectiveTo !==
        undefined &&
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
          "The terminology end time cannot be before its start time.",
      });
    }
  });

export type TenantProfileFormInput =
  z.input<
    typeof tenantProfileFormSchema
  >;

export type TenantContentBlockFormInput =
  z.input<
    typeof tenantContentBlockFormSchema
  >;

export type TenantNotificationTemplateFormInput =
  z.input<
    typeof tenantNotificationTemplateFormSchema
  >;

export type TenantTerminologyFormInput =
  z.input<
    typeof tenantTerminologyFormSchema
  >;

/**
 * Owner-facing tenant-policy settings.
 *
 * Audit ownership and timestamps are supplied by the service layer.
 * Every setting may remain absent while setup is incomplete.
 */
export const tenantPolicySettingsFormSchema = z
  .object({
    defaultBookingPolicyId:
      wonFlowIdSchema.optional(),

    cancellationPolicyContentBlockId:
      wonFlowIdSchema.optional(),

    refundPolicyContentBlockId:
      wonFlowIdSchema.optional(),

    messageResponseCommitmentMinutes:
      nonNegativeIntegerSchema.optional(),

    documentRetentionDays:
      nonNegativeIntegerSchema.optional(),
  })
  .strict();

export type TenantPolicySettingsFormInput =
  z.input<
    typeof tenantPolicySettingsFormSchema
  >;
