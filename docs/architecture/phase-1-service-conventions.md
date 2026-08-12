# WonFlow Phase 1 Service Conventions

## Required flow

```text
Page or API
  -> validation
  -> trusted request context
  -> application service
  -> repository interface
  -> database repository
```

## Services

A service:

- Checks permission
- Validates tenant and branch context
- Applies business rules
- Owns the transaction
- Writes audit data
- Creates outbox events when needed
- Returns a typed result

## Repositories

A repository:

- Always receives trusted tenant context
- Filters tenant-owned records by tenant ID
- Filters branch-owned records by authorized branch
- Does not send notifications
- Does not make UI decisions
- Does not fabricate empty data

## Required pattern

```typescript
export interface PatientRepository {
  findById(
    context: WonFlowTenantRequestContext,
    patientId: string,
  ): Promise<PatientRecord | null>;
}
```

Forbidden:

```typescript
findPatientById(patientId);
```

## Commands

Commands change durable state.

Examples:

```text
RegisterPatientCommand
BookAppointmentCommand
CheckInPatientCommand
SignEncounterCommand
ReleaseLaboratoryResultCommand
DispensePrescriptionCommand
ReceivePaymentCommand
```

## Queries

Queries do not change durable state.

Examples:

```text
SearchPatientsQuery
GetDoctorQueueQuery
GetPatientSummaryQuery
GetInvoiceDetailsQuery
```

## Transactions

Application services start transactions.

Repositories receive the active transaction.

## Idempotency

Require idempotency for:

- Patient registration through retryable channels
- Appointment booking
- Check-in
- Payment receipt
- Refund
- Result release
- Prescription release
- Notification requests
- Mobile mutations

## Audit

Audit events include:

- Tenant ID
- Organization ID
- Branch ID where applicable
- User ID
- Session ID
- Request ID
- Action
- Entity type
- Entity ID
- Timestamp
- Reason for high-risk actions
- Source application

Do not store passwords, tokens or secrets in audit metadata.
