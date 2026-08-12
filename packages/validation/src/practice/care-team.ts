/**
 * Runtime validation for care teams, members, privilege overrides and
 * patient assignments.
 */

import * as z from "zod";

import type {
  PracticeCareTeam,
  PracticeCareTeamAggregate,
  PracticePatientAssignment,
  PracticePrivilegeOverride,
  PracticeTeamInvitation,
  PracticeTeamMember,
} from "@wonflow/contracts";

import {
  emailAddressSchema,
} from "../contact";

import {
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
  timezoneSchema,
} from "./shared";

export const practiceRoleCodeSchema = z.enum([
  "owner",
  "consultant",
  "senior-registrar",
  "resident",
  "house-surgeon",
  "clinical-dietitian",
  "coordinator",
]);

export const practiceSupervisionLevelSchema = z.enum([
  "independent",
  "countersigned",
  "non-clinical",
]);

export const practicePatientAccessScopeSchema = z.enum([
  "all-patients",
  "assigned-patients",
  "administrative-only",
  "no-patient-access",
]);

export const practiceTeamMemberStatusSchema = z.enum([
  "invited",
  "active",
  "suspended",
  "inactive",
  "archived",
]);

export const practiceTeamInvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const practicePatientAssignmentReasonSchema = z.enum([
  "primary-clinician",
  "consultation",
  "follow-up",
  "document-review",
  "message-triage",
  "care-coordination",
  "dietary-care",
  "manual",
]);

export const practicePrivilegeSchema = z.enum([
  "dashboard.view",
  "locations.view",
  "locations.manage",
  "catalogue.view",
  "catalogue.manage",
  "team.view",
  "team.manage",
  "schedule.view",
  "schedule.manage",
  "patients.view",
  "patients.view-all",
  "patients.assign",
  "appointments.view",
  "appointments.book",
  "appointments.reschedule",
  "appointments.cancel",
  "documents.view",
  "documents.upload",
  "documents.review",
  "documents.release",
  "documents.request",
  "consultations.view",
  "consultations.create",
  "consultations.edit",
  "consultations.sign",
  "consultations.countersign",
  "consultations.release",
  "messages.view",
  "messages.reply",
  "messages.assign",
  "messages.manage-triage",
  "payments.view",
  "payments.collect-offline",
  "payments.refund",
  "audit.view",
]);

export const permissionEffectSchema = z.enum([
  "allow",
  "deny",
]);

export const practiceCareTeamSchema = z
  .object({
    id: wonFlowIdSchema,
    organizationId: wonFlowIdSchema,
    ownerTeamMemberId: wonFlowIdSchema,
    name: shortTextSchema,
    code: z
      .string()
      .trim()
      .min(1, "A team code is required.")
      .max(64, "The team code is too long."),
    description: longTextSchema.optional(),
    timezone: timezoneSchema,
    defaultPracticeLocationId:
      wonFlowIdSchema.optional(),
    status: recordStatusSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict() satisfies z.ZodType<PracticeCareTeam>;

export const practicePrivilegeOverrideSchema = z
  .object({
    id: wonFlowIdSchema,
    teamMemberId: wonFlowIdSchema,
    privilege: practicePrivilegeSchema,
    effect: permissionEffectSchema,
    reason: reasonSchema.optional(),
    setByTeamMemberId: wonFlowIdSchema,
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.optional(),
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
          "The privilege override cannot end before it begins.",
      });
    }
  }) satisfies z.ZodType<PracticePrivilegeOverride>;

export const practiceTeamMemberSchema = z
  .object({
    id: wonFlowIdSchema,
    careTeamId: wonFlowIdSchema,
    userId: wonFlowIdSchema,
    practitionerId: wonFlowIdSchema.optional(),
    displayName: shortTextSchema,
    roleCode: practiceRoleCodeSchema,
    supervisionLevel:
      practiceSupervisionLevelSchema,
    patientAccessScope:
      practicePatientAccessScopeSchema,
    supervisorTeamMemberId:
      wonFlowIdSchema.optional(),
    allPracticeLocations: z.boolean(),
    practiceLocationIds: z.array(wonFlowIdSchema),
    independentlyBookable: z.boolean(),
    privilegeOverrides: z.array(
      practicePrivilegeOverrideSchema,
    ),
    status: practiceTeamMemberStatusSchema,
    joinedAt: isoDateTimeSchema.optional(),
    leftAt: isoDateTimeSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.supervisionLevel === "countersigned"
    ) {
      if (
        value.supervisorTeamMemberId === undefined
      ) {
        context.addIssue({
          code: "custom",
          path: ["supervisorTeamMemberId"],
          message:
            "A countersigned member must have a supervisor.",
        });
      }

      if (
        value.supervisorTeamMemberId === value.id
      ) {
        context.addIssue({
          code: "custom",
          path: ["supervisorTeamMemberId"],
          message:
            "A countersigned member cannot supervise or sign for themselves.",
        });
      }
    } else if (
      value.supervisorTeamMemberId !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["supervisorTeamMemberId"],
        message:
          "Only countersigned members may have a supervisor assignment.",
      });
    }

    if (
      value.leftAt !== undefined &&
      value.joinedAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.joinedAt,
        value.leftAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["leftAt"],
        message:
          "A member cannot leave before joining.",
      });
    }

    for (const [index, override] of
      value.privilegeOverrides.entries()) {
      if (override.teamMemberId !== value.id) {
        context.addIssue({
          code: "custom",
          path: ["privilegeOverrides", index],
          message:
            "The privilege override must belong to this team member.",
        });
      }
    }
  }) satisfies z.ZodType<PracticeTeamMember>;

