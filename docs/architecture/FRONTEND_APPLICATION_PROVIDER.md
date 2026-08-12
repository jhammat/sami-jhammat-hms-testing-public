# WonFlow Frontend Application Provider

## Document Status

```text
Task: WF-047
Area: Shared Frontend Foundation
Status: Approved provider baseline
```

## Purpose

The WonFlow application provider makes shared application services available
to every role-specific portal.

```text
Root layout
→ Application provider
→ Configuration
→ Data runtime
→ Hospital service
→ Portal components
```

## Provider Responsibilities

The provider exposes:

- Resolved public application configuration
- Selected frontend data runtime
- Hospital read service
- Deployment environment
- Interface locale
- Fictional-data status
- Demonstration scenario

## Server and Client Boundary

The root layout is a server component.

It resolves public-safe environment configuration and passes the resulting
serializable configuration into the client provider.

```text
Server environment variables
→ Safe configuration selection
→ Runtime validation
→ Serializable configuration
→ Client application provider
```

The complete `process.env` object is never passed into the browser.

## Secret Protection

The provider does not receive:

- Database URLs
- Session secrets
- Encryption keys
- SMTP passwords
- Object-storage secrets
- Private API credentials

Only browser-safe application settings reach client components.

## One Shared Runtime

The provider uses the frontend data runtime created during WF-046.

One runtime instance provides:

- One deterministic dataset
- One selected scenario
- One hospital service
- Consistent records across portals

Without this rule, separate screens could accidentally create different
patients and appointments.

## Application Context

The shared context exposes:

```text
configuration
runtime
hospitalService
environment
locale
fictionalData
demoScenario
```

## Approved Hooks

Portal components may use:

```text
useWonFlowApplication
useWonFlowConfiguration
useWonFlowDataRuntime
useWonFlowHospitalService
useWonFlowEnvironment
useWonFlowLocale
useWonFlowIsDemo
```

## Provider Requirement

Hooks must only be used beneath:

```text
WonFlowApplicationProvider
```

Calling them outside the provider produces a clear development error.

## Service Access

Frontend screens should access hospital records through:

```text
useWonFlowHospitalService()
```

They should not:

- Generate datasets directly
- Instantiate repositories
- Search fixture arrays
- Read environment secrets
- Connect to PostgreSQL
- Select mock versus API mode independently

## Request Cancellation

Components should create an `AbortController` for asynchronous operations.

```text
Component mounted
→ Request starts
→ Component unmounts
→ Request cancelled
```

This prevents stale requests from updating screens that are no longer active.

## Fictional-Data Awareness

The provider exposes:

```text
fictionalData: true
```

during the demonstration stage.

Portal shells will use this value to display:

```text
DEMO — Fictional Patient Data
```

## Localization

The provider exposes the configured locale.

Current supported values are:

- English
- Urdu

Full translation and right-to-left rendering will be connected in later
frontend tasks.

## Production Transition

During production API implementation:

```text
Mock hospital service
→ Replaced by API hospital service
```

Portal components should continue using the same provider-facing service
boundary.

## Safety Rules

1. Public configuration is resolved on the server.
2. Server secrets never enter provider props.
3. Configuration is validated before provider creation.
4. One data runtime is shared throughout the application.
5. Portal components use provider hooks.
6. Components do not instantiate datasets independently.
7. Data mode is selected centrally.
8. Fictional-data status remains accessible.
9. Requests support cancellation.
10. Production authorization remains a backend responsibility.

## Locked Decisions

1. The provider is mounted in the root layout.
2. The root layout resolves public application configuration.
3. The provider is a client component.
4. Configuration props remain serializable.
5. One frontend data runtime is reused.
6. Hospital service access is centralized.
7. Specialized hooks provide clear access patterns.
8. Hooks throw when used outside the provider.
9. Demo scenario and fictional status are exposed.
10. Server secrets remain unavailable to client components.

## Acceptance Checklist

- [x] Server-side public configuration resolver created
- [x] Client application provider created
- [x] Application context created
- [x] Frontend data runtime connected
- [x] Hospital service exposed
- [x] Deployment environment exposed
- [x] Locale exposed
- [x] Fictional-data status exposed
- [x] Demo scenario exposed
- [x] Specialized provider hooks created
- [x] Provider misuse error created
- [x] Provider mounted in root layout
- [x] Secret separation documented
- [x] Production replacement boundary documented