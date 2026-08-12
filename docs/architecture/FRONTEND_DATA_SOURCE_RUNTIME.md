# WonFlow Frontend Data-Source Runtime

## Document Status

```text
Task: WF-046
Area: Shared Frontend Foundation
Status: Approved frontend runtime baseline
```

## Purpose

The frontend data runtime gives WonFlow one controlled location for selecting
and creating the current data service.

```text
Application configuration
→ Data-source runtime
→ Selected service adapter
→ Portal components
```

## Current Demo Flow

```text
WonFlow frontend
→ Mock data mode
→ Mock hospital service
→ Asynchronous adapter
→ In-memory repositories
→ Deterministic fictional dataset
```

## Future Production Flow

```text
WonFlow frontend
→ API data mode
→ Production API adapter
→ Authentication and authorization
→ Backend domain services
→ PostgreSQL
```

## Runtime Responsibilities

The runtime is responsible for:

- Reading the resolved application configuration
- Selecting mock or API mode
- Selecting the configured demonstration scenario
- Creating the selected service adapter
- Reusing one runtime instance
- Clearly identifying fictional data
- Preventing unsafe silent fallbacks

## Runtime Exclusions

The runtime does not perform:

- Authentication
- Authorization
- Database access
- Clinical decisions
- Financial calculations
- React rendering
- Permanent browser storage
- Production API calls

## One Runtime Instance

The frontend should reuse one runtime for the active configuration.

This prevents every page from independently creating:

- A separate dataset
- Different patients
- Different appointment states
- Different loading behaviour
- Unconnected repository instances

## Runtime Cache Key

The runtime is recreated when meaningful configuration changes, including:

- Deployment environment
- Data mode
- Demo scenario
- Demo-data feature status

## Mock Mode

Mock mode requires:

```text
application.dataMode = mock
featureFlags.demoData = true
```

The runtime creates the configured scenario:

- `hospital-day`
- `busy-opd`
- `inpatient-focus`

The resulting records are always fictional.

## API Mode

API mode does not silently fall back to demonstration data.

Until the production API adapter is implemented, selecting API mode produces:

```text
api-adapter-not-implemented
```

This protects the platform from appearing operational while using unexpected
mock records.

## Runtime Errors

Controlled runtime errors include:

- `mock-data-disabled`
- `api-adapter-not-implemented`
- `invalid-configuration`

Screens may later convert these into safe user-facing error states.

## Portal Usage Rule

Portal components should request data through the selected service.

They should not:

- Import fixture arrays directly
- Generate independent datasets
- Search raw mock arrays
- Read PostgreSQL
- Decide authorization
- Silently switch between mock and production data

## Fictional Data Banner

When the runtime reports:

```text
fictional: true
```

the interface should display an obvious warning such as:

```text
DEMO — Fictional Patient Data
```

This visual banner will be implemented during the portal-shell work.

## Loading Behaviour

The mock runtime uses a short controlled delay.

This lets the frontend demonstrate:

- Loading states
- Skeletons
- Request cancellation
- Empty states
- Error states

Normal demonstration failure simulation remains disabled.

## Production Replacement

The production adapter will later provide matching frontend operations for:

- Dashboard summaries
- Patients
- Practitioners
- Appointments
- Queues
- Admissions
- Invoices
- Patient overviews

The adapter will call controlled backend APIs rather than local repositories.

## Safety Rules

1. The current data mode is explicit.
2. Mock data requires the demo-data feature flag.
3. API mode never silently falls back to mock mode.
4. One runtime instance is reused for one configuration.
5. Scenario changes recreate the runtime.
6. Every mock runtime identifies itself as fictional.
7. Portal components do not create datasets directly.
8. Production authorization remains a backend responsibility.
9. Mock services do not establish production readiness.
10. Runtime errors use controlled codes.

## Locked Decisions

1. Data-source selection is centralized.
2. Application configuration controls data mode.
3. Demo scenario selection is part of resolved app configuration.
4. Mock mode uses the asynchronous hospital service.
5. The runtime caches one service instance.
6. Controlled reset is supported.
7. API mode remains deliberately unavailable until backend implementation.
8. Silent mock fallback is forbidden.
9. Portal components use the runtime service.
10. Fictional-data status remains visible to the interface.

## Acceptance Checklist

- [x] Frontend data runtime created
- [x] Mock hospital service connected
- [x] Application demo scenario exposed
- [x] Data-mode selection implemented
- [x] Runtime caching implemented
- [x] Scenario-based cache invalidation implemented
- [x] Controlled runtime reset implemented
- [x] Fictional-data status exposed
- [x] Mock-disabled error defined
- [x] API-not-implemented error defined
- [x] Silent fallback prevented
- [x] Public frontend export created
- [x] Production replacement boundary documented