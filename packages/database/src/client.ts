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

  return new PrismaClient({
    adapter,
  });
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
  ServiceBillingOwner,
  TokenPurpose,
  WorkspaceCode,
} from "./generated/prisma/enums";
