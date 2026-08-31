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

import { cp, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "apps", "web");

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

// 3007 keeps the port this script replaced. PORT still wins, so a deployment
// that sets it is unaffected.
const child = spawn(process.execPath, [server], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT ?? "3007",
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
