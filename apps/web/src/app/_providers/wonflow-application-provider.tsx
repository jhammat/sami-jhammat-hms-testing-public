"use client";

import {
  createContext,
  useContext,
  useMemo,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  WonFlowAppConfiguration,
  WonFlowDeploymentEnvironment,
  WonFlowLocale,
} from "@wonflow/config";

import {
  getWonFlowFrontendDataRuntime,
} from "@/lib/data";

import type {
  WonFlowFrontendDataRuntime,
  WonFlowHospitalReadService,
  WonFlowPracticeTenantRuntimeContext,
} from "@/lib/data";

import type {
  WonFlowPracticeService,
} from "@wonflow/mock-data";

export interface WonFlowApplicationContextValue {
  configuration:
    WonFlowAppConfiguration;

  runtime:
    WonFlowFrontendDataRuntime;

  hospitalService:
    WonFlowHospitalReadService;

  practiceService:
    WonFlowPracticeService;

  practiceTenant:
    Promise<WonFlowPracticeTenantRuntimeContext>;

  environment:
    WonFlowDeploymentEnvironment;

  locale:
    WonFlowLocale;

  fictionalData: boolean;

  demoScenario?: string;
}

export interface WonFlowApplicationProviderProps {
  configuration:
    WonFlowAppConfiguration;

  children: ReactNode;
}

const WonFlowApplicationContext =
  createContext<
    WonFlowApplicationContextValue | undefined
  >(undefined);

export function WonFlowApplicationProvider({
  configuration,
  children,
}: WonFlowApplicationProviderProps) {
  const runtime = useMemo(
    () => {
      try {
        return getWonFlowFrontendDataRuntime(
          configuration,
        );
      } catch (error) {
        // Every page mounts this provider, but only a handful of
        // not-yet-migrated components ever read `runtime` — most of the
        // app gets its data from real /api/v1 routes instead. Failing to
        // construct the legacy mock runtime (e.g. in API data mode, where
        // it isn't implemented) must not take down every page; it should
        // only break the specific screen that actually reaches for it.
        return new Proxy(
          {} as WonFlowFrontendDataRuntime,
          {
            get() {
              throw error;
            },
          },
        );
      }
    },
    [configuration],
  );

  const contextValue = useMemo<
    WonFlowApplicationContextValue
  >(
    () =>
      // Getters, not eager values: `runtime` may be the throwing proxy
      // above, and reading e.g. `.service` off it here (as a plain
      // property value) would trigger that throw for every page again,
      // regardless of whether anything ever reads `hospitalService`.
      ({
        configuration,

        runtime,

        get hospitalService() {
          return runtime.service;
        },

        get practiceService() {
          return runtime.practiceService;
        },

        get practiceTenant() {
          return runtime.practiceTenant;
        },

        environment:
          configuration
            .application
            .environment,

        locale:
          configuration
            .application
            .defaultLocale,

        get fictionalData() {
          return runtime.fictional;
        },

        get demoScenario() {
          return runtime.scenario;
        },
      }),
    [
      configuration,
      runtime,
    ],
  );

  return (
    <WonFlowApplicationContext.Provider
      value={contextValue}
    >
      {children}
    </WonFlowApplicationContext.Provider>
  );
}

export function useWonFlowApplication():
  WonFlowApplicationContextValue {
  const context =
    useContext(
      WonFlowApplicationContext,
    );

  if (context === undefined) {
    throw new Error(
      [
        "useWonFlowApplication must be used",
        "inside WonFlowApplicationProvider.",
      ].join(" "),
    );
  }

  return context;
}

export function useWonFlowConfiguration():
  WonFlowAppConfiguration {
  return useWonFlowApplication()
    .configuration;
}

export function useWonFlowDataRuntime():
  WonFlowFrontendDataRuntime {
  return useWonFlowApplication()
    .runtime;
}

export function useWonFlowHospitalService():
  WonFlowHospitalReadService {
  return useWonFlowApplication()
    .hospitalService;
}

export function useWonFlowPracticeService():
  WonFlowPracticeService {
  return useWonFlowApplication()
    .practiceService;
}

export function useWonFlowPracticeTenant():
  Promise<WonFlowPracticeTenantRuntimeContext> {
  return useWonFlowApplication()
    .practiceTenant;
}

export function useWonFlowEnvironment():
  WonFlowDeploymentEnvironment {
  return useWonFlowApplication()
    .environment;
}

export function useWonFlowLocale():
  WonFlowLocale {
  return useWonFlowApplication()
    .locale;
}

export function useWonFlowIsDemo():
  boolean {
  return useWonFlowApplication()
    .fictionalData;
}