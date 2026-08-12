# WonFlow Production Application Boundaries

## Purpose

This document defines where code belongs and prevents frontend pages,
database access, background work, and integrations from becoming mixed
together.

## Applications

### `apps/web`

Responsibilities:

- Web user interface
- Server-rendered pages
- Route handlers acting as HTTP adapters
- Authentication cookie handling
- Input parsing
- Calling application services
- Returning safe HTTP responses

Must not contain:

- Direct business rules inside React components
- Direct Prisma access inside React components
- Hard-coded hospital records
- Plaintext credentials
- Long-running jobs
- Provider-specific integration logic

### `apps/api`

Create this application when the production API is separated from the
web runtime.

Responsibilities:

- Versioned API endpoints
- Mobile API
- Web API
- Authentication endpoints
- Request context
- Validation
- Service invocation
- Rate limiting
- Error mapping
- OpenAPI generation

### `apps/worker`

Responsibilities:

- Notification delivery
- Document processing
- Virus-scan coordination
- Scheduled jobs
- Appointment reminders
- Report generation
- Integration retries
- Outbox processing
- Dead-letter processing

A worker must never process a job without tenant context.

### `apps/patient-mobile`

Responsibilities:

- Patient Android interface
- Secure authentication
- Appointment booking and management
- Tokens and queue
- Prescriptions
- Laboratory results
- Radiology reports
- Documents
- Notifications
- Profile and preferences
- Secure device storage
- Offline and error states

The patient app must not duplicate backend business rules.

### `apps/doctor-mobile`

Responsibilities:

- Doctor Android interface
- Dashboard
- Queue
- Appointments
- Patient summary
- Clinical drafts
- Prescriptions
- Orders
- Results
- Follow-up
- Availability
- Secure device storage

The doctor app must not be a desktop WebView.

## Packages

### `packages/contracts`

Responsibilities:

- Stable TypeScript contracts
- Request and response shapes
- Domain identifiers
- Enums
- Cross-application event contracts
- Tenant request context

Must not contain:

- Database clients
- React components
- Network calls
- Secrets

### `packages/validation`

Responsibilities:

- Zod schemas
- Input validation
- Output validation where required
- Form and API validation contracts

### `packages/database`

Responsibilities:

- Prisma schema
- Migrations
- Database client
- Transaction helpers
- Tenant-safe repository utilities
- Database health checks

Only repository implementations may use the raw database client.

### `packages/domain`

Responsibilities:

- Domain entities
- Invariants
- State transitions
- Domain errors
- Pure business rules

Domain code must not depend on Next.js, React, Prisma, Redis, SMTP, or
object-storage providers.

### `packages/application`

Responsibilities:

- Use cases
- Service interfaces
- Transaction coordination
- Permission requirements
- Idempotency orchestration
- Domain event creation

### `packages/repositories`

Responsibilities:

- Repository interfaces
- Production repository implementations
- In-memory implementations for tests only

### `packages/integrations`

Responsibilities:

- Email provider
- SMS provider
- Push provider
- Object storage
- Payment provider
- LIS/RIS adapters
- External system clients

Each integration must be behind an interface.

### `packages/ui`

Responsibilities:

- Portal-neutral UI primitives
- Accessibility behavior
- Loading states
- Empty states
- Form controls
- Layout components

It must not contain hospital-specific records.

### `packages/config`

Responsibilities:

- Feature definitions
- Portal definitions
- Environment parsing
- Safe public configuration
- Server-only configuration boundaries

### `packages/mock-data`

Allowed uses:

- Automated tests
- Storybook or isolated UI development
- Explicit local demonstrations

Forbidden uses:

- Production runtime
- Production API responses
- Real hospital operations
- Authentication
- Production builds

## Dependency direction

Allowed:

```text
UI -> API client/contracts
HTTP adapter -> application service
Application service -> domain + repository interfaces
Repository implementation -> database
Integration implementation -> external provider
Worker -> application service
```

Forbidden:

```text
React component -> Prisma
Domain -> Next.js
Domain -> external provider
Database -> UI
Mobile app -> database
Public API -> mock-data runtime
```

## Transaction boundary

A single application service owns each transaction.

Examples:

- Booking an appointment
- Registering a patient
- Signing an encounter
- Releasing a result
- Dispensing medication
- Receiving a payment
- Approving support access

The user interface must never coordinate a multi-step business
transaction through unrelated direct database calls.

## Error boundary

Every application service returns a known result or throws a typed
application error.

HTTP and mobile adapters translate application errors into safe
responses without exposing stack traces, SQL, secrets, or internal
provider details.
