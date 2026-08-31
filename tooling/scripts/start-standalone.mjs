#!/usr/bin/env node
/**
 * Start the production server the way this build is actually built.
 *
 * `next.config` sets `output: "standalone"`, and `next start` does not serve a
 * standalone build — Next prints
 *
 *   ⚠️ "next start" does not work with "output: standalone" configuration.
 *      Use "node .next/standalone/server.js" instead.
 *
 * and the deployment ran on regardless. The Dockerfile has always done the
 * right thing; `pnpm start` did not, so anyone deploying with pm2, systemd or
 * bare node hit it.
 *
 * A standalone build is only half a server on its own. Next traces the server
 * dependencies into `.next/standalone` but deliberately leaves out the static
 * assets, because they are usually served by a CDN. Copy them in and the
 * server is complete; skip the copy and you get pages with no CSS and no
 * client JavaScript — worse than the warning it replaced. The Dockerfile does
 * the same two copies at image build time.
 */

import { cp, access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const webRoot = join(repoRoot, "apps", "web");

/**
 * Load `.env.local` from the repository root.
 *
 * `packages/database/src/client.ts` reads it too, but by a path relative to
 * its own module file. Under `next start` that module sits in
 * `apps/web/.next/server`, and three levels up is the repository root. In a
 * standalone build the same module is bundled at
 * `.next/standalone/apps/web/.next/server/chunks`, where three levels up is
 * not the root and the file is silently never found — so the server booted
 * with no DATABASE_URL and answered every request with an unstyled
 * "Internal Server Error".
 *
 * The launcher knows where the root is, so it reads the file and hands the
 * values to the server. Anything already in the environment wins, which is
 * how dotenv behaves and what a deployment that sets real variables through
 * pm2, systemd or Docker expects.
 */
async function readEnvFile(path) {
  let contents;

  try {
    contents = await readFile(path, "utf8");
  } catch {
    // No .env.local is normal. A real deployment sets variables properly.
    return {};
  }

  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separator = withoutExport.indexOf("=");
    if (separator < 1) continue;

    const key = withoutExport.slice(0, separator).trim();
    let value = withoutExport.slice(separator + 1).trim();

    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));

    if (quoted && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      // An unquoted trailing comment is not part of the value.
      const comment = value.indexOf(" #");
      if (comment >= 0) value = value.slice(0, comment).trim();
    }

    values[key] = value;
  }

  return values;
}

const standalone = join(webRoot, ".next", "standalone", "apps", "web");
const server = join(standalone, "server.js");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(server))) {
  console.error(
    [
      "No standalone build found at:",
      `  ${server}`,
      "",
      "Build first:",
      "  pnpm build",
    ].join("\n"),
  );
  process.exit(1);
}

// Both are safe to repeat: `force` overwrites, so restarting after a rebuild
// picks up the new assets rather than serving the previous deploy's.
await cp(join(webRoot, ".next", "static"), join(standalone, ".next", "static"), {
  recursive: true,
  force: true,
});

if (await exists(join(webRoot, "public"))) {
  await cp(join(webRoot, "public"), join(standalone, "public"), {
    recursive: true,
    force: true,
  });
}

const fileEnv = await readEnvFile(join(repoRoot, ".env.local"));

// Spread order is the contract: the file fills gaps, the real environment
// wins. A deployment that sets DATABASE_URL through pm2 or systemd is never
// overridden by a stale file someone left on the box.
const env = {
  ...fileEnv,
  ...process.env,
  PORT: process.env.PORT ?? "3007",
  HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
};

if (!env.DATABASE_URL) {
  console.error(
    [
      "DATABASE_URL is not set.",
      "",
      "The server needs it to reach the database, and every request will fail",
      "with an internal error without it. Set it in the environment, or in a",
      `.env.local at ${repoRoot}`,
    ].join("\n"),
  );
  process.exit(1);
}

const child = spawn(process.execPath, [server], { stdio: "inherit", env });

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
