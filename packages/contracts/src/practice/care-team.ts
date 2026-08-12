/**
 * Independent-practice care teams, privileges and patient assignments.
 *
 * These contracts define team membership, supervision, permission
 * defaults and the care relationships that control patient access.
 */

import type {
  PermissionEffect,
} from "../access/authorization";

import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

/**
 * Stable role codes used by practice navigation, permissions and seed data.
 *
 * UI permission checks must use PracticePrivilege helpers rather than
 * comparing these role strings directly.
 */
export type PracticeRoleCode =
  | "owner"
  | "consultant"
  | "senior-registrar"
  | "resident"
  | "house-surgeon"
  | "clinical-dietitian"
  | "coordinator";

/**
 * Determines whether clinical work may be signed independently.
 */
export type PracticeSupervisionLevel =
  | "independent"
  | "countersigned"
  | "non-clinical";

/**
 * Defines the patient population a team member may access.
 */
export type PracticePatientAccessScope =
  | "all-patients"
  | "assigned-patients"
  | "administrative-only"
  | "no-patient-access";

export type PracticeTeamMemberStatus =
  | "invited"
  | "active"
  | "suspended"
  | "inactive"
  | "archived";

/**
 * Lifecycle of an invitation to join an organization care team.
 */
export type PracticeTeamInvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked";

export type PracticePatientAssignmentReason =
  | "primary-clinician"
  | "consultation"
  | "follow-up"
  | "document-review"
  | "message-triage"
  | "care-coordination"
  | "dietary-care"
  | "manual";

/**
 * Practice-level privileges used by the application UI and service layer.
 *
 * These privileges are intentionally more specific than broad role names.
 * Role defaults may be overridden for an individual team member.
 */
export const WONFLOW_PRACTICE_PRIVILEGES = [
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
] as const;

export type PracticePrivilege =
  (typeof WONFLOW_PRACTICE_PRIVILEGES)[number];

/**
 * Default privileges supplied by each standard WonFlow practice role.
 *
 * Individual member overrides are applied after these defaults. A deny
 * override always takes precedence over an allow override.
 */
export const WONFLOW_PRACTICE_ROLE_DEFAULT_PRIVILEGES:
  Readonly<
    Record<
      PracticeRoleCode,
      readonly PracticePrivilege[]
    >
  > = {
  owner: WONFLOW_PRACTICE_PRIVILEGES,

  consultant: [
    "dashboard.view",

    "locations.view",

    "catalogue.view",

    "team.view",

    "schedule.view",

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

    "payments.view",

    "audit.view",
  ],

  "senior-registrar": [
    "dashboard.view",

    "locations.view",

    "catalogue.view",

    "team.view",

    "schedule.view",

    "patients.view",

    "appointments.view",
    "appointments.book",
    "appointments.reschedule",

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
  ],

  resident: [
    "dashboard.view",

    "locations.view",

    "catalogue.view",

    "schedule.view",

    "patients.view",

    "appointments.view",
    "appointments.book",

    "documents.view",
    "documents.upload",
    "documents.review",
    "documents.request",

    "consultations.view",
    "consultations.create",
    "consultations.edit",

    "messages.view",
    "messages.reply",
  ],

  "house-surgeon": [
    "dashboard.view",

    "locations.view",

    "catalogue.view",

    "schedule.view",

    "patients.view",

    "appointments.view",
    "appointments.book",

    "documents.view",
    "documents.upload",
    "documents.review",
    "documents.request",

    "consultations.view",
    "consultations.create",
    "consultations.edit",

    "messages.view",
    "messages.reply",
  ],

  "clinical-dietitian": [
    "dashboard.view",

    "locations.view",

    "catalogue.view",

    "schedule.view",

    "patients.view",

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
    "consultations.release",

    "messages.view",
    "messages.reply",
  ],

  coordinator: [
    "dashboard.view",

    "locations.view",

    "catalogue.view",

    "team.view",

    "schedule.view",

    "patients.view",

    "appointments.view",
    "appointments.book",
    "appointments.reschedule",
    "appointments.cancel",

    "messages.view",
    "messages.assign",
    "messages.manage-triage",

    "payments.view",
    "payments.collect-offline",
  ],
};

/**
 * Default supervision mode for each standard practice role.
 */
export const WONFLOW_PRACTICE_ROLE_DEFAULT_SUPERVISION:
  Readonly<
    Record<
      PracticeRoleCode,
      PracticeSupervisionLevel
    >
  > = {
  owner: "independent",

  consultant: "independent",

  "senior-registrar": "independent",

  resident: "countersigned",

  "house-surgeon": "countersigned",

  "clinical-dietitian": "independent",

  coordinator: "non-clinical",
};

/**
 * Default patient-access boundary for each standard practice role.
 */
