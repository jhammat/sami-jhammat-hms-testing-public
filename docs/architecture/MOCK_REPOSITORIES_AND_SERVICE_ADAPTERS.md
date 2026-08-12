# WonFlow Mock Repositories and Service Adapters

## Document Status

```text
Task: WF-045
Package: @wonflow/mock-data
Status: Approved service-adapter baseline
```

## Purpose

This architecture separates frontend components from raw demonstration arrays.

```text
Portal component
→ Service interface
→ Asynchronous adapter
→ Repository
→ Fictional dataset
```

## Repository Responsibility

Repositories provide controlled access to in-memory records.

They support:

- Lookup by identifier
- Filtering
- Sorting
- Pagination
- Counting
- Safe record copies

Repositories do not provide:

- React state
- Network requests
- Authentication
- Database writes
- Production persistence

## Immutable Fixture Protection

The repository clones input fixtures when it is created.

It also returns cloned records.

This prevents a screen from accidentally changing the shared source dataset.

## Service Responsibility

The mock hospital service provides frontend-oriented operations for:

- Organizations
- Branches
- Dashboard summaries
- Patients
- Practitioners
- Appointments
- Queues
- Admissions
- Invoices
- Patient overview

Frontend components should normally use the service rather than repository
objects directly.

## Asynchronous Behaviour

Mock service calls return promises.

Artificial latency allows the frontend to demonstrate:

- Loading indicators
- Skeleton interfaces
- Disabled actions
- Request cancellation
- Error handling
- Empty states

## Request Cancellation

The service accepts `AbortSignal`.

When a user:

- Changes pages
- Changes filters
- Leaves a screen
- Starts a newer search

the previous request may be cancelled.

Cancellation returns the controlled error code:

```text
aborted
```

## Controlled Errors

The mock adapter can simulate failures during development.

Possible service error codes include:

- `aborted`
- `not-found`
- `invalid-query`
- `simulated-failure`

The normal demonstration failure rate remains zero.

## Pagination

Repository pages contain:

- Items
- Total item count
- Offset
- Limit
- Previous-page indicator
- Next-page indicator

This allows frontend tables to behave similarly in mock and API modes.

## Search

Search is currently a lightweight in-memory demonstration operation.

It supports common patient and operational fields such as:

- Display name
- MR number
- Phone
- Email
- City
- Appointment number
- Service name
- Admission number
- Ward
- Invoice number

Production search will use secure backend search services.

## Dashboard Summary

The dashboard service calculates:

- Total patients
- Total practitioners
- Today’s appointments
- Waiting queue entries
- Active admissions
- Outstanding invoice balance

Financial values continue to use integer minor units and the explicit currency
code.

## Patient Overview

The patient-overview operation combines:

```text
Patient
├── Appointments
├── Queue entries
├── Admissions
└── Invoices
```

This is a frontend projection, not a replacement for the full clinical record.

## Production Replacement

The future production service may implement the same frontend-facing
capabilities through:

```text
Frontend
→ API adapter
→ Authentication and authorization
→ Domain services
→ PostgreSQL
```

The portal should not need to know whether the selected adapter uses mock data
or backend APIs.

## Safety Rules

1. Components do not mutate fixture arrays.
2. Repositories return cloned records.
3. Mock operations are asynchronous.
4. Loading and error states must be visible.
5. Stale requests may be cancelled.
6. Simulated failures remain disabled in ordinary demonstrations.
7. Mock service errors use controlled codes.
8. Patient lookups return an explicit not-found error.
9. Pagination limits remain controlled.
10. Mock services never claim production authorization.
11. Mock services never access real patient data.
12. Production APIs will enforce authorization independently.

## Locked Decisions

1. Raw fixture arrays are hidden behind repositories.
2. Frontends use service adapters.
3. Repositories remain synchronous and in-memory.
4. Service adapters expose asynchronous promises.
5. AbortSignal cancellation is supported.
6. Artificial latency is deterministic.
7. Controlled failure simulation is available.
8. Original fixtures are protected through cloning.
9. Patient, practitioner and operational searches are supported.
10. Pagination uses shared repository pages.
11. Patient-overview projections are supported.
12. Mock and production adapters will remain interchangeable at the portal layer.
13. Production authorization is not simulated as a security control.
14. Complete demo data remains fictional.

## Acceptance Checklist

- [x] Generic repository contract created
- [x] In-memory repository created
- [x] Filtering supported
- [x] Sorting supported
- [x] Pagination supported
- [x] Fixture cloning implemented
- [x] Dataset repositories created
- [x] Asynchronous adapter created
- [x] Artificial latency supported
- [x] AbortSignal cancellation supported
- [x] Controlled failures supported
- [x] Service-error codes defined
- [x] Dashboard service created
- [x] Patient service created
- [x] Practitioner service created
- [x] Appointment service created
- [x] Queue service created
- [x] Admission service created
- [x] Invoice service created
- [x] Patient-overview service created
- [x] Package exports updated
- [x] Package README updated
- [x] Production replacement boundary documented