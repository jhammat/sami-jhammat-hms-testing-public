/**
 * Demo-only role switching for the WonFlow mock session layer.
 *
 * Persona codes control presentation in the development switcher only.
 * They never grant permissions. Practice permissions are resolved from
 * the selected team-member record through care-team.ts helpers.
 */

import type {
  IsoDateTime,
  WonFlowId,
} from "@wonflow/contracts";

import {
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "../core/demo-clock";

import {
  WonFlowMockServiceError,
} from "../services/async-adapter";

import type {
  WonFlowMockSession,
  WonFlowMockSessionService,
} from "./practice-session";

export const WONFLOW_DEMO_PERSONA_CODES = [
  "owner",
  "senior-clinician",
  "supervised-clinician",
  "allied-health",
  "coordinator",
  "patient",
  "platform-admin",
] as const;

export type WonFlowDemoPersonaCode =
  (typeof WONFLOW_DEMO_PERSONA_CODES)[number];

export interface WonFlowDemoPracticeUserTarget {
  kind: "practice-user";

  userId: WonFlowId;

  teamMemberId: WonFlowId;
}

export interface WonFlowDemoPatientTarget {
  kind: "patient";

  patientAccountId:
    WonFlowId;
}

export interface WonFlowDemoPlatformAdminTarget {
  kind: "platform-admin";

  userId: WonFlowId;
}

/**
 * Compile-time coverage for every required preview persona.
 *
 * Practice persona keys map only to practice-user targets. The patient
 * and platform-admin keys map to their own session types.
 */
export interface WonFlowDemoPersonaTargetMap {
  owner:
    WonFlowDemoPracticeUserTarget;

  "senior-clinician":
    WonFlowDemoPracticeUserTarget;

  "supervised-clinician":
    WonFlowDemoPracticeUserTarget;

  "allied-health":
    WonFlowDemoPracticeUserTarget;

  coordinator:
    WonFlowDemoPracticeUserTarget;

  patient:
    WonFlowDemoPatientTarget;

  "platform-admin":
    WonFlowDemoPlatformAdminTarget;
}

/**
 * Runtime IDs supplied by a demo or test harness.
 *
 * This file deliberately contains no tenant, staff or patient IDs.
 */
export interface WonFlowDemoSessionDirectory {
  organizationId: WonFlowId;

  personas:
    Readonly<WonFlowDemoPersonaTargetMap>;
}

export interface WonFlowDemoPersonaOption {
  code: WonFlowDemoPersonaCode;

  label: string;

  description: string;
}

/**
 * Product-owned labels for the development switcher.
 *
 * These labels describe preview personas. They are not tenant-owned
 * team roles and are never used for authorization.
 */
export const WONFLOW_DEMO_PERSONAS:
  readonly WonFlowDemoPersonaOption[] = [
    {
      code: "owner",

      label:
        "Organization owner",

      description:
        "Preview the organization owner's configured privileges.",
    },
    {
      code:
        "senior-clinician",

      label:
        "Senior clinician",

      description:
        "Preview an independently supervised senior clinician.",
    },
    {
      code:
        "supervised-clinician",

      label:
        "Supervised clinician",

      description:
        "Preview a clinician whose work requires countersignature.",
    },
    {
      code:
        "allied-health",

      label:
        "Allied health",

      description:
        "Preview an independently configured allied-health member.",
    },
    {
      code: "coordinator",

      label:
        "Coordinator",

      description:
        "Preview administrative scheduling and triage access.",
    },
    {
      code: "patient",

      label: "Patient",

      description:
        "Preview the patient portal with linked patient records.",
    },
    {
      code:
        "platform-admin",

      label:
        "Platform administrator",

      description:
        "Preview tenant provisioning and entitlement controls.",
    },
  ];

export interface WonFlowDemoSessionClock {
  now(): IsoDateTime;
}

export interface WonFlowDemoSessionSnapshot {
  personaCode?:
    WonFlowDemoPersonaCode;

  session?:
    WonFlowMockSession;
}

export type WonFlowDemoSessionListener =
  (
    snapshot:
      WonFlowDemoSessionSnapshot,
  ) => void;

export interface WonFlowDemoRoleSwitcherController {
  isEnabled(): boolean;

  listPersonas():
    readonly WonFlowDemoPersonaOption[];

  getSnapshot():
    WonFlowDemoSessionSnapshot;

  subscribe(
    listener:
      WonFlowDemoSessionListener,
  ): () => void;

  switchPersona(
    personaCode:
      WonFlowDemoPersonaCode,
    signal?: AbortSignal,
  ): Promise<WonFlowMockSession>;

  clear(): void;
}

export interface CreateWonFlowDemoRoleSwitcherOptions {
  /**
   * Pass configuration.featureFlags.demoData here.
   */
  demoDataEnabled: boolean;

  dataMode: "mock" | "api";

  directory?:
    WonFlowDemoSessionDirectory;

  sessionService:
    WonFlowMockSessionService;

  clock?:
    WonFlowDemoSessionClock;
}

function createDefaultDemoClock():
  WonFlowDemoSessionClock {
  return {
    now(): IsoDateTime {
      return WONFLOW_DEMO_ANCHOR_DATE_TIME;
    },
  };
}

function assertCompleteDirectory(
  directory:
    WonFlowDemoSessionDirectory,
): void {
  for (
    const personaCode of
    WONFLOW_DEMO_PERSONA_CODES
  ) {
    if (
      directory.personas[
        personaCode
      ] === undefined
    ) {
      throw new Error(
        `The demo session directory is missing ${personaCode}.`,
      );
    }
  }
}

/**
 * Creates a role-switching controller.
 *
 * It remains disabled unless the public demo flag is enabled and the
 * frontend is using mock data mode.
 */
export function createWonFlowDemoRoleSwitcher(
  options:
    CreateWonFlowDemoRoleSwitcherOptions,
): WonFlowDemoRoleSwitcherController {
  if (
    options.demoDataEnabled &&
    options.dataMode !== "mock"
  ) {
    throw new Error(
      "The demo role switcher cannot run outside mock data mode.",
    );
  }

  const enabled =
    options.demoDataEnabled &&
    options.dataMode === "mock";

  if (
    enabled &&
    options.directory === undefined
  ) {
    throw new Error(
      "An enabled demo role switcher requires a complete session directory.",
    );
  }

  if (
    options.directory !==
    undefined
  ) {
    assertCompleteDirectory(
      options.directory,
    );
  }

  const clock =
    options.clock ??
    createDefaultDemoClock();

  const listeners =
    new Set<
      WonFlowDemoSessionListener
    >();

  let snapshot:
    WonFlowDemoSessionSnapshot = {};

  function publish(): void {
    const published = {
      ...snapshot,
    };

    for (const listener of listeners) {
      listener(published);
    }
  }

  return {
    isEnabled(): boolean {
      return enabled;
    },

    listPersonas() {
      return enabled
        ? WONFLOW_DEMO_PERSONAS
        : [];
    },

    getSnapshot() {
      return {
        ...snapshot,
      };
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    async switchPersona(
      personaCode,
      signal,
    ) {
      if (!enabled) {
        throw new WonFlowMockServiceError(
          "invalid-query",
          "The demo role switcher is disabled.",
          "session.switchPersona",
        );
      }

      const directory =
        options.directory;

      if (
        directory === undefined
      ) {
        throw new WonFlowMockServiceError(
          "invalid-query",
          "No demo session directory is configured.",
          "session.switchPersona",
        );
      }

      const target =
        directory.personas[
          personaCode
        ];

      const at = clock.now();

      let session:
        WonFlowMockSession;

      switch (target.kind) {
        case "practice-user":
          session =
            await options
              .sessionService
              .loadPracticeUserSession(
                {
                  organizationId:
                    directory
                      .organizationId,
                },
                {
                  userId:
                    target.userId,

                  teamMemberId:
                    target
                      .teamMemberId,

                  at,
                },
                signal,
              );

          break;

        case "patient":
          session =
            await options
              .sessionService
              .loadPatientSession(
                {
                  organizationId:
                    directory
                      .organizationId,
                },
                {
                  patientAccountId:
                    target
                      .patientAccountId,

                  at,
                },
                signal,
              );

          break;

        case "platform-admin":
          session =
            await options
              .sessionService
              .loadPlatformAdminSession(
                {
                  userId:
                    target.userId,

                  activeOrganizationId:
                    directory
                      .organizationId,

                  at,
                },
                signal,
              );

          break;
      }

      snapshot = {
        personaCode,

        session,
      };

      publish();

      return session;
    },

    clear(): void {
      snapshot = {};

      publish();
    },
  };
}