export const WONFLOW_PRACTICE_ROLE_DEFAULT_PATIENT_SCOPE:
  Readonly<
    Record<
      PracticeRoleCode,
      PracticePatientAccessScope
    >
  > = {
  owner: "all-patients",

  consultant: "all-patients",

  "senior-registrar": "assigned-patients",

  resident: "assigned-patients",

  "house-surgeon": "assigned-patients",

  "clinical-dietitian": "assigned-patients",

  coordinator: "administrative-only",
};

/**
 * An organization-owned independent-practice care team.
 */
export interface PracticeCareTeam {
  id: WonFlowId;

  /**
   * Tenant organization that owns this care-team record.
   */
  organizationId: WonFlowId;

  /**
   * Team member assigned as the explicit owner of the organization.
   *
   * The referenced member must belong to this care team.
   */
  ownerTeamMemberId: WonFlowId;

  name: string;

  code: string;

  description?: string;

  timezone: string;

  defaultPracticeLocationId?: WonFlowId;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * One user participating in a practice care team.
 */
export interface PracticeTeamMember {
  id: WonFlowId;

  careTeamId: WonFlowId;

  userId: WonFlowId;

  /**
   * Specific clinician profile represented by this member.
   *
   * This is not an ownership field. Non-clinical members such as a
   * coordinator may not have a practitioner profile.
   */
  practitionerId?: WonFlowId;

  displayName: string;

  roleCode: PracticeRoleCode;

  supervisionLevel: PracticeSupervisionLevel;

  patientAccessScope: PracticePatientAccessScope;

  /**
   * Required when supervisionLevel is countersigned.
   */
  supervisorTeamMemberId?: WonFlowId;

  /**
   * When true, the member may work at every current practice location.
   */
  allPracticeLocations: boolean;

  /**
   * Explicit location assignments when allPracticeLocations is false.
   */
  practiceLocationIds: WonFlowId[];

  /**
   * Allows patients or staff to book directly with this member.
   *
   * The member must also hold appointments.book.
   */
  independentlyBookable: boolean;

  privilegeOverrides: PracticePrivilegeOverride[];

  status: PracticeTeamMemberStatus;

  joinedAt?: IsoDateTime;

  leftAt?: IsoDateTime;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Invitation for a person to join an organization-owned care team.
 *
 * An invitation exists before the invited person necessarily has a
 * WonFlow user account. It therefore stores an email address rather
 * than requiring userId.
 *
 * redemptionTokenReference is an opaque reference to a protected,
 * hashed, single-use token. It is never the redeemable token itself.
 */
export interface PracticeTeamInvitation {
  id: WonFlowId;

  organizationId: WonFlowId;

  careTeamId: WonFlowId;

  email: string;

  displayName: string;

  roleCode: PracticeRoleCode;

  supervisionLevel:
    PracticeSupervisionLevel;

  patientAccessScope:
    PracticePatientAccessScope;

  /**
   * Required when the invited member will require countersignature.
   */
  supervisorTeamMemberId?: WonFlowId;

  allPracticeLocations: boolean;

  practiceLocationIds:
    WonFlowId[];

  independentlyBookable: boolean;

  invitedByTeamMemberId:
    WonFlowId;

  /**
   * Opaque reference to the protected invitation token.
   */
  redemptionTokenReference: string;

  expiresAt: IsoDateTime;

  status:
    PracticeTeamInvitationStatus;

  acceptedByUserId?: WonFlowId;

  acceptedAt?: IsoDateTime;

  revokedByTeamMemberId?: WonFlowId;

  revokedAt?: IsoDateTime;

  revocationReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Per-member adjustment to role-default privileges.
 */
export interface PracticePrivilegeOverride {
  id: WonFlowId;

  teamMemberId: WonFlowId;

  privilege: PracticePrivilege;

  effect: PermissionEffect;

  reason?: string;

  setByTeamMemberId: WonFlowId;

  effectiveFrom: IsoDateTime;

  effectiveTo?: IsoDateTime;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Connects a team member to a patient for a defined care purpose.
 *
 * Assigned-patient access must resolve through an active record of this
 * type. Expired and ended assignments do not grant access.
 */
export interface PracticePatientAssignment {
  id: WonFlowId;

  careTeamId: WonFlowId;

  patientId: WonFlowId;

  teamMemberId: WonFlowId;

  reason: PracticePatientAssignmentReason;

  assignmentReason?: string;

  effectiveFrom: IsoDateTime;

  effectiveTo?: IsoDateTime;

  assignedByTeamMemberId: WonFlowId;

  endedByTeamMemberId?: WonFlowId;

  endedAt?: IsoDateTime;

  endReason?: string;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

export interface PracticeCareTeamAggregate {
  careTeam: PracticeCareTeam;

  members: PracticeTeamMember[];

  invitations:
    PracticeTeamInvitation[];

