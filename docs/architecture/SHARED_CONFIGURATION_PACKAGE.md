# WonFlow Shared Configuration Package

## Document Status

```text
Task: WF-044
Package: @wonflow/config
Status: Approved configuration baseline
```

## Purpose

The package provides one controlled configuration system for every WonFlow
application and future backend service.

## Configuration Flow

```text
Environment variables
→ Runtime validation
→ Safe configuration object
→ Feature flags
→ Portal availability
→ Application behaviour
```

## Public and Server Separation

```text
Public configuration
= Values that may be visible in browser code

Server configuration
= Private infrastructure and security values
```

Server-only information includes:

- Database URLs
- Session secrets
- Encryption keys
- Redis credentials
- Object-storage credentials
- Email credentials
- External-provider credentials

## Supported Environments

WonFlow recognizes:

- Development
- Test
- Staging
- Pilot
- Production

## Environment Meaning

### Development

Used for local engineering.

Mock data is allowed.

### Test

Used for automated testing.

Test-specific data and services may be used.

### Staging

Used for integration and acceptance testing.

It should resemble production but must not be mistaken for production.

### Pilot

Used for controlled hospital validation.

Mock data is disabled.

### Production

Used only after security, testing and release approval.

Mock data is disabled and HTTPS is required.

## Data Modes

```text
mock
= Fictional deterministic records

api
= Backend API records
```

Pilot and production environments cannot use mock mode.

## Feature Flags

Feature flags control:

- Portals
- Patient Access
- Progressive Web App support
- Demo data
- Backend API mode
- Real-time updates
- Localization
- Android packaging

Feature flags improve controlled delivery but do not replace authorization.

## Portal Registry

The configuration package defines:

- Platform Administration
- Organization Administration
- Hospital Operations
- Doctor Workspace
- Management Portal
- Patient Access

Each portal has:

- Code
- Name
- Description
- Route prefix
- Intended users
- Required feature flag
- Audience classification

## Environment Banner

Development, test, staging and demo interfaces should display a visible
environment banner when configured.

Examples:

```text
DEMO — Fictional Patient Data

STAGING — Not For Clinical Use
```

This reduces the risk of users confusing demonstrations with production.

## Secret Rules

1. Secrets must never use `NEXT_PUBLIC_`.
2. Real secrets must not be stored in `.env.example`.
3. Real `.env.local` files must not be shared publicly.
4. Pilot and production secrets must be independently generated.
5. Session and encryption secrets require sufficient length.
6. Secret values must not be printed into logs.
7. Secret rotation must be supported before production.
8. Environment variables do not replace a production secrets manager.

## Object Storage

Object-storage variables are treated as one configuration group:

- Endpoint
- Bucket
- Access key
- Secret key

Partial configuration is rejected.

## SMTP

When an SMTP host is configured, the port must also be provided.

Provider-specific settings can be added through later controlled decisions.

## Environment Compatibility

The public application and backend server must agree on:

- Deployment environment
- Mock-data permission
- Data mode

A mismatch must stop startup rather than silently running with unsafe settings.

## Configuration Ownership

The configuration package owns:

- Schemas
- Environment parsing
- Feature definitions
- Portal definitions
- Safe configuration construction

It does not own:

- Authentication implementation
- Database clients
- Secrets storage
- UI rendering
- Network requests
- Production infrastructure deployment

## Locked Decisions

1. Runtime environment values are validated.
2. Public and server environments remain separate.
3. Browser-visible variables use `NEXT_PUBLIC_`.
4. Secrets never use public prefixes.
5. WonFlow distinguishes development, test, staging, pilot and production.
6. Mock mode is blocked in pilot and production.
7. Production URLs require HTTPS.
8. Portal definitions are centralized.
9. Feature flags are centralized.
10. Feature flags do not replace authorization.
11. Object-storage configuration is validated as a group.
12. Environment mismatches stop startup.
13. Example secrets remain placeholders.
14. Android packaging remains disabled until the approved mobile stage.
15. The configuration audit runs before task completion.

## Acceptance Checklist

- [x] Configuration package metadata defined
- [x] Strict TypeScript configuration created
- [x] Configuration types defined
- [x] Public environment schema defined
- [x] Server environment schema defined
- [x] Boolean environment normalization defined
- [x] Production HTTPS rule defined
- [x] Mock-data production restriction defined
- [x] Secret placeholder protection defined
- [x] Object-storage validation defined
- [x] SMTP validation defined
- [x] Feature-flag registry defined
- [x] Portal registry defined
- [x] Runtime app configuration builder defined
- [x] Environment compatibility checking defined
- [x] Safe `.env.example` created
- [x] Automated configuration audit created
- [x] Package exports finalized
- [x] Package documentation created