import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  PrismaClient,
} from "./generated/prisma/client";

declare global {
  var wonFlowPrisma:
    PrismaClient | undefined;
}

function requireDatabaseUrl(): string {
  const value =
    process.env.DATABASE_URL;

  if (!value) {
    throw new Error(
      "DATABASE_URL is not configured.",
    );
  }

  return value;
}

function createClient(): PrismaClient {
  const adapter =
    new PrismaPg({
      connectionString:
        requireDatabaseUrl(),
    });

  const isProduction = process.env.NODE_ENV === "production";

  const client = new PrismaClient({
    adapter,
    // FIX-22: every query logged in development so a list screen's N+1s
    // are visible by just watching the server console while loading it —
    // never enabled in production.
    ...(isProduction ? {} : { log: [{ level: "query", emit: "event" }] }),
  });

  if (!isProduction) {
    (client as unknown as { $on: (event: "query", callback: (event: { query: string; params: string; duration: number }) => void) => void }).$on(
      "query",
      (event) => {
        console.log(`[prisma] ${event.duration}ms  ${event.query}  ${event.params}`);
      },
    );
  }

  return client;
}

export const database =
  globalThis.wonFlowPrisma ??
  createClient();

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalThis.wonFlowPrisma =
    database;
}

export type {
  Prisma,
} from "./generated/prisma/client";

export {
  PrismaClient,
} from "./generated/prisma/client";

export {
  PaymentAccountMethod,
  ServiceBillingOwner,
  TokenPurpose,
  WorkspaceCode,
} from "./generated/prisma/enums";