export const practiceTeamInvitationSchema = z
  .object({
    id: wonFlowIdSchema,

    organizationId:
      wonFlowIdSchema,

    careTeamId:
      wonFlowIdSchema,

    email:
      emailAddressSchema,

    displayName:
      shortTextSchema,

    roleCode:
      practiceRoleCodeSchema,

    supervisionLevel:
      practiceSupervisionLevelSchema,

    patientAccessScope:
      practicePatientAccessScopeSchema,

    supervisorTeamMemberId:
      wonFlowIdSchema.optional(),

    allPracticeLocations:
      z.boolean(),

    practiceLocationIds:
      z.array(wonFlowIdSchema),

    independentlyBookable:
      z.boolean(),

    invitedByTeamMemberId:
      wonFlowIdSchema,

    redemptionTokenReference:
      opaqueReferenceSchema,

    expiresAt:
      isoDateTimeSchema,

    status:
      practiceTeamInvitationStatusSchema,

    acceptedByUserId:
      wonFlowIdSchema.optional(),

    acceptedAt:
      isoDateTimeSchema.optional(),

    revokedByTeamMemberId:
      wonFlowIdSchema.optional(),

    revokedAt:
      isoDateTimeSchema.optional(),

    revocationReason:
      reasonSchema.optional(),

    createdAt:
      isoDateTimeSchema,

    updatedAt:
      isoDateTimeSchema,
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
      value.supervisionLevel ===
        "countersigned" &&
      value.supervisorTeamMemberId ===
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supervisorTeamMemberId",
        ],
        message:
          "A countersigned invitee requires a supervisor.",
      });
    }

    if (
      value.supervisionLevel !==
        "countersigned" &&
      value.supervisorTeamMemberId !==
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supervisorTeamMemberId",
        ],
        message:
          "Only a countersigned invitee may have a supervisor.",
      });
    }

    if (
      new Set(
        value.practiceLocationIds,
      ).size !==
      value.practiceLocationIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "practiceLocationIds",
        ],
        message:
          "Practice-location references must be unique.",
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
          "Do not select individual locations when all locations are enabled.",
      });
    }

    if (
      value.status === "pending" &&
      (
        value.acceptedByUserId !==
          undefined ||
        value.acceptedAt !==
          undefined ||
        value.revokedByTeamMemberId !==
          undefined ||
        value.revokedAt !==
          undefined ||
        value.revocationReason !==
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "A pending invitation cannot contain acceptance or revocation metadata.",
      });
    }

    if (
      value.status ===
        "accepted" &&
      (
        value.acceptedByUserId ===
          undefined ||
        value.acceptedAt ===
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["acceptedAt"],
        message:
          "An accepted invitation requires the accepting user and time.",
      });
    }

    if (
      value.status ===
        "accepted" &&
      (
        value.revokedAt !==
          undefined ||
        value.revokedByTeamMemberId !==
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "An accepted invitation cannot also be revoked.",
      });
    }

    if (
      value.acceptedAt !==
        undefined &&
      (
        !isValidIsoDateTimeRange(
          value.createdAt,
          value.acceptedAt,
          true,
        ) ||
        value.acceptedAt >
          value.expiresAt
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["acceptedAt"],
        message:
          "The invitation must be accepted after creation and before expiry.",
      });
    }

    if (
      value.status ===
        "revoked" &&
      (
        value.revokedByTeamMemberId ===
          undefined ||
        value.revokedAt ===
          undefined ||
        value.revocationReason ===
          undefined
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "revocationReason",
        ],
        message:
          "A revoked invitation requires an actor, time and reason.",
      });
    }

    if (
      value.revokedAt !==
        undefined &&
      !isValidIsoDateTimeRange(
        value.createdAt,
        value.revokedAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["revokedAt"],
        message:
          "An invitation cannot be revoked before it is created.",
      });
    }
  }) satisfies z.ZodType<PracticeTeamInvitation>;

