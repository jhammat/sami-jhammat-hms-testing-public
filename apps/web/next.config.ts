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
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: *",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
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
];

/**
 * The public booking widget at /book/:tenantSlug is meant to be embedded in
 * an <iframe> on a hospital or doctor's own external website — that is its
 * whole purpose, so the site-wide "never frame this app" default above would
 * silently break it. It is excluded from the general security-headers match
 * below (rather than given a second, overriding header block) because
 * browsers enforce multiple same-name CSP headers as an intersection, not a
 * replacement — a second, looser frame-ancestors would not actually widen
 * the first, stricter one. This route carries no session, shows no other
 * patient's data, and every write is rate-limited and server-validated in
 * public-registration-service.ts regardless of where the request came from.
 */
const publicBookingContentSecurityPolicy = contentSecurityPolicy.replace("frame-ancestors 'none'", "frame-ancestors *");
const publicBookingHeaders = [
  { key: "Content-Security-Policy", value: publicBookingContentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  allowedDevOrigins: [
    "https://hpbsp.wonflow.tech",
    "http://192.168.100.10:3000",
    "192.168.100.10:3000",
    "192.168.100.10",
    "192.168.10.12",
    "http://192.168.*",
    "192.168.*",
    "*.loca.lt",
    "localhost",
    "127.0.0.1",
    "[::1]",
  ],
  async headers() {
    return [
      { source: "/((?!book/|api/v1/public-registration/).*)", headers: securityHeaders },
      { source: "/api/v1/public-registration/:path*", headers: publicBookingHeaders },
      { source: "/book/:path*", headers: publicBookingHeaders },
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
