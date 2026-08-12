# WonFlow Phase 1 Application Boundaries

## Web application

`apps/web` owns:

- Server-rendered pages
- Client interfaces
- Route handlers
- Session-cookie handling
- Request parsing
- Response formatting
- Calling application services

React components must not directly use Prisma.

## Patient mobile

`apps/patient-mobile` owns:

- Patient Android interface
- Secure device authentication
- Appointment and record views
- Push notifications
- Mobile offline and error states

It must not duplicate server business rules.

## Doctor mobile

`apps/doctor-mobile` owns:

- Doctor Android interface
- Queue and schedule
- Mobile consultation workflows
- Orders and prescriptions
- Results and availability
- Secure local-device behavior

It must not be a desktop WebView.

## Contracts

`packages/contracts` owns:

- Shared identifiers
- Request and response contracts
- Permission codes
- Tenant request context
- Domain event contracts

It must not contain React, Prisma or provider logic.

## Validation

`packages/validation` owns:

- Zod schemas
- API input validation
- Form validation contracts
- Output validation where required

## Database

`packages/database` owns:

- Prisma schema
- Migrations
- Database client
- Transaction manager
- Tenant-safe database utilities
- Health checks

## Domain and application services

Phase 1 backend code should use:

```text
packages/domain
packages/application
packages/repositories
packages/integrations
```

These packages may be created during backend tasks.

## Shared UI

`packages/ui` owns portal-neutral interface primitives.

Portal-specific screens remain inside the owning application.

## Mock data

`packages/mock-data` may be used for:

- Automated tests
- Explicit local demonstration
- Isolated UI development

It must not be used by the production runtime.

## Dependency direction

Allowed:

```text
UI -> API/contracts
HTTP adapter -> application service
Application service -> domain and repositories
Repository -> database
Worker -> application service
Integration adapter -> external provider
```

Forbidden:

```text
React component -> Prisma
Domain -> Next.js
Mobile app -> database
Production API -> mock-data
Tenant repository -> identifier-only query
```

## Reception rule

Internal refactoring may split Reception components, but it must not alter
the approved visual design.
