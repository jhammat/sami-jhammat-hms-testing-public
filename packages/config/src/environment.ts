import * as z from "zod";

import {
  languageCodeSchema,
  toWonFlowValidationIssues,
} from "@wonflow/validation";

import type {
  WonFlowPublicEnvironment,
  WonFlowServerEnvironment,
} from "./types";

const deploymentEnvironmentSchema = z.enum([
  "development",
  "test",
  "staging",
  "pilot",
  "production",
]);

const nodeEnvironmentSchema = z.enum([
  "development",
  "test",
  "production",
]);

const dataModeSchema = z.enum([
  "mock",
  "api",
]);

const demoScenarioSchema = z.enum([
  "hospital-day",
  "busy-opd",
  "inpatient-focus",
]);

function booleanEnvironmentSchema(
  defaultValue: boolean,
) {
  return z.preprocess(
    (value) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return defaultValue;
      }

      if (
        value === true ||
        value === "true"
      ) {
        return true;
      }

      if (
        value === false ||
        value === "false"
      ) {
        return false;
      }

      return value;
    },
    z.boolean({
      message:
        'Use either "true" or "false".',
    }),
  );
}

const optionalTrimmedTextSchema =
  z.preprocess(
    (value) => {
      if (
        typeof value === "string" &&
        value.trim() === ""
      ) {
        return undefined;
      }

      return value;
    },
    z
      .string()
      .trim()
      .min(1)
      .optional(),
  );

const optionalUrlSchema =
  z.preprocess(
    (value) => {
      if (
        typeof value === "string" &&
        value.trim() === ""
      ) {
        return undefined;
      }

      return value;
    },
    z
      .string()
      .trim()
      .url(
        "Enter a valid URL.",
      )
      .optional(),
  );

const optionalPortSchema =
  z.preprocess(
    (value) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return undefined;
      }

      return value;
    },
    z.coerce
      .number()
      .int()
      .min(1)
      .max(65_535)
      .optional(),
  );

export const publicEnvironmentSchema = z
  .object({
    NODE_ENV:
      nodeEnvironmentSchema.default(
        "development",
      ),

    WONFLOW_ENVIRONMENT:
      deploymentEnvironmentSchema.default(
        "development",
      ),

    NEXT_PUBLIC_WONFLOW_APP_NAME: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default("WonFlow"),

    NEXT_PUBLIC_WONFLOW_APP_URL: z
      .string()
      .trim()
      .url(
        "NEXT_PUBLIC_WONFLOW_APP_URL must be a valid URL.",
      )
      .default(
        "http://localhost:3000",
      ),

    NEXT_PUBLIC_WONFLOW_DEFAULT_LOCALE:
      languageCodeSchema.default("en"),

    NEXT_PUBLIC_WONFLOW_DATA_MODE:
      dataModeSchema.default("mock"),

    NEXT_PUBLIC_WONFLOW_ENABLE_DEMO:
      booleanEnvironmentSchema(true),

    NEXT_PUBLIC_WONFLOW_DEMO_SCENARIO:
      demoScenarioSchema.default(
        "hospital-day",
      ),

    NEXT_PUBLIC_WONFLOW_SHOW_ENVIRONMENT_BANNER:
      booleanEnvironmentSchema(true),

    NEXT_PUBLIC_WONFLOW_ENABLE_PATIENT_ACCESS:
      booleanEnvironmentSchema(true),

    NEXT_PUBLIC_WONFLOW_BUILD_ID:
      optionalTrimmedTextSchema,
  })
  .superRefine(
    (value, context) => {
      const protectedEnvironment =
        value.WONFLOW_ENVIRONMENT ===
          "pilot" ||
        value.WONFLOW_ENVIRONMENT ===
          "production";

      if (
        protectedEnvironment &&
        value.NEXT_PUBLIC_WONFLOW_DATA_MODE ===
          "mock"
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "NEXT_PUBLIC_WONFLOW_DATA_MODE",
          ],
          message:
            "Pilot and production environments cannot use mock data mode.",
        });
      }

      if (
        value.WONFLOW_ENVIRONMENT ===
          "production" &&
        !value
          .NEXT_PUBLIC_WONFLOW_APP_URL
          .startsWith("https://")
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "NEXT_PUBLIC_WONFLOW_APP_URL",
          ],
          message:
            "Production application URLs must use HTTPS.",
        });
      }
    },
  );

