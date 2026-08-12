/**
 * Mock session contracts for practice users, patient accounts and
 * platform administrators.
 *
 * These are frontend demonstration sessions, not authentication
 * credentials. Production authentication and server-side authorization
 * are implemented later.
 */

import {
  canPracticeTeamMemberAccessPatient,
  hasPracticePrivilege,
} from "@wonflow/contracts";

import type {
  IsoDateTime,
  Patient,
  PatientAccount,
  PatientAccountLink,
  PracticePatientAssignment,
  PracticePrivilege,
  PracticeTeamMember,
  WonFlowId,
} from "@wonflow/contracts";

import type {
  WonFlowOrganizationScope,
  WonFlowPracticeService,
} from "../services/practice-service";

/**
 * Active practice-user session.
 *
 * Privileges are resolved through the helpers in care-team.ts. UI code
 * must not infer permission from roleCode.
 */
export interface WonFlowPracticeUserSession {
  kind: "practice-user";

  organizationId: WonFlowId;

  userId: WonFlowId;

  teamMember: PracticeTeamMember;

  privileges:
    PracticePrivilege[];

  activePatientAssignments:
    PracticePatientAssignment[];

  issuedAt: IsoDateTime;
}

/**
 * Active patient-portal session.
 *
 * One patient account may be linked to several patient records, such as
 * the account holder and dependants.
 */
export interface WonFlowPatientSession {
  kind: "patient";

  organizationId: WonFlowId;

  patientAccount:
    PatientAccount;

  accountLinks:
    PatientAccountLink[];

  linkedPatients: Patient[];

  primaryPatientId:
    WonFlowId;

  issuedAt: IsoDateTime;
}

/**
 * Mock platform-administrator session.
 *
 * A platform administrator may inspect tenant provisioning and
 * entitlements but does not receive a practice team-member record.
 */
export interface WonFlowPlatformAdminSession {
  kind: "platform-admin";

  userId: WonFlowId;

  /**
   * Tenant currently selected in the platform-admin console.
   */
  activeOrganizationId?:
    WonFlowId;

  issuedAt: IsoDateTime;
}

export type WonFlowMockSession =
  | WonFlowPracticeUserSession
  | WonFlowPatientSession
  | WonFlowPlatformAdminSession;

export interface WonFlowPracticeUserSessionInput {
  userId: WonFlowId;

  teamMemberId: WonFlowId;

  at: IsoDateTime;
}

export interface WonFlowPatientSessionInput {
  patientAccountId:
    WonFlowId;

  at: IsoDateTime;
}

export interface WonFlowPlatformAdminSessionInput {
  userId: WonFlowId;

  activeOrganizationId?:
    WonFlowId;

  at: IsoDateTime;
}

/**
 * Smallest practice-service surface required by the mock session layer.
 */
export type WonFlowMockSessionServiceDependencies =
  Pick<
    WonFlowPracticeService,
    | "teamMembers"
    | "patientAssignments"
    | "patientAccounts"
    | "patientAccountLinks"
    | "patients"
  >;

export interface WonFlowMockSessionService {
  loadPracticeUserSession(
    scope: WonFlowOrganizationScope,
    input:
      WonFlowPracticeUserSessionInput,
    signal?: AbortSignal,
  ): Promise<WonFlowPracticeUserSession>;

  loadPatientSession(
    scope: WonFlowOrganizationScope,
    input:
      WonFlowPatientSessionInput,
    signal?: AbortSignal,
  ): Promise<WonFlowPatientSession>;

  loadPlatformAdminSession(
    input:
      WonFlowPlatformAdminSessionInput,
    signal?: AbortSignal,
  ): Promise<WonFlowPlatformAdminSession>;
}

/**
 * UI-facing privilege check.
 *
 * This deliberately delegates to hasPracticePrivilege from care-team.ts
 * instead of inspecting roleCode or trusting a menu state.
 */
export function hasWonFlowPracticeSessionPrivilege(
  session: WonFlowMockSession | undefined,
  privilege: PracticePrivilege,
  at: IsoDateTime,
): boolean {
  if (
    session?.kind !==
    "practice-user"
  ) {
    return false;
  }

  return hasPracticePrivilege(
    session.teamMember,
    privilege,
    at,
  );
}

/**
 * UI-facing clinical patient-access check.
 *
 * Administrative-only users are rejected by the underlying care-team
 * helper.
 */
export function canWonFlowPracticeSessionAccessPatient(
  session: WonFlowMockSession | undefined,
  patientId: WonFlowId,
  at: IsoDateTime,
): boolean {
  if (
    session?.kind !==
    "practice-user"
  ) {
    return false;
  }

  return canPracticeTeamMemberAccessPatient(
    session.teamMember,
    session.activePatientAssignments,
    patientId,
    at,
  );
}
