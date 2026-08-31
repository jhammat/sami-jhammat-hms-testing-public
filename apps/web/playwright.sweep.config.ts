import { defineConfig, devices } from "@playwright/test";

/**
 * Config for the portal sweep only.
 *
 * The main config starts (or waits for) a dev server on 3007 and seeds
 * development logins in global setup. The sweep is a review pass over a
 * PRODUCTION build of a hospital that is already seeded — it needs neither,
 * and waiting on a dev server it does not use is how a sweep run ends up
 * hanging rather than reporting.
 *
 * Run it against a `next start` server:
 *
 *   pnpm --filter web exec next build
 *   pnpm --filter web exec next start -p 3010
 *   pnpm --filter web exec playwright test --config playwright.sweep.config.ts
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /(hpbsp-portal-sweep|login-flow|allied-shell-capture|responsive-integrity|patient-registration)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["line"]],
  timeout: 240_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3010",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