export const practicePatientAssignmentSchema = z
  .object({
    id: wonFlowIdSchema,
    careTeamId: wonFlowIdSchema,
    patientId: wonFlowIdSchema,
    teamMemberId: wonFlowIdSchema,
    reason: practicePatientAssignmentReasonSchema,
    assignmentReason: reasonSchema.optional(),
    effectiveFrom: isoDateTimeSchema,
    effectiveTo: isoDateTimeSchema.optional(),
    assignedByTeamMemberId: wonFlowIdSchema,
    endedByTeamMemberId: wonFlowIdSchema.optional(),
    endedAt: isoDateTimeSchema.optional(),
    endReason: reasonSchema.optional(),
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
          "The assignment cannot expire before it begins.",
      });
    }

    const endingFields = [
      value.endedByTeamMemberId,
      value.endedAt,
      value.endReason,
    ];

    const suppliedEndingFields = endingFields.filter(
      (field) => field !== undefined,
    ).length;

    if (
      suppliedEndingFields > 0 &&
      suppliedEndingFields < 3
    ) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message:
          "Ending an assignment requires an actor, time and reason.",
      });
    }

    if (
      value.endedAt !== undefined &&
      !isValidIsoDateTimeRange(
        value.effectiveFrom,
        value.endedAt,
        true,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message:
          "The assignment cannot end before it begins.",
      });
    }
  }) satisfies z.ZodType<PracticePatientAssignment>;

export const practiceCareTeamAggregateSchema = z
  .object({
    careTeam: practiceCareTeamSchema,
    members: z.array(
      practiceTeamMemberSchema,
    ),
    invitations: z.array(
      practiceTeamInvitationSchema,
    ),
    patientAssignments: z.array(
      practicePatientAssignmentSchema,
    ),
  })
  .strict()
  .superRefine((value, context) => {
    const owner = value.members.find(
      (member) =>
        member.id === value.careTeam.ownerTeamMemberId,
    );

    if (
      owner === undefined ||
      owner.careTeamId !== value.careTeam.id
    ) {
      context.addIssue({
        code: "custom",
        path: ["careTeam", "ownerTeamMemberId"],
        message:
          "The care-team owner must be a member of this care team.",
      });
    }

    for (const [index, member] of
      value.members.entries()) {
      if (member.careTeamId !== value.careTeam.id) {
        context.addIssue({
          code: "custom",
          path: ["members", index, "careTeamId"],
          message:
            "Every member must belong to this care team.",
        });
      }
    }

    for (const [
      index,
      invitation,
    ] of value.invitations.entries()) {
      if (
        invitation.organizationId !==
        value.careTeam.organizationId
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "invitations",
            index,
            "organizationId",
          ],
          message:
            "Every invitation must belong to the care team's organization.",
        });
      }

      if (
        invitation.careTeamId !==
        value.careTeam.id
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "invitations",
            index,
            "careTeamId",
          ],
          message:
            "Every invitation must belong to this care team.",
        });
      }

      if (
        !value.members.some(
          (member) =>
            member.id ===
            invitation
              .invitedByTeamMemberId,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "invitations",
            index,
            "invitedByTeamMemberId",
          ],
          message:
            "The invitation actor must be a member of this care team.",
        });
      }

      if (
        invitation
          .supervisorTeamMemberId !==
          undefined &&
        !value.members.some(
          (member) =>
            member.id ===
            invitation
              .supervisorTeamMemberId,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "invitations",
            index,
            "supervisorTeamMemberId",
          ],
          message:
            "The selected supervisor must belong to this care team.",
        });
      }
    }

    for (const [index, assignment] of
      value.patientAssignments.entries()) {
      if (assignment.careTeamId !== value.careTeam.id) {
        context.addIssue({
          code: "custom",
          path: [
            "patientAssignments",
            index,
            "careTeamId",
          ],
          message:
            "Every patient assignment must belong to this care team.",
        });
      }
    }
  }) satisfies z.ZodType<PracticeCareTeamAggregate>;

/**
 * Staff-facing team-member editor. Record ownership and audit fields are
 * supplied by the service layer.
 */
