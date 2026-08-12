import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

/**
 * The monorepo root. Pinning this stops Next.js from inferring the workspace
 * root from unrelated lockfiles that happen to sit above the checkout, which
 * produced mismatched client chunk paths and prevented React from hydrating.
 */
const workspaceRoot = path.resolve(appDirectory, "../..");

const isProduction = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * `script-src` still needs `'unsafe-inline'`: the App Router streams its RSC
 * payload through inline script tags and the root layout bootstraps the colour
 * theme inline. Tightening this further requires nonce plumbing through both.
 * The directives below are still worth having — they block external script and
 * object sources, framing, and base-tag injection.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isProduction ? "" : " ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /**
   * Camera and microphone are granted to this origin only, because online
   * video consultations call getUserMedia. Denying them outright (`camera=()`)
   * blocks the consultation room before the browser prompt is ever shown.
   */
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        /**
         * Patient data must never sit in a shared cache. Scoped away from
         * `/_next/static`, whose fingerprinted assets are immutable and must
         * stay cacheable.
         */
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
  /**
   * Loopback hosts used for local development and the Playwright suite. Without
   * these, Next.js blocks `/_next/*` development resources as cross-origin when
   * the browser reaches the server on a different loopback name than the one it
   * was started with, which leaves the client unable to hydrate.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost", "[::1]", "192.168.10.12"],
  turbopack: {
    root: workspaceRoot,
  },
  transpilePackages: [
    "@wonflow/ui",
    "@wonflow/config",
    "@wonflow/contracts",
    "@wonflow/database",
  ],
};

export default nextConfig;
