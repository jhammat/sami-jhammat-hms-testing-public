/**
 * In-memory WonFlow mock-session implementation.
 *
 * Every record is loaded through the organization-scoped practice
 * service. The implementation never reads repositories or arrays
 * directly.
 */

import {
  canPatientAccountAuthenticate,
  getActivePracticePatientAssignments,
  isPatientAccountLinkActive,
  isPracticeTeamMemberActive,
  resolvePracticeTeamMemberPrivileges,
} from "@wonflow/contracts";

import type {
  Patient,
  WonFlowId,
} from "@wonflow/contracts";

import {
  createWonFlowMockAsyncAdapter,
  WonFlowMockServiceError,
} from "../services/async-adapter";

import type {
  MockAsyncAdapterOptions,
  WonFlowMockAsyncAdapter,
} from "../services/async-adapter";

import type {
  WonFlowMockSessionService,
  WonFlowMockSessionServiceDependencies,
} from "./practice-session";

export interface CreateWonFlowMockSessionServiceOptions {
  service:
    WonFlowMockSessionServiceDependencies;

  adapter?:
    WonFlowMockAsyncAdapter;

  adapterOptions?:
    MockAsyncAdapterOptions;
}

function createInvalidSessionError(
  message: string,
  operationName: string,
): WonFlowMockServiceError {
  return new WonFlowMockServiceError(
    "invalid-query",
    message,
    operationName,
  );
}

/**
 * Creates the session service used by mock-mode frontend providers.
 */
export function createWonFlowMockSessionService(
  options:
    CreateWonFlowMockSessionServiceOptions,
): WonFlowMockSessionService {
  const {
    service,
  } = options;

  const adapter =
    options.adapter ??
    createWonFlowMockAsyncAdapter({
      seed:
        "wonflow-session-service-v1",

      minimumLatencyMs: 80,

      maximumLatencyMs: 180,

      failureRate: 0,

      ...options.adapterOptions,
    });

  return {
    loadPracticeUserSession(
      scope,
      input,
      signal,
    ) {
      const operationName =
        "session.loadPracticeUser";

      return adapter.execute(
        async () => {
          const teamMember =
            await service.teamMembers.get(
              scope,
              input.teamMemberId,
              signal,
            );

          if (
            teamMember.userId !==
            input.userId
          ) {
            throw createInvalidSessionError(
              "The selected user does not own the selected team-member record.",
              operationName,
            );
          }

          if (
            !isPracticeTeamMemberActive(
              teamMember,
            )
          ) {
            throw createInvalidSessionError(
              "The selected practice team member is not active.",
              operationName,
            );
          }

          const assignmentPage =
            await service.patientAssignments.list(
              scope,
              {
                filter:
                  (assignment) =>
                    assignment
                      .teamMemberId ===
                    teamMember.id,

                limit: 1_000,
              },
              signal,
            );

          const activePatientAssignments =
            getActivePracticePatientAssignments(
              assignmentPage.items,
              teamMember.id,
              input.at,
            );

          return {
            kind:
              "practice-user",

            organizationId:
              scope.organizationId,

            userId:
              input.userId,

            teamMember,

            privileges:
              resolvePracticeTeamMemberPrivileges(
                teamMember,
                input.at,
              ),

            activePatientAssignments,

            issuedAt:
              input.at,
          };
        },
        {
          signal,

          operationName,
        },
      );
    },

    loadPatientSession(
      scope,
      input,
      signal,
    ) {
      const operationName =
        "session.loadPatient";

      return adapter.execute(
        async () => {
          const patientAccount =
            await service.patientAccounts.get(
              scope,
              input.patientAccountId,
              signal,
            );

          if (
            !canPatientAccountAuthenticate(
              patientAccount,
              input.at,
            )
          ) {
            throw createInvalidSessionError(
              "The selected patient account is not eligible to authenticate.",
              operationName,
            );
          }

          const linkPage =
            await service.patientAccountLinks.list(
              scope,
              {
                filter:
                  (link) =>
                    link
                      .patientAccountId ===
                    patientAccount.id,

                limit: 1_000,
              },
              signal,
            );

          const accountLinks =
            linkPage.items.filter(
              isPatientAccountLinkActive,
            );

          if (
            accountLinks.length === 0
          ) {
            throw new WonFlowMockServiceError(
              "not-found",
              "The selected patient account has no active patient links.",
              operationName,
            );
          }

          const uniquePatientIds = [
            ...new Set(
              accountLinks.map(
                (link) =>
                  link.patientId,
              ),
            ),
          ];

          const linkedPatients:
            Patient[] = [];

          for (
            const patientId of
            uniquePatientIds
          ) {
            linkedPatients.push(
              await service.patients.get(
                scope,
                patientId,
                signal,
              ),
            );
          }

          const primaryLink =
            accountLinks.find(
              (link) =>
                link.isPrimary,
            ) ??
            accountLinks[0];

          if (
            primaryLink === undefined
          ) {
            throw new WonFlowMockServiceError(
              "not-found",
              "The patient session has no primary patient record.",
              operationName,
            );
          }

          return {
            kind: "patient",

            organizationId:
              scope.organizationId,

            patientAccount,

            accountLinks,

            linkedPatients,

            primaryPatientId:
              primaryLink.patientId,

            issuedAt:
              input.at,
          };
        },
        {
          signal,

          operationName,
        },
      );
    },

    loadPlatformAdminSession(
      input,
      signal,
    ) {
      const operationName =
        "session.loadPlatformAdmin";

      return adapter.execute(
        () => ({
          kind:
            "platform-admin" as const,

          userId:
            input.userId,

          activeOrganizationId:
            input.activeOrganizationId,

          issuedAt:
            input.at,
        }),
        {
          signal,

          operationName,
        },
      );
    },
  };
}