  patientAssignments:
    PracticePatientAssignment[];
}

/**
 * Returns care teams owned by a tenant organization.
 */
export function getPracticeCareTeamsForOrganization(
  careTeams: readonly PracticeCareTeam[],
  organizationId: WonFlowId,
): PracticeCareTeam[] {
  return careTeams.filter(
    (careTeam) =>
      careTeam.organizationId ===
      organizationId,
  );
}

/**
 * Returns all members belonging to a care team.
 */
export function getPracticeTeamMembersForCareTeam(
  members: readonly PracticeTeamMember[],
  careTeamId: WonFlowId,
): PracticeTeamMember[] {
  return members.filter(
    (member) =>
      member.careTeamId === careTeamId,
  );
}

/**
 * Determines whether a team invitation may still be redeemed.
 */
export function isPracticeTeamInvitationRedeemable(
  invitation:
    PracticeTeamInvitation,
  at: IsoDateTime,
): boolean {
  return (
    invitation.status ===
      "pending" &&
    invitation.expiresAt > at
  );
}

/**
 * Returns members currently assigned to a practice location.
 */
export function getPracticeTeamMembersForLocation(
  members: readonly PracticeTeamMember[],
  practiceLocationId: WonFlowId,
): PracticeTeamMember[] {
  return members.filter(
    (member) =>
      isPracticeTeamMemberActive(member) &&
      canPracticeTeamMemberWorkAtLocation(
        member,
        practiceLocationId,
      ),
  );
}

/**
 * Returns a copy of the privileges supplied by a role.
 */
export function getPracticeRoleDefaultPrivileges(
  roleCode: PracticeRoleCode,
): PracticePrivilege[] {
  return [
    ...WONFLOW_PRACTICE_ROLE_DEFAULT_PRIVILEGES[
      roleCode
    ],
  ];
}

/**
 * Determines whether a team member is currently operational.
 */
export function isPracticeTeamMemberActive(
  member: PracticeTeamMember,
): boolean {
  return member.status === "active";
}

/**
 * Determines whether a privilege override is effective at a timestamp.
 */
export function isPracticePrivilegeOverrideActive(
  override: PracticePrivilegeOverride,
  at: IsoDateTime,
): boolean {
  if (override.effectiveFrom > at) {
    return false;
  }

  if (
    override.effectiveTo !== undefined &&
    override.effectiveTo < at
  ) {
    return false;
  }

  return true;
}

/**
 * Resolves role defaults and active member-level overrides.
 *
 * Deny overrides are applied after allow overrides so denial wins when
 * conflicting active overrides exist.
 */
export function resolvePracticeTeamMemberPrivileges(
  member: PracticeTeamMember,
  at: IsoDateTime,
): PracticePrivilege[] {
  const privileges =
    new Set<PracticePrivilege>(
      WONFLOW_PRACTICE_ROLE_DEFAULT_PRIVILEGES[
        member.roleCode
      ],
    );

  const activeOverrides =
    member.privilegeOverrides.filter(
      (override) =>
        isPracticePrivilegeOverrideActive(
          override,
          at,
        ),
    );

  for (const override of activeOverrides) {
    if (override.effect === "allow") {
      privileges.add(override.privilege);
    }
  }

  for (const override of activeOverrides) {
    if (override.effect === "deny") {
      privileges.delete(override.privilege);
    }
  }

  return [...privileges];
}

/**
 * Checks whether an active team member holds a practice privilege.
 */
export function hasPracticePrivilege(
  member: PracticeTeamMember,
  privilege: PracticePrivilege,
  at: IsoDateTime,
): boolean {
  if (!isPracticeTeamMemberActive(member)) {
    return false;
  }

  return resolvePracticeTeamMemberPrivileges(
    member,
    at,
  ).includes(privilege);
}

/**
 * Determines whether a member may work at a practice location.
 */
export function canPracticeTeamMemberWorkAtLocation(
  member: PracticeTeamMember,
  practiceLocationId: WonFlowId,
): boolean {
  if (!isPracticeTeamMemberActive(member)) {
    return false;
  }

  if (member.allPracticeLocations) {
    return true;
  }

  return member.practiceLocationIds.includes(
    practiceLocationId,
  );
}

/**
 * Determines whether a patient assignment grants access at a timestamp.
 */
export function isPracticePatientAssignmentActive(
  assignment: PracticePatientAssignment,
  at: IsoDateTime,
): boolean {
  if (assignment.endedAt !== undefined) {
    return false;
  }

  if (assignment.effectiveFrom > at) {
    return false;
  }

  if (
    assignment.effectiveTo !== undefined &&
    assignment.effectiveTo < at
  ) {
    return false;
  }

  return true;
}

/**
 * Returns active assignments for one team member.
 */
export function getActivePracticePatientAssignments(
  assignments:
    readonly PracticePatientAssignment[],
  teamMemberId: WonFlowId,
  at: IsoDateTime,
): PracticePatientAssignment[] {
  return assignments.filter(
    (assignment) =>
      assignment.teamMemberId ===
        teamMemberId &&
      isPracticePatientAssignmentActive(
        assignment,
        at,
      ),
  );
}

/**
 * Checks access to non-clinical patient demographics used for booking,
 * scheduling and administrative coordination.
 */
export function canPracticeTeamMemberAccessPatientDemographics(
  member: PracticeTeamMember,
  at: IsoDateTime,
): boolean {
  if (
    !hasPracticePrivilege(
      member,
      "patients.view",
      at,
    )
  ) {
    return false;
  }

  return (
    member.patientAccessScope !==
    "no-patient-access"
  );
}

/**
 * Checks whether a team member may access a patient's clinical record.
 *
 * Administrative-only access never grants access to clinical content.
 */
export function canPracticeTeamMemberAccessPatient(
  member: PracticeTeamMember,
  assignments:
    readonly PracticePatientAssignment[],
  patientId: WonFlowId,
  at: IsoDateTime,
): boolean {
  if (
    !hasPracticePrivilege(
      member,
      "patients.view",
      at,
    )
  ) {
    return false;
  }

  if (
    member.patientAccessScope ===
    "all-patients"
  ) {
    return true;
  }

  if (
    member.patientAccessScope !==
    "assigned-patients"
  ) {
    return false;
  }

  return assignments.some(
    (assignment) =>
      assignment.careTeamId ===
        member.careTeamId &&
      assignment.teamMemberId ===
        member.id &&
      assignment.patientId ===
        patientId &&
      isPracticePatientAssignmentActive(
        assignment,
        at,
      ),
  );
}

/**
 * Returns true when the member's clinical work requires supervision.
 */
export function requiresPracticeCountersignature(
  member: PracticeTeamMember,
): boolean {
  return (
    member.supervisionLevel ===
    "countersigned"
  );
}

/**
 * Determines whether a member may sign clinical content independently.
 */
export function canPracticeTeamMemberSignClinicalContent(
  member: PracticeTeamMember,
  at: IsoDateTime,
): boolean {
  return (
    member.supervisionLevel ===
      "independent" &&
    hasPracticePrivilege(
      member,
      "consultations.sign",
      at,
    )
  );
}

/**
 * Determines whether one member may countersign another member's work.
 *
 * A member may never countersign their own clinical content.
 */
export function canPracticeTeamMemberCountersign(
  supervisor: PracticeTeamMember,
  author: PracticeTeamMember,
  at: IsoDateTime,
): boolean {
  if (supervisor.id === author.id) {
    return false;
  }

  if (
    !requiresPracticeCountersignature(
      author,
    )
  ) {
    return false;
  }

  if (
    author.supervisorTeamMemberId !==
    supervisor.id
  ) {
    return false;
  }

  return hasPracticePrivilege(
    supervisor,
    "consultations.countersign",
    at,
  );
}

/**
 * Determines whether a member may release signed clinical content.
 */
export function canPracticeTeamMemberReleaseClinicalContent(
  member: PracticeTeamMember,
  at: IsoDateTime,
): boolean {
  return (
    member.supervisionLevel ===
      "independent" &&
    hasPracticePrivilege(
      member,
      "consultations.release",
      at,
    )
  );
}

/**
 * Determines whether appointments may be booked directly with a member.
 */
export function canBookPracticeTeamMemberIndependently(
  member: PracticeTeamMember,
  at: IsoDateTime,
): boolean {
  return (
    member.independentlyBookable &&
    hasPracticePrivilege(
      member,
      "appointments.book",
      at,
    )
  );
}

/**
 * Validates the core supervision relationship required by a team member.
 */
export function hasValidPracticeSupervisionConfiguration(
  member: PracticeTeamMember,
  members: readonly PracticeTeamMember[],
): boolean {
  if (
    member.supervisionLevel !==
    "countersigned"
  ) {
    return (
      member.supervisorTeamMemberId ===
      undefined
    );
  }

  if (
    member.supervisorTeamMemberId ===
    undefined
  ) {
    return false;
  }

  const supervisor = members.find(
    (candidate) =>
      candidate.id ===
      member.supervisorTeamMemberId,
  );

  if (supervisor === undefined) {
    return false;
  }

  if (
    supervisor.id === member.id ||
    supervisor.careTeamId !==
      member.careTeamId ||
    !isPracticeTeamMemberActive(
      supervisor,
    )
  ) {
    return false;
  }

  return (
    supervisor.supervisionLevel ===
      "independent" &&
    WONFLOW_PRACTICE_ROLE_DEFAULT_PRIVILEGES[
      supervisor.roleCode
    ].includes(
      "consultations.countersign",
    )
  );
}
