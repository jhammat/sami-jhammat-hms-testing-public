# WonFlow

WonFlow is a configurable, multi-organization and multi-branch hospital
management and patient-care platform.

It connects hospital administration, reception, doctors, diagnostics, pharmacy,
billing, management and patients through one shared system.

## Phase 1 scope

This repository builds the **Phase 1** release. Phase 1 is backed by PostgreSQL,
real authentication and tenant isolation, and is covered end to end by an
automated browser suite.

Shipping in Phase 1:

| Portal | Entry route |
| --- | --- |
| Platform administration | `/platform` |
| Hospital organization admin | `/admin` |
| Reception and patient registration | `/operations/reception` |
| Appointments | `/operations/appointments` |
| Doctor workspace | `/doctor` |
| Patient access | `/patient` |
| Laboratory | `/operations/laboratory` |
| Radiology | `/operations/radiology` |
| Pharmacy | `/operations/pharmacy` |
| Billing | `/operations/billing` |
| Management | `/management` |
| Video consultation | `/patient/appointments/[id]/video` |

Deferred to Phase 2 and parked in [`deferred/phase-two/`](deferred/phase-two):
inpatient wards, nursing, operation theatre, CSSD, insurance, blood bank and the
reception/doctor queue screens. See that folder's README for how to restore one.

The authoritative list of deferred module codes is `disabledModuleCodes` on
`WONFLOW_PHASE_ONE_PROFILE` in `packages/config/src/feature-flags.ts`.

## Repository layout

```
apps/
  web/             Next.js App Router application (the product)
  worker/          background job runner
  mobile/          Android/iOS wrapper around the web app (every role, one app)
  doctor-mobile/   early native-screen scaffold, unfinished, superseded by mobile/
  patient-mobile/  early native-screen scaffold, unfinished, superseded by mobile/
packages/
  ui/              shared components, styles and design-system utilities
  contracts/       shared TypeScript domain and API contracts
  validation/      shared validation schemas
  config/          application, module and feature-flag configuration
  database/        PostgreSQL and Prisma implementation
  mock-data/       demonstration data and mock service adapters
tooling/
  typescript/      shared TypeScript configurations
  scripts/         cross-platform development and audit scripts
deferred/
  phase-two/       modules excluded from the Phase 1 release
deploy/            Docker Compose deployment for the testing server
docs/              architecture, product, security and release documentation
```

`pnpm-workspace.yaml` includes `apps/*`, `packages/*` and `tooling/*`.
`deferred/` is deliberately outside the workspace, so it is never installed,
built, type-checked or linted.

## Requirements

- Node.js >= 22.13.0
- pnpm >= 10
- PostgreSQL 16

## Getting started

```bash
pnpm install
cp .env.example .env.local     # then fill in DATABASE_URL, SESSION_SECRET and AUTH_ENCRYPTION_KEY
pnpm run doctor                # verify Node, pnpm, PostgreSQL and env vars are ready
pnpm db:generate
pnpm db:migrate
pnpm db:seed:dev
pnpm dev
```

The application runs on http://localhost:3000.

Need a database? `deploy/docker-compose.yml` includes a `postgres:16-alpine`
service:

```bash
docker compose -f deploy/docker-compose.yml up -d
```

`pnpm run doctor` is a preflight check for a fresh clone. It checks the Node.js
and pnpm versions, whether PostgreSQL is reachable at `DATABASE_URL`, and
whether `.env.local` has the required variables, then prints what is missing.
Use `pnpm run doctor`, not `pnpm doctor` — pnpm reserves the bare `doctor`
subcommand for its own environment diagnostics, which silently ignores this
project's script.

### Development logins

`pnpm db:seed:dev` provisions one sign-in per workspace and prints the table.
Every account uses the same development password.

| Workspace | Email |
| --- | --- |
| Platform | `platform@wonflow.local` |
| Admin | `admin@wonflow.local` |
| Reception | `reception@wonflow.local` |
| Doctor | `doctor@wonflow.local` |
| Patient | `patient@wonflow.local` |
| Laboratory | `laboratory@wonflow.local` |
| Radiology | `radiology@wonflow.local` |
| Pharmacy | `pharmacy@wonflow.local` |
| Billing | `billing@wonflow.local` |
| Management | `management@wonflow.local` |

These are development-only records. New installations start without them.

## Commands

Run everything from the repository root.

### Develop

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the web application |
| `pnpm worker:dev` | Start the background worker |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm clean` | Remove generated build files |

### Verify

| Command | Description |
| --- | --- |
| `pnpm run doctor` | Preflight: Node/pnpm versions, PostgreSQL reachability, required env vars |
| `pnpm check` | Lint, typecheck, validate the schema and check the diff |
| `pnpm check:full` | `pnpm check` plus a production build |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm typecheck` | TypeScript across every workspace. Never halts on the first failing package; runs all of them and reports a summary. |

### Test

| Command | Description |
| --- | --- |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:coverage` | Unit tests with coverage |
| `pnpm test:e2e` | End-to-end browser tests (Playwright) |

`pnpm test:e2e` reseeds the development dataset, starts the dev server and runs
every suite against desktop Chrome and mobile Chrome.

### Database

| Command | Description |
| --- | --- |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:validate` | Validate the schema |
| `pnpm db:format` | Format the schema |
| `pnpm db:migrate` | Create and apply a development migration |
| `pnpm db:deploy` | Apply migrations (non-interactive) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed:dev` | Seed the development dataset and logins |
| `pnpm db:backup` | Back up the database |

### Audit

| Command | Description |
| --- | --- |
| `pnpm runtime:audit` | Fail if runtime code imports `@wonflow/mock-data` |
| `pnpm phase:audit` | Fail if Phase 1 code references deferred Phase 2 modules |
| `pnpm demo:genericity` | Genericity audit |
| `pnpm demo:gate` | Demonstration gate |

## Deployment

See [`deploy/README.md`](deploy/README.md) for the Docker deployment.

## Documentation

- `docs/product/v1-release-scope.md`
- `docs/architecture/canonical-routes.md`
- `docs/architecture/application-boundaries.md`
- `docs/architecture/repository-service-conventions.md`

## Technology

TypeScript, React, Next.js App Router, Tailwind CSS, shadcn-style components,
PostgreSQL, Prisma, Zod, Vitest, Playwright, pnpm workspaces.

## Data

All user data lives in PostgreSQL and is reached through an API route.
Client storage (`localStorage`, `sessionStorage`, `document.cookie`) is for
interface preference only — never for patient, clinical, billing or any
other business data. See
[`docs/architecture/client-storage.md`](docs/architecture/client-storage.md)
for how this is enforced.

## Production-readiness rule

A screen is not production-ready merely because it renders. Completion requires
durable persistence, server-side validation, authorization, tenant isolation,
audit behaviour, error handling, automated tests and operational monitoring.

## Development rules

- Keep workflows service-driven and configuration-first.
- Use the shared packages instead of duplicating code.
- New installations must begin without fictional operational records.
- Do not mark work complete without verification.
