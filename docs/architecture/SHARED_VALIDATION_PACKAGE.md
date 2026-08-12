# WonFlow Shared Validation Package

## Document Status

```text
Task: WF-042
Package: @wonflow/validation
Status: Approved validation baseline
```

## Purpose

The shared validation package provides reusable runtime validation for every
WonFlow portal and future backend service.

## Validation Flow

```text
Unknown input
→ Schema validation
→ Normalized typed result
or
→ Structured field-level issues
```

## Validation Boundaries

Validation may occur at:

- Form entry
- Route parameters
- Search parameters
- API entry
- Import entry
- External integration entry
- Background-job entry
- Configuration loading
- Database-write preparation

## Validation and TypeScript

TypeScript provides compile-time checking.

Runtime validation is still required because information may come from:

- Browsers
- Mobile applications
- External APIs
- Imported files
- URL queries
- Existing databases
- Background queues
- User-edited configuration

## Validation and Authorization

```text
Validation:
Is the request structurally valid?

Authorization:
May this user perform this action?
```

Valid data may still be unauthorized.

Both controls are required.

## Validation and Database Constraints

```text
Validation:
Reject invalid data before database operations

Database constraints:
Protect the authoritative stored data
```

Application validation does not replace:

- Unique constraints
- Foreign keys
- Check constraints
- Transactions
- Concurrency protection
- Tenant isolation

## Shared Primitive Schemas

The package defines reusable schemas for:

- WonFlow identifiers
- Codes
- Idempotency keys
- ISO dates
- ISO date-times
- Short and long text
- Reasons
- Search text
- Languages
- Integers
- Percentages
- Record versions

## Context Validation

Request context may contain:

- Request identity
- Correlation identity
- Organization
- Branch
- Department
- Operational unit
- Service point
- User
- Practitioner
- Roles
- Locale
- Request time

The backend must derive or verify protected context rather than trusting
client-provided values blindly.

## Date-Range Validation

Date ranges enforce:

```text
End date ≥ Start date
```

Date-time ranges enforce:

```text
Ending time > Starting time
```

These rules support:

- Appointments
- Schedules
- Admissions
- Theatre reservations
- Reports
- Search filters
- Staff shifts

## Pagination Validation

WonFlow supports:

- Page-based pagination
- Cursor-based pagination
- Search text
- Sorting
- Controlled page-size limits

Maximum limits protect performance and prevent accidental oversized requests.

## Financial Validation

Financial values use:

```text
Integer minor units
+
Three-letter currency code
```

Example structure:

```json
{
  "minorUnits": 12575,
  "currencyCode": "USD"
}
```

The validation package checks structure but does not calculate accounting
balances or authorize financial adjustments.

## Contact Validation

Contact validation supports:

- Names
- Email addresses
- Phone-number shape
- Country codes
- Postal addresses
- Preferred language

Phone validation checks a general acceptable shape.

Country-specific phone normalization will remain a separate controlled concern.

## Validation Results

Validation failures are converted into structured issues:

```text
Path
Field
Code
Message
```

Example:

```json
{
  "path": ["address", "city"],
  "field": "address.city",
  "code": "too_small",
  "message": "This field is required."
}
```

## Error Safety

Validation errors should not automatically include:

- Passwords
- Authentication tokens
- Complete medical histories
- Full clinical notes
- Payment credentials
- Private attachments

Logging must remain deliberate and privacy-aware.

## Domain-Specific Validation

This baseline contains shared primitives.

Later domain schemas may extend it for:

- Patient registration
- Appointment booking
- Consultation notes
- Prescriptions
- Laboratory orders
- Radiology orders
- Admission
- Nursing
- Surgery
- Billing
- Insurance claims

Domain validation must follow the contracts package rather than inventing
incompatible structures.

## Locked Decisions

1. Zod provides the shared runtime validation foundation.
2. Strict TypeScript remains enabled.
3. Frontend and backend may reuse the same schemas.
4. Backend validation remains authoritative.
5. Validation and authorization remain separate.
6. Validation and database constraints remain separate.
7. IDs are not restricted to UUIDs at the shared primitive level.
8. ISO date and date-time formats are required.
9. Date ranges validate chronological order.
10. Pagination limits are controlled.
11. Money uses integer minor units and explicit currency.
12. Validation errors use normalized field paths.
13. Sensitive input is not automatically logged.
14. Domain-specific schemas will extend this shared foundation.
15. The package contains no UI, database or network logic.

## Acceptance Checklist

- [x] Validation package metadata defined
- [x] Zod installed
- [x] Strict TypeScript configuration created
- [x] Identifier validation defined
- [x] Date and date-time validation defined
- [x] Text and reason validation defined
- [x] Tenant-context validation defined
- [x] Actor-context validation defined
- [x] Date-range validation defined
- [x] Pagination validation defined
- [x] Currency and money validation defined
- [x] Contact validation defined
- [x] Structured validation-result helper defined
- [x] Synchronous validation supported
- [x] Asynchronous validation supported
- [x] Public exports finalized
- [x] Package README created
- [x] Architecture rules documented