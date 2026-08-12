import {
  createWonFlowAppConfiguration,
} from "@wonflow/config";

import type {
  WonFlowAppConfiguration,
} from "@wonflow/config";

/**
 * This module must only be imported by server components.
 *
 * It deliberately selects public-safe variables instead of
 * passing the complete process.env object into client code.
 */
export function getWonFlowPublicAppConfiguration():
  WonFlowAppConfiguration {
  return createWonFlowAppConfiguration({
    NODE_ENV:
      process.env.NODE_ENV,

    WONFLOW_ENVIRONMENT:
      process.env.WONFLOW_ENVIRONMENT,

    NEXT_PUBLIC_WONFLOW_APP_NAME:
      process.env
        .NEXT_PUBLIC_WONFLOW_APP_NAME,

    NEXT_PUBLIC_WONFLOW_APP_URL:
      process.env
        .NEXT_PUBLIC_WONFLOW_APP_URL,

    NEXT_PUBLIC_WONFLOW_DEFAULT_LOCALE:
      process.env
        .NEXT_PUBLIC_WONFLOW_DEFAULT_LOCALE,

    NEXT_PUBLIC_WONFLOW_DATA_MODE:
      process.env
        .NEXT_PUBLIC_WONFLOW_DATA_MODE,

    NEXT_PUBLIC_WONFLOW_ENABLE_DEMO:
      process.env
        .NEXT_PUBLIC_WONFLOW_ENABLE_DEMO,

    NEXT_PUBLIC_WONFLOW_DEMO_SCENARIO:
      process.env
        .NEXT_PUBLIC_WONFLOW_DEMO_SCENARIO,

    NEXT_PUBLIC_WONFLOW_SHOW_ENVIRONMENT_BANNER:
      process.env
        .NEXT_PUBLIC_WONFLOW_SHOW_ENVIRONMENT_BANNER,

    NEXT_PUBLIC_WONFLOW_ENABLE_PATIENT_ACCESS:
      process.env
        .NEXT_PUBLIC_WONFLOW_ENABLE_PATIENT_ACCESS,

    NEXT_PUBLIC_WONFLOW_BUILD_ID:
      process.env
        .NEXT_PUBLIC_WONFLOW_BUILD_ID,
  });
}