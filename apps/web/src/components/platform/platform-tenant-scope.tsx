"use client";

/**
 * Every platform nav page below the top-level dashboard (Entitlements,
 * Subscriptions, Support Access, Audit) needs the same platform-admin
 * session and first tenant organization overview, so it is fetched once
 * here via `usePlatformTenantScope` instead of duplicated per page.
 */

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createWonFlowMockSessionService,
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "@wonflow/mock-data";

import type {
  WonFlowPlatformAdminSession,
  WonFlowPlatformTenantListItem,
  WonFlowPlatformTenantOverview,
  WonFlowPracticeService,
} from "@wonflow/mock-data";

import {
  useWonFlowApplication,
} from "@/app/_providers";

export interface PlatformTenantScopeContext {
  service:
    WonFlowPracticeService;

  session:
    WonFlowPlatformAdminSession;

  tenant:
    WonFlowPlatformTenantListItem;

  overview:
    WonFlowPlatformTenantOverview;

  onChanged:
    (
      nextOverview:
        WonFlowPlatformTenantOverview,
    ) => void;
}

export type PlatformTenantScopeState =
  | {
      status: "loading";
    }
  | {
      status: "error";
      message: string;
    }
  | ({
      status: "ready";
    } & PlatformTenantScopeContext);

/**
 * Loads the platform-admin session and the first tenant organization's
 * overview. Client components consume this directly instead of a
 * render-prop, because Server Component pages cannot pass functions as
 * children across the client boundary.
 */
export function usePlatformTenantScope(): PlatformTenantScopeState {
  const {
    practiceService,
    practiceTenant,
  } = useWonFlowApplication();

  const sessionService =
    useMemo(
      () =>
        createWonFlowMockSessionService({
          service:
            practiceService,
        }),
      [practiceService],
    );

  const [
    session,
    setSession,
  ] = useState<
    WonFlowPlatformAdminSession | undefined
  >();

  const [
    tenant,
    setTenant,
  ] = useState<
    WonFlowPlatformTenantListItem | undefined
  >();

  const [
    overview,
    setOverview,
  ] = useState<
    WonFlowPlatformTenantOverview | undefined
  >();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | undefined
  >();

  useEffect(
    () => {
      let active = true;

      async function load():
        Promise<void> {
        try {
          const tenantContext =
            await practiceTenant;

          const platformSession =
            await sessionService
              .loadPlatformAdminSession(
                {
                  userId:
                    tenantContext
                      .platformActorUserId,

                  activeOrganizationId:
                    tenantContext
                      .scope
                      .organizationId,

                  at:
                    WONFLOW_DEMO_ANCHOR_DATE_TIME,
                },
              );

          if (
            platformSession.kind !==
            "platform-admin"
          ) {
            throw new Error(
              "A platform-administrator session is required.",
            );
          }

          const tenantList =
            await practiceService
              .listPlatformTenants(
                platformSession.userId,
              );

          const firstTenant =
            [...tenantList].sort(
              (
                left,
                right,
              ) =>
                left.organizationName
                  .localeCompare(
                    right.organizationName,
                  ),
            )[0];

          if (
            firstTenant ===
            undefined
          ) {
            throw new Error(
              "No tenant organization is provisioned on this platform yet.",
            );
          }

          const tenantOverview =
            await practiceService
              .getPlatformTenantOverview(
                {
                  organizationId:
                    firstTenant.organizationId,
                },
              );

          if (!active) {
            return;
          }

          setSession(
            platformSession,
          );

          setTenant(
            firstTenant,
          );

          setOverview(
            tenantOverview,
          );
        } catch (error) {
          if (active) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "The platform workspace could not be loaded.",
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    },
    [
      practiceService,
      practiceTenant,
      sessionService,
    ],
  );

  if (loading) {
    return { status: "loading" };
  }

  if (
    errorMessage !==
      undefined ||
    session ===
      undefined ||
    tenant ===
      undefined ||
    overview ===
      undefined
  ) {
    return {
      status: "error",
      message:
        errorMessage ??
        "The platform workspace could not be loaded.",
    };
  }

  return {
    status: "ready",

    service:
      practiceService,

    session,
    tenant,
    overview,

    onChanged:
      setOverview,
  };
}