export const serverEnvironmentSchema = z
  .object({
    WONFLOW_ENVIRONMENT:
      deploymentEnvironmentSchema.default(
        "development",
      ),

    DATABASE_URL: z
      .string()
      .trim()
      .regex(
        /^postgres(?:ql)?:\/\//,
        "DATABASE_URL must be a PostgreSQL connection string.",
      ),

    DIRECT_URL:
      optionalTrimmedTextSchema,

    SESSION_SECRET: z
      .string()
      .min(
        32,
        "SESSION_SECRET must contain at least 32 characters.",
      ),

    AUTH_ENCRYPTION_KEY: z
      .string()
      .min(
        32,
        "AUTH_ENCRYPTION_KEY must contain at least 32 characters.",
      ),

    ALLOW_MOCK_DATA:
      booleanEnvironmentSchema(true),

    REDIS_URL:
      optionalUrlSchema,

    OBJECT_STORAGE_ENDPOINT:
      optionalUrlSchema,

    OBJECT_STORAGE_BUCKET:
      optionalTrimmedTextSchema,

    OBJECT_STORAGE_ACCESS_KEY:
      optionalTrimmedTextSchema,

    OBJECT_STORAGE_SECRET_KEY:
      optionalTrimmedTextSchema,

    SMTP_HOST:
      optionalTrimmedTextSchema,

    SMTP_PORT:
      optionalPortSchema,

    SMTP_USERNAME:
      optionalTrimmedTextSchema,

    SMTP_PASSWORD:
      optionalTrimmedTextSchema,
  })
  .superRefine(
    (value, context) => {
      const protectedEnvironment =
        value.WONFLOW_ENVIRONMENT ===
          "pilot" ||
        value.WONFLOW_ENVIRONMENT ===
          "production";

      if (
        protectedEnvironment &&
        value.ALLOW_MOCK_DATA
      ) {
        context.addIssue({
          code: "custom",
          path: ["ALLOW_MOCK_DATA"],
          message:
            "Mock data must be disabled in pilot and production environments.",
        });
      }

      if (
        protectedEnvironment &&
        value.SESSION_SECRET.startsWith(
          "replace-with",
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["SESSION_SECRET"],
          message:
            "Replace the example session secret before using a protected environment.",
        });
      }

      if (
        protectedEnvironment &&
        value.AUTH_ENCRYPTION_KEY.startsWith(
          "replace-with",
        )
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "AUTH_ENCRYPTION_KEY",
          ],
          message:
            "Replace the example encryption key before using a protected environment.",
        });
      }

      const objectStorageValues = [
        value.OBJECT_STORAGE_ENDPOINT,
        value.OBJECT_STORAGE_BUCKET,
        value.OBJECT_STORAGE_ACCESS_KEY,
        value.OBJECT_STORAGE_SECRET_KEY,
      ];

      const configuredObjectStorageValues =
        objectStorageValues.filter(
          (item) =>
            item !== undefined,
        ).length;

      if (
        configuredObjectStorageValues > 0 &&
        configuredObjectStorageValues <
          objectStorageValues.length
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "OBJECT_STORAGE_ENDPOINT",
          ],
          message:
            "Configure all object-storage variables together.",
        });
      }

      if (
        value.SMTP_HOST !== undefined &&
        value.SMTP_PORT === undefined
      ) {
        context.addIssue({
          code: "custom",
          path: ["SMTP_PORT"],
          message:
            "SMTP_PORT is required when SMTP_HOST is configured.",
        });
      }
    },
  );

function createEnvironmentError(
  title: string,
  error: z.ZodError,
): Error {
  const issues =
    toWonFlowValidationIssues(error);

  const details = issues
    .map(
      (issue) =>
        `- ${issue.field}: ${issue.message}`,
    )
    .join("\n");

  return new Error(
    `${title}\n${details}`,
  );
}

export function parseWonFlowPublicEnvironment(
  input: unknown,
): WonFlowPublicEnvironment {
  const result =
    publicEnvironmentSchema.safeParse(
      input,
    );

  if (!result.success) {
    throw createEnvironmentError(
      "WonFlow public environment validation failed.",
      result.error,
    );
  }

  return result.data;
}

export function parseWonFlowServerEnvironment(
  input: unknown,
): WonFlowServerEnvironment {
  const result =
    serverEnvironmentSchema.safeParse(
      input,
    );

  if (!result.success) {
    throw createEnvironmentError(
      "WonFlow server environment validation failed.",
      result.error,
    );
  }

  return result.data;
}

export function assertEnvironmentCompatibility(
  publicEnvironment:
    WonFlowPublicEnvironment,

  serverEnvironment:
    WonFlowServerEnvironment,
): void {
  if (
    publicEnvironment
      .WONFLOW_ENVIRONMENT !==
    serverEnvironment
      .WONFLOW_ENVIRONMENT
  ) {
    throw new Error(
      [
        "WonFlow environment mismatch.",
        `Public environment: ${publicEnvironment.WONFLOW_ENVIRONMENT}`,
        `Server environment: ${serverEnvironment.WONFLOW_ENVIRONMENT}`,
      ].join("\n"),
    );
  }

  if (
    publicEnvironment
      .NEXT_PUBLIC_WONFLOW_DATA_MODE ===
      "mock" &&
    !serverEnvironment.ALLOW_MOCK_DATA
  ) {
    throw new Error(
      "The client requests mock data, but the server has disabled it.",
    );
  }
}