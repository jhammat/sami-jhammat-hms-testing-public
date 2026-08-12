# @wonflow/validation

Shared runtime validation schemas and helpers for WonFlow.

## Purpose

TypeScript checks code during development, while this package validates
untrusted data at runtime.

It may validate:

- Forms
- URL parameters
- API requests
- API responses
- Imports
- External integrations
- Configuration
- Environment inputs
- Background-job payloads

## Approved Import

```ts
import {
  contactDetailsSchema,
  paginationQuerySchema,
  validateWithSchema,
} from "@wonflow/validation";
```

## Example

```ts
const result = validateWithSchema(
  paginationQuerySchema,
  {
    page: "1",
    pageSize: "25",
    sortDirection: "asc",
  },
);

if (!result.success) {
  console.log(result.issues);
} else {
  console.log(result.data);
}
```

## Package Responsibilities

This package may contain:

- Zod schemas
- Input normalization
- Cross-field validation
- Validation-result helpers
- Reusable validation messages
- Primitive schemas
- Request-context schemas

## Package Exclusions

It must not contain:

- React components
- API calls
- Database queries
- Prisma clients
- Authentication secrets
- Real patient data
- Hospital-specific production rules
- Direct user-interface state

## Validation Principles

1. All untrusted input is validated.
2. Frontend validation improves usability.
3. Backend validation remains authoritative.
4. Validation does not replace authorization.
5. Validation does not replace database constraints.
6. Financial values use integer minor units.
7. IDs must not be assumed to be UUIDs unless the domain requires it.
8. Cross-field rules use explicit refinements.
9. Validation errors use field paths.
10. Sensitive values should not be copied into logs.

## Verification

```powershell
pnpm --filter @wonflow/validation typecheck
pnpm --filter @wonflow/validation check
pnpm check
```