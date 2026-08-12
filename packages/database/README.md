# @wonflow/database

PostgreSQL and Prisma implementation for the WonFlow platform.

## Purpose

This package provides:

- The Prisma schema (`prisma/schema.prisma`) — the single source of truth for
  every table, enum and relation
- Generated Prisma migrations (`prisma/migrations`)
- The shared, tenant-aware database client (`src/client.ts`)
- The generated Prisma Client (`src/generated`, not hand-edited)

Every service in `apps/web/src/server` reads and writes through this package
instead of talking to Prisma directly.

## Approved Import

```ts
import { database } from "@wonflow/database";
```

## Package Exclusions

The package must not contain:

- React components
- HTTP route handlers
- Business/authorization logic (that belongs in `apps/web/src/server`)
- Hospital-specific production data

## Schema Changes

1. Edit `prisma/schema.prisma`.
2. Run `pnpm --filter @wonflow/database db:validate` to check it.
3. Run `pnpm --filter @wonflow/database db:migrate` to create a migration.
4. Run `pnpm --filter @wonflow/database db:generate` to regenerate the client.

## Verification

```powershell
pnpm --filter @wonflow/database db:validate
pnpm --filter @wonflow/database typecheck
pnpm check
```
