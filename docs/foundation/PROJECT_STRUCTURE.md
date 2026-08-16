# WonFlow Software Structure

This document is the practical map of the WonFlow repository. WonFlow is a pnpm monorepo: the applications in `apps/` consume reusable packages in `packages/`. Phase 1 is a PostgreSQL-backed hospital platform; unfinished Phase 2 modules live outside the workspace in `deferred/`.

## Top-level folders and files

```text
wonflow/
|- apps/                 Runnable applications
|- packages/             Reusable, application-independent code
|- tooling/              Shared TypeScript settings and maintenance scripts
|- deploy/               Docker deployment configuration
|- docs/                 Architecture, product, security, release, and demo docs
|- deferred/             Phase 2 code deliberately excluded from builds
|- artifacts/            Generated or retained task artifacts
|- .github/              GitHub workflow/configuration files
|- .env.example          Template for required local environment variables
|- package.json          Root scripts, tool versions, and workspace commands
|- pnpm-workspace.yaml   Declares workspace members (`apps/*`, `packages/*`, `tooling/*`)
|- pnpm-lock.yaml        Locked dependency graph
|- README.md              Setup, commands, Phase 1 scope, and deployment entry point
`- DEPENDENCIES.md       Third-party dependency record
```

`.env.local` is local configuration and must not be committed. It holds secrets such as the database connection, session secret, and encryption key.

## Applications (`apps/`)

| Path | Purpose |
| --- | --- |
| `apps/web/` | Primary Next.js App Router product: browser UI, HTTP API routes, server-side services, tests, and static assets. |
| `apps/worker/` | Background job runner. `src/index.ts` is its process entry point. |
| `apps/doctor-mobile/` | Expo/React Native Android application for doctors. `app/` holds Expo routes; `android/` holds native Android project files. |
| `apps/patient-mobile/` | Expo/React Native Android application for patients, with the same `app/` and `android/` split. |

### Web application (`apps/web/`)

```text
apps/web/
|- src/
|  |- app/          Next.js pages, layouts, route groups, and API route handlers
|  |- components/   Web-app UI components, grouped by business area
|  |- lib/          Browser-safe/shared application helpers and feature logic
|  `- server/       Server-only services, authorization, persistence orchestration, HTTP helpers
|- public/          Static files served directly (including brand assets)
|- tests/           Vitest support and Playwright end-to-end tests
|- next.config.ts   Next.js configuration
|- playwright.config.ts / vitest.config.ts  Test runner configuration
`- package.json     Web app scripts and dependencies
```

`src/app/` uses Next.js conventions:

- `page.tsx` renders a route; `layout.tsx` supplies the shared layout for a route segment.
- Parenthesized directories such as `(doctor-workspace)` and `(hospital-operations)` are route groups. They organize code and layouts but do not appear in URLs.
- Folders in square brackets, for example `[patientId]`, are dynamic URL segments.
- `api/` contains route handlers for `/api/...`; `api/v1/` is the versioned product API.
- `_components/` and `_providers/` are route-local implementation code rather than URL segments.

The main route groups represent the platform's workspaces: access/authentication, platform administration, organization administration, hospital operations, doctor workspace, patient access, management, and public booking.

Within `src/components/`, folders such as `appointments`, `billing`, `diagnostics`, `patient`, `pharmacy`, and `video-consultation` group feature UI. `shell`, `navigation`, `workflow`, and `workspace` provide cross-feature application UI. Put a component here when it belongs to the web product; put it in `packages/ui` when it is generic enough for multiple applications.

`src/lib/` contains feature helpers, client-facing API adapters, formatting, state, and configuration glue. `src/server/` is the server boundary: it contains domain services (for example, scheduling, reception, finance, diagnostics, and access control) and may use the database package. Browser components must not import server-only code or the database package.

## Shared packages (`packages/`)

| Package | What it owns |
| --- | --- |
| `@wonflow/ui` (`packages/ui/`) | Generic React components, shared styles, and design-system utilities. `src/components/` contains primitives; `src/styles/globals.css` contains shared styles. |
| `@wonflow/contracts` (`packages/contracts/`) | TypeScript domain and API contracts, grouped by domains such as access, appointments, clinical, diagnostics, finance, patient, pharmacy, and practice. |
| `@wonflow/validation` (`packages/validation/`) | Runtime validation schemas and validation helpers. Schemas mirror shared domains and are used at form/API boundaries. |
| `@wonflow/config` (`packages/config/`) | Environment parsing, application configuration, feature flags, module/portal definitions, navigation routes, and configuration types. |
| `@wonflow/database` (`packages/database/`) | Prisma schema, migrations, generated-client entry point, and database client. `prisma/schema.prisma` is the source of truth; `prisma/migrations/` records ordered schema changes. |
| `@wonflow/mock-data` (`packages/mock-data/`) | Deterministic fictional data, scenario seeds, in-memory repositories, and service adapters for demonstrations and tests. It is not for production runtime use. |

Every package exposes its public API through `src/index.ts` where present. Keep internal implementation behind those exports. Shared packages must never depend on `apps/web` or another application.

## Supporting folders

| Path | Purpose |
| --- | --- |
| `tooling/typescript/` | Base, library, React-library, and Next.js TypeScript configurations extended by workspace packages. |
| `tooling/scripts/` | Root automation: environment checks, database seeding/backups, cleanup, runtime and scope audits, and demo checks. |
| `deploy/` | Docker Compose configuration and deployment instructions for the testing server. |
| `docs/architecture/` | System diagrams, architectural decisions, domain models, routes, data boundaries, and module-specific design docs. |
| `docs/foundation/` | Repository and platform-foundation documentation (including this file). |
| `docs/product/`, `docs/security/`, `docs/release/`, `docs/demo/`, `docs/design/` | Product scope, security contracts, release procedures, demo material, and visual standards. |
| `deferred/phase-two/` | Parked Phase 2 UI, routes, and library code. It is intentionally absent from `pnpm-workspace.yaml`, so it is not installed, tested, type-checked, or built in Phase 1. |

## Dependency direction

```text
Browser UI / Next.js routes
          |
          v
Web feature components and lib helpers
          |
          v
Web server services and API handlers
          |
          v
contracts + validation + config + database
                 ^
        mock-data (demo/test only)
```

`ui`, `contracts`, `validation`, and `config` are safe shared dependencies for applications. `database` is server-only. `mock-data` is only for demonstrations/tests; `pnpm runtime:audit` checks that production runtime code does not use it.

## Where to make a change

| Change needed | Start here |
| --- | --- |
| Add or change a web page | `apps/web/src/app/` |
| Add an API endpoint | `apps/web/src/app/api/` and the corresponding `apps/web/src/server/` service |
| Add feature-specific UI | `apps/web/src/components/<feature>/` |
| Add reusable UI primitive | `packages/ui/src/components/` |
| Change business types shared across code | `packages/contracts/src/<domain>/` |
| Add request/form validation | `packages/validation/src/<domain>/` |
| Add a feature flag, module, portal, or navigation route | `packages/config/src/` |
| Change database tables or relations | `packages/database/prisma/schema.prisma`, then create a migration |
| Change development/demo records | `packages/mock-data/` or the relevant `tooling/scripts/seed-*.ts` script |
| Add a background job | `apps/worker/src/` |
| Update deployment | `deploy/` |

## Quality checks

Run these from the repository root:

```powershell
pnpm check        # lint, typecheck, database-schema validation, and diff check
pnpm test         # workspace unit tests
pnpm test:e2e     # Playwright end-to-end tests for the web application
pnpm build        # production web build
```
