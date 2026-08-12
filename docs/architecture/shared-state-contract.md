# WonFlow Shared UI State Contract

Every data-backed screen must explicitly support:

1. Initial loading
2. Background refresh
3. Empty result
4. Not found
5. Permission denied
6. Recoverable error
7. Non-recoverable error
8. Successful data display

## Loading

Use the animated WonFlow W.

Do not introduce unrelated circular spinners.

Loading labels must describe the real operation, such as:

- Loading appointments
- Loading patient record
- Preparing laboratory worklist
- Loading invoice details

## Empty

Empty states must be truthful.

Examples:

- No appointments found
- No branches configured
- No laboratory results available
- No invoices found

Do not replace an empty result with demo or fictional data.

## Not found

Use not-found when a specific requested record does not exist or is no
longer available.

Not-found is different from an empty collection.

## Permission denied

Permission-denied states must not reveal whether inaccessible clinical,
financial, or tenant-owned records exist.

## Errors

Errors shown to users must not expose:

- SQL
- Stack traces
- Tokens
- Secrets
- Internal service URLs
- Provider credentials
- Cross-tenant identifiers

## Retry

A retry action appears only when the operation is safe to repeat.

Mutating operations require idempotency before automatic retries are
allowed.

## Critical states

Critical destructive or security-related events use deep red.

Ordinary validation messages do not use critical styling.
