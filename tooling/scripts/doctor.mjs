#!/usr/bin/env node
// Preflight check for a fresh clone. Verifies the Node.js version, the pnpm
// version, PostgreSQL reachability and required environment variables, then
// reports everything that is missing in one pass instead of failing on the
// first broken step.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
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

const packageJson = JSON.parse(
  readFileSync(
    path.join(repoRoot, "package.json"),
    "utf8",
  ),
);

const requiredNodeRange = packageJson.engines?.node ?? ">=20.9.0";
const requiredPnpmRange = packageJson.engines?.pnpm ?? ">=10.0.0";
const requiredServerVariables = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "AUTH_ENCRYPTION_KEY",
];

const problems = [];
const oks = [];

function parseMinimumVersion(range) {
  const match = range.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return match.slice(1, 4).map(Number);
}

function compareVersions(actual, minimum) {
  for (let index = 0; index < minimum.length; index += 1) {
    const actualPart = actual[index] ?? 0;
    const minimumPart = minimum[index] ?? 0;
    if (actualPart !== minimumPart) {
      return actualPart - minimumPart;
    }
  }
  return 0;
}

function checkNodeVersion() {
  const actual = process.versions.node
    .split(".")
    .map(Number);
  const minimum = parseMinimumVersion(requiredNodeRange);

  if (minimum && compareVersions(actual, minimum) < 0) {
    problems.push(
      `Node.js ${process.versions.node} is installed, but ${requiredNodeRange} is required. Install a newer Node.js version.`,
    );
    return;
  }

  oks.push(
    `Node.js ${process.versions.node} satisfies ${requiredNodeRange}.`,
  );
}

function checkPnpmVersion() {
  let output;
  try {
    output = execSync("pnpm --version", {
      encoding: "utf8",
    }).trim();
  } catch {
    problems.push(
      "pnpm was not found on the PATH. Install pnpm (https://pnpm.io/installation).",
    );
    return;
  }

  const actual = output.split(".").map(Number);
  const minimum = parseMinimumVersion(requiredPnpmRange);

  if (minimum && compareVersions(actual, minimum) < 0) {
    problems.push(
      `pnpm ${output} is installed, but ${requiredPnpmRange} is required. Run: npm i -g pnpm@latest`,
    );
    return;
  }

  oks.push(`pnpm ${output} satisfies ${requiredPnpmRange}.`);
}

function checkEnvFile() {
  if (!existsSync(envPath)) {
    problems.push(
      `${envFile} does not exist. Copy .env.example to ${envFile} at the repository root and fill in the required values.`,
    );
    return false;
  }

  config({ path: envPath });
  oks.push(`${envFile} exists.`);
  return true;
}

function checkRequiredVariables() {
  const missing = requiredServerVariables.filter((name) => {
    const value = process.env[name];
    return value === undefined || value.trim() === "";
  });

  if (missing.length > 0) {
    problems.push(
      `Missing required environment variable${missing.length > 1 ? "s" : ""} in ${envFile}: ${missing.join(", ")}.`,
    );
    return;
  }

  oks.push(
    `Required environment variables are set: ${requiredServerVariables.join(", ")}.`,
  );
}

function parseHostPort(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: Number(url.port) || 5432,
    };
  } catch {
    return null;
  }
}

function checkPostgresReachable() {
  return new Promise((resolve) => {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      problems.push(
        "Cannot check PostgreSQL reachability because DATABASE_URL is not set.",
      );
      resolve();
      return;
    }

    const target = parseHostPort(databaseUrl);
    if (!target) {
      problems.push(
        `DATABASE_URL could not be parsed as a URL: ${databaseUrl}`,
      );
      resolve();
      return;
    }

    const socket = net.createConnection({
      host: target.host,
      port: target.port,
      timeout: 3000,
    });

    const finish = (ok, detail) => {
      socket.destroy();
      if (ok) {
        oks.push(
          `PostgreSQL is reachable at ${target.host}:${target.port}.`,
        );
      } else {
        problems.push(
          `PostgreSQL is not reachable at ${target.host}:${target.port}${detail ? ` (${detail})` : ""}. Start it, e.g. with: docker compose -f deploy/docker-compose.yml up -d`,
        );
      }
      resolve();
    };

    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false, "timed out"));
    socket.once("error", (error) => finish(false, error.code ?? error.message));
  });
}

async function main() {
  checkNodeVersion();
  checkPnpmVersion();
  const envFileExists = checkEnvFile();
  if (envFileExists) {
    checkRequiredVariables();
  }
  await checkPostgresReachable();

  console.log("WonFlow doctor\n");

  for (const ok of oks) {
    console.log(`  ok    ${ok}`);
  }

  for (const problem of problems) {
    console.log(`  fail  ${problem}`);
  }

  console.log(
    `\n${oks.length} check${oks.length === 1 ? "" : "s"} passed, ${problems.length} failed.`,
  );

  if (problems.length > 0) {
    process.exitCode = 1;
  }
}

await main();
