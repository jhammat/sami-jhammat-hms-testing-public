# @wonflow/contracts

Shared TypeScript domain contracts for the WonFlow healthcare platform.

## Purpose

This package defines the common language used by:

- Platform Administration
- Organization Administration
- Hospital Operations
- Doctor Workspace
- Nursing and Inpatient Care
- Laboratory
- Radiology
- Pharmacy
- Finance and Insurance
- Management Reporting
- Patient Access
- Future backend services

## Approved Import

```ts
import type {
  PatientIdentity,
  Appointment,
  InpatientAdmission,
  SurgicalCase,
} from "@wonflow/contracts";
```

## Package Responsibilities

The package may contain:

- Type aliases
- Interfaces
- Enumerations represented by string unions
- Status-transition maps
- Event contracts
- Aggregate contracts
- Serializable constants
- Domain package metadata

## Package Exclusions

The package must not contain:

- React components
- CSS
- Database queries
- Prisma clients
- API calls
- HTTP clients
- Authentication secrets
- Environment variables
- Browser storage
- Node server startup code
- Hospital-specific production data
- Real patient data

## Contract Rules

1. Contracts must be serializable.
2. Date and time values use ISO date-time strings.
3. Identifiers use the shared WonFlow identifier type.
4. Money uses explicit currency and integer minor units.
5. Domain concepts that represent different events remain separate.
6. Signed clinical records are corrected through amendments.
7. Status transitions remain explicit.
8. Organization and branch context remain visible where required.
9. Generic exported names that may collide should use domain-specific prefixes.
10. Every public contract file must be exported by `src/index.ts`.

## Adding a New Contract File

When creating:

```text
src/example/new-contract.ts
```

also add:

```ts
export * from "./example/new-contract";
```

to:

```text
src/index.ts
```

Then run:

```powershell
pnpm --filter @wonflow/contracts check
```

## Verification

```powershell
pnpm --filter @wonflow/contracts audit:exports
pnpm --filter @wonflow/contracts typecheck
```

The complete WonFlow workspace can be checked with:

```powershell
pnpm check
```