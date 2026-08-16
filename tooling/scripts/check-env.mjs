#!/usr/bin/env node
// Validates that required environment variables are set before a command
// that needs them runs, instead of letting that command fail with a raw,
// unhelpful error.
//
// Usage: node tooling/scripts/check-env.mjs VAR_ONE VAR_TWO ...

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { config } from "dotenv";

const scriptDir = path.dirname(
  fileURLToPath(import.meta.url),
);
const repoRoot = path.resolve(
  scriptDir,
  "..",
  "..",
);
const envFile = ".env.local";
const envPath = path.join(
  repoRoot,
  envFile,
);

const requiredVariables = process.argv.slice(2);

if (requiredVariables.length === 0) {
  console.error(
    "check-env.mjs: no environment variables were specified to check.",
  );
  process.exit(1);
}

if (existsSync(envPath)) {
  config({ path: envPath });
}

const missing = requiredVariables.filter(
  (name) => {
    const value = process.env[name];
    return value === undefined || value.trim() === "";
  },
);

if (missing.length > 0) {
  console.error(
    `Missing required environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
  );

  if (existsSync(envPath)) {
    console.error(
      `Set ${missing.join(", ")} in ${envFile} at the repository root, then try again.`,
    );
  } else {
    console.error(
      `${envFile} does not exist. Copy .env.example to ${envFile} at the repository root, fill in ${missing.join(", ")}, then try again.`,
    );
  }

  process.exit(1);
}