export const practiceTeamMemberFormSchema = z
  .object({
    userId: wonFlowIdSchema,
    practitionerId: wonFlowIdSchema.optional(),
    displayName: shortTextSchema,
    roleCode: practiceRoleCodeSchema,
    supervisionLevel:
      practiceSupervisionLevelSchema,
    patientAccessScope:
      practicePatientAccessScopeSchema,
    supervisorTeamMemberId:
      wonFlowIdSchema.optional(),
    allPracticeLocations: z.boolean(),
    practiceLocationIds: z.array(wonFlowIdSchema),
    independentlyBookable: z.boolean(),
    status: practiceTeamMemberStatusSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.supervisionLevel === "countersigned" &&
      value.supervisorTeamMemberId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["supervisorTeamMemberId"],
        message:
          "Select a supervisor for a countersigned member.",
      });
    }

    if (
      value.supervisionLevel !== "countersigned" &&
      value.supervisorTeamMemberId !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["supervisorTeamMemberId"],
        message:
          "Remove the supervisor for an independently signed or non-clinical member.",
      });
    }

    if (
      new Set(value.practiceLocationIds).size !==
      value.practiceLocationIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["practiceLocationIds"],
        message:
          "Practice-location assignments must be unique.",
      });
    }

    if (
      value.allPracticeLocations &&
      value.practiceLocationIds.length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["practiceLocationIds"],
        message:
          "Do not select individual locations when all locations are enabled.",
      });
    }

    if (value.status === "invited") {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Use the invitation workflow before a person becomes a team member.",
      });
    }

    if (value.status === "archived") {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Archived members are read-only and cannot be edited through this form.",
      });
    }
  });

export type PracticeTeamMemberFormInput =
  z.input<typeof practiceTeamMemberFormSchema>;

/**
 * Owner-facing permission override.
 *
 * IDs, team-member ownership, actor attribution and effective-from
 * timestamps are generated by the service.
 */
export const practicePrivilegeOverrideFormSchema = z
  .object({
    privilege: practicePrivilegeSchema,
    effect: permissionEffectSchema,
    reason: reasonSchema,
    effectiveTo: isoDateTimeSchema.optional(),
  })
  .strict();

export type PracticePrivilegeOverrideFormInput =
  z.input<typeof practicePrivilegeOverrideFormSchema>;

/**
 * Creates the first care team and owner member as one operation.
 *
 * IDs and owner-role defaults are generated by the service.
 */
export const initialPracticeCareTeamFormSchema = z
  .object({
    careTeam: z
      .object({
        name:
          shortTextSchema,

        code: z
          .string()
          .trim()
          .min(
            1,
            "A team code is required.",
          )
          .max(
            64,
            "The team code is too long.",
          ),

        description:
          longTextSchema.optional(),

        timezone:
          timezoneSchema,

        defaultPracticeLocationId:
          wonFlowIdSchema.optional(),
      })
      .strict(),

    ownerMember: z
      .object({
        userId:
          wonFlowIdSchema,

        practitionerId:
          wonFlowIdSchema.optional(),

        displayName:
          shortTextSchema,

        allPracticeLocations:
          z.boolean(),

        practiceLocationIds:
          z.array(wonFlowIdSchema),

        independentlyBookable:
          z.boolean(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.ownerMember
        .allPracticeLocations &&
      value.ownerMember
        .practiceLocationIds
        .length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "ownerMember",
          "practiceLocationIds",
        ],
        message:
          "Do not select individual locations when all locations are enabled.",
      });
    }
  });

/**
 * Owner-facing team invitation form.
 *
 * Token references, lifecycle state and audit timestamps are generated
 * by the service.
 */
export const practiceTeamInvitationFormSchema = z
  .object({
    careTeamId:
      wonFlowIdSchema,

    email:
      emailAddressSchema,

    displayName:
      shortTextSchema,

    roleCode:
      practiceRoleCodeSchema,

    supervisionLevel:
      practiceSupervisionLevelSchema,

    patientAccessScope:
      practicePatientAccessScopeSchema,

    supervisorTeamMemberId:
      wonFlowIdSchema.optional(),

    allPracticeLocations:
      z.boolean(),

    practiceLocationIds:
      z.array(wonFlowIdSchema),

    independentlyBookable:
      z.boolean(),

    invitedByTeamMemberId:
      wonFlowIdSchema,

    expiresAt:
      isoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.supervisionLevel ===
        "countersigned" &&
      value.supervisorTeamMemberId ===
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supervisorTeamMemberId",
        ],
        message:
          "Select a supervisor for a countersigned invitee.",
      });
    }

    if (
      value.supervisionLevel !==
        "countersigned" &&
      value.supervisorTeamMemberId !==
        undefined
    ) {
      context.addIssue({
        code: "custom",
        path: [
          "supervisorTeamMemberId",
        ],
        message:
          "Only a countersigned invitee may have a supervisor.",
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
          "Do not select individual locations when all locations are enabled.",
      });
    }
  });

export type InitialPracticeCareTeamFormInput =
  z.input<
    typeof initialPracticeCareTeamFormSchema
  >;

export type PracticeTeamInvitationFormInput =
  z.input<
    typeof practiceTeamInvitationFormSchema
  >;
