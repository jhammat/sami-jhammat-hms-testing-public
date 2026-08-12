# @wonflow/web

The WonFlow product: a Next.js (App Router) application serving every portal —
platform administration, hospital admin, reception, doctor, patient,
laboratory, radiology, pharmacy, billing and management.

See the root [README](../../README.md) for setup, environment variables and
workspace-wide commands. This file covers how `src/` is organized.

## `src/app` — routes

Route groups map one-to-one to a portal and do not affect the URL:

| Route group | Portal | Entry route |
| --- | --- | --- |
| `(platform-admin)` | Platform administration | `/platform` |
| `(organization-admin)` | Hospital organization admin | `/admin` |
| `(organization-administration)` | Organization-level settings (branches, roles, services) | `/organization` |
| `(hospital-operations)` | Reception, appointments, diagnostics, pharmacy, billing | `/operations/*` |
| `(doctor-workspace)` | Doctor portal | `/doctor` |
| `(patient-access)` | Patient portal | `/patient` |
| `(public-booking)` | Unauthenticated public booking flow | `/book/*` |
| `(access)` | Sign-in, invitations | `/auth/*` |

`app/api` holds every HTTP route handler, mirrored under `v1/<domain>/...` to
match the service that backs it in `src/server`.

## `src/components` — UI, by domain

One folder per product domain (`reception`, `doctor`, `patients`, `patient`,
`diagnostics`, `pharmacy`, `billing`, `organization`, `platform`, `shell`,
`workflow`, …). Two pairs are intentionally similar-looking but distinct:

- `patient/` is the **patient's own portal** (booking, results, profile).
- `patients/` is **staff-facing** patient registration and directory
  (reception, doctor "My Patients").

If you are looking for one, check which side of the desk it serves.

## `src/server` — business logic

One folder per domain (`reception`, `doctor`, `admin`, `platform`, `finance`,
`diagnostics`, `scheduling`, `video-consultation`, `access`), each exporting a
`*Service` consumed by the matching `app/api` route handlers. `src/server/http`
holds the shared route-handler wrapper and error types.

## `src/lib` — client-side data and utilities

- `api/` — typed `fetch` wrappers per domain (`reception-api.ts`,
  `doctor-api.ts`, …) that call the real `app/api` routes.
- `data/` — the shared async-data-loading hook used across portals.
- `auth/`, `security/`, `config/`, `design/` — cross-cutting client utilities.
- `appointments/`, `clinical/`, `queue/`, `doctor-schedules/`,
  `doctor-sittings/`, `patients/` — **legacy browser-local demo data**
  (`localStorage`-backed). These predate the real database and are being
  replaced screen by screen with real API calls (see `lib/api`); new work
  should call the API, not add to these.

## Testing

```powershell
pnpm --filter @wonflow/web test          # Vitest — unit/integration, can import @wonflow/database directly
pnpm --filter @wonflow/web test:e2e      # Playwright — browser suite, real HTTP calls only (see tests/e2e/*)
```

Playwright specs run under a separate module pipeline from Vitest and cannot
import `@wonflow/database`; use the real HTTP API for setup, actions and
teardown in `tests/e2e/*.spec.ts`.
