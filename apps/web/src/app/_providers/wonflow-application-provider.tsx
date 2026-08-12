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
    () =>
      getWonFlowFrontendDataRuntime(
        configuration,
      ),
    [configuration],
  );

  const contextValue = useMemo<
    WonFlowApplicationContextValue
  >(
    () => ({
      configuration,

      runtime,

      hospitalService:
        runtime.service,

      practiceService:
        runtime.practiceService,

      practiceTenant:
        runtime.practiceTenant,

      environment:
        configuration
          .application
          .environment,

      locale:
        configuration
          .application
          .defaultLocale,

      fictionalData:
        runtime.fictional,

      demoScenario:
        runtime.scenario,
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