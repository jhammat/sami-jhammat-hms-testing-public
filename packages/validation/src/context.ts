import * as z from "zod";

import {
  codeSchema,
  isoDateTimeSchema,
  languageCodeSchema,
  wonFlowIdSchema,
} from "./primitives";

export const tenantContextSchema = z
  .object({
    organizationId: wonFlowIdSchema,
    branchId: wonFlowIdSchema.optional(),
    departmentId: wonFlowIdSchema.optional(),
    operationalUnitId: wonFlowIdSchema.optional(),
    servicePointId: wonFlowIdSchema.optional(),
  })
  .strict();

export const actorContextSchema = z
  .object({
    userId: wonFlowIdSchema,
    practitionerId: wonFlowIdSchema.optional(),
    roleCodes: z
      .array(codeSchema)
      .max(50)
      .default([]),
  })
  .strict();

export const requestContextSchema = z
  .object({
    requestId: wonFlowIdSchema,
    correlationId: wonFlowIdSchema.optional(),

    tenant: tenantContextSchema,
    actor: actorContextSchema,

    locale: languageCodeSchema,

    requestedAt: isoDateTimeSchema,
  })
  .strict();

export const recordOwnershipContextSchema = z
  .object({
    organizationId: wonFlowIdSchema,
    branchId: wonFlowIdSchema.optional(),

    patientId: wonFlowIdSchema.optional(),
    encounterId: wonFlowIdSchema.optional(),
    admissionId: wonFlowIdSchema.optional(),

    createdByUserId: wonFlowIdSchema,
    createdAt: isoDateTimeSchema,

    updatedByUserId: wonFlowIdSchema.optional(),
    updatedAt: isoDateTimeSchema.optional(),
  })
  .strict();

export type TenantContextInput =
  z.input<typeof tenantContextSchema>;

export type TenantContext =
  z.output<typeof tenantContextSchema>;

export type ActorContext =
  z.output<typeof actorContextSchema>;

export type WonFlowRequestContext =
  z.output<typeof requestContextSchema>;