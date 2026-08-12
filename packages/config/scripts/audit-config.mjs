import {
  readFile,
} from "node:fs/promises";

import path from "node:path";
import process from "node:process";

import {
  fileURLToPath,
} from "node:url";

const scriptFilePath =
  fileURLToPath(import.meta.url);

const packageRoot =
  path.resolve(
    path.dirname(scriptFilePath),
    "..",
  );

const repositoryRoot =
  path.resolve(
    packageRoot,
    "..",
    "..",
  );

const environmentExamplePath =
  path.join(
    repositoryRoot,
    ".env.example",
  );

const sourceIndexPath =
  path.join(
    packageRoot,
    "src",
    "index.ts",
  );

const requiredEnvironmentVariables = [
  "NODE_ENV",
  "WONFLOW_ENVIRONMENT",
  "NEXT_PUBLIC_WONFLOW_APP_NAME",
  "NEXT_PUBLIC_WONFLOW_APP_URL",
  "NEXT_PUBLIC_WONFLOW_DEFAULT_LOCALE",
  "NEXT_PUBLIC_WONFLOW_DATA_MODE",
  "NEXT_PUBLIC_WONFLOW_ENABLE_DEMO",
  "NEXT_PUBLIC_WONFLOW_DEMO_SCENARIO",
  "DATABASE_URL",
  "SESSION_SECRET",
  "AUTH_ENCRYPTION_KEY",
  "ALLOW_MOCK_DATA",
];

const forbiddenPublicVariableFragments = [
  "SECRET",
  "PASSWORD",
  "DATABASE_URL",
  "ENCRYPTION_KEY",
  "ACCESS_KEY",
  "PRIVATE_KEY",
  "TOKEN",
];

function readEnvironmentVariableNames(
  source,
) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith("#") &&
        line.includes("="),
    )
    .map(
      (line) =>
        line.slice(
          0,
          line.indexOf("="),
        ),
    );
}

async function runAudit() {
  const environmentSource =
    await readFile(
      environmentExamplePath,
      "utf8",
    );

  const publicIndexSource =
    await readFile(
      sourceIndexPath,
      "utf8",
    );

  const variableNames =
    readEnvironmentVariableNames(
      environmentSource,
    );

  const failures = [];

  for (
    const requiredVariable of
    requiredEnvironmentVariables
  ) {
    if (
      !variableNames.includes(
        requiredVariable,
      )
    ) {
      failures.push(
        `Missing environment example variable: ${requiredVariable}`,
      );
    }
  }

  const duplicateVariables =
    variableNames.filter(
      (
        variableName,
        index,
        values,
      ) =>
        values.indexOf(variableName) !==
        index,
    );

  for (
    const duplicateVariable of
    new Set(duplicateVariables)
  ) {
    failures.push(
      `Duplicate environment variable: ${duplicateVariable}`,
    );
  }

  for (
    const variableName of variableNames
  ) {
    if (
      !variableName.startsWith(
        "NEXT_PUBLIC_",
      )
    ) {
      continue;
    }

    for (
      const forbiddenFragment of
      forbiddenPublicVariableFragments
    ) {
      if (
        variableName.includes(
          forbiddenFragment,
        )
      ) {
        failures.push(
          `Server secret may be publicly exposed: ${variableName}`,
        );
      }
    }
  }

  const requiredExports = [
    "./types",
    "./environment",
    "./feature-flags",
    "./portals",
    "./app-config",
    "./navigation/routes",
  ];

  for (
    const requiredExport of
    requiredExports
  ) {
    if (
      !publicIndexSource.includes(
        requiredExport,
      )
    ) {
      failures.push(
        `Missing public package export: ${requiredExport}`,
      );
    }
  }

  if (
    !environmentSource.includes(
      "replace-with-at-least-32-random-characters",
    )
  ) {
    failures.push(
      "The environment example must contain safe secret placeholders.",
    );
  }

  if (failures.length > 0) {
    console.error(
      "\nWonFlow configuration audit failed.\n",
    );

    for (
      const failure of failures
    ) {
      console.error(
        `- ${failure}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    [
      "WonFlow configuration audit passed.",
      `Environment variables checked: ${variableNames.length}`,
      "Required variables are present.",
      "No public secret variable names were detected.",
      "Public package exports are present.",
    ].join("\n"),
  );
}

runAudit().catch(
  (error) => {
    console.error(
      "Unable to complete the WonFlow configuration audit.",
    );

    console.error(error);

    process.exitCode = 1;
  },
);
