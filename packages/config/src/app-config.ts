import {
  parseWonFlowPublicEnvironment,
} from "./environment";

import {
  resolveWonFlowFeatureFlags,
} from "./feature-flags";

import {
  getEnabledWonFlowPortals,
} from "./portals";

import type {
  WonFlowAppConfiguration,
} from "./types";

export const WONFLOW_APPLICATION_VERSION =
  "0.1.0" as const;

export function createWonFlowAppConfiguration(
  environmentInput: unknown,
): WonFlowAppConfiguration {
  const environment =
    parseWonFlowPublicEnvironment(
      environmentInput,
    );

  const featureFlags =
    resolveWonFlowFeatureFlags(
      environment,
    );

  const portals =
    getEnabledWonFlowPortals(
      featureFlags,
    );

  return {
    application: {
      name:
        environment
          .NEXT_PUBLIC_WONFLOW_APP_NAME,

      version:
        WONFLOW_APPLICATION_VERSION,

      buildId:
        environment
          .NEXT_PUBLIC_WONFLOW_BUILD_ID,

      environment:
        environment
          .WONFLOW_ENVIRONMENT,

      nodeEnvironment:
        environment.NODE_ENV,

      baseUrl:
        environment
          .NEXT_PUBLIC_WONFLOW_APP_URL,

      defaultLocale:
        environment
          .NEXT_PUBLIC_WONFLOW_DEFAULT_LOCALE,

      dataMode:
        environment
          .NEXT_PUBLIC_WONFLOW_DATA_MODE,

      demoScenario:
        environment
          .NEXT_PUBLIC_WONFLOW_DEMO_SCENARIO,

      showEnvironmentBanner:
        environment
          .NEXT_PUBLIC_WONFLOW_SHOW_ENVIRONMENT_BANNER,
    },

    featureFlags,
    portals,
  };
}

export function isWonFlowProtectedEnvironment(
  configuration:
    WonFlowAppConfiguration,
): boolean {
  return (
    configuration.application.environment ===
      "pilot" ||
    configuration.application.environment ===
      "production"
  );
}

export function shouldShowWonFlowDemoWarning(
  configuration:
    WonFlowAppConfiguration,
): boolean {
  return (
    configuration.featureFlags.demoData &&
    configuration.application
      .showEnvironmentBanner
  );
}
