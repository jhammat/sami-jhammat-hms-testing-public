# WonFlow Repository and Service-Layer Conventions

## Core rule

User-interface components do not access the database directly.

All production data flows through:

```text
Page or API
  -> validated command/query
  -> application service
  -> repository interface
  -> production repository
  -> database
```

## Repository responsibilities

A repository:

- Loads and persists one domain aggregate or bounded collection
- Enforces tenant filtering
- Enforces branch filtering when applicable
- Uses database transactions supplied by the application service
- Returns domain-safe data
- Does not perform HTTP work
- Does not render user-interface state
- Does not send email or SMS

## Service responsibilities

An application service:

- Accepts a validated command or query
- Requires a trusted request context
- Checks required permissions
- Loads required data
- Applies business rules
- Coordinates one transaction
- Writes audit information
- Emits transactional outbox events
- Returns a typed result

## Naming

Commands use verbs:

```text
RegisterPatientCommand
BookAppointmentCommand
SignEncounterCommand
ReleaseLaboratoryResultCommand
ReceivePaymentCommand
```

Queries describe returned information:

```text
GetPatientSummaryQuery
SearchAppointmentsQuery
GetDoctorQueueQuery
GetInvoiceDetailsQuery
```

Services use explicit names:

```text
PatientRegistrationService
AppointmentBookingService
EncounterSigningService
LaboratoryResultReleaseService
PaymentReceiptService
```

Repositories use aggregate names:

```text
PatientRepository
AppointmentRepository
EncounterRepository
LaboratoryOrderRepository
InvoiceRepository
```

## Required repository method pattern

```typescript
export interface PatientRepository {
  findById(
    context: TenantRequestContext,
    patientId: string,
  ): Promise<PatientRecord | null>;

  search(
    context: TenantRequestContext,
    query: PatientSearchQuery,
  ): Promise<PatientSearchResult>;

  create(
    transaction: RepositoryTransaction,
    context: TenantRequestContext,
    patient: NewPatientRecord,
  ): Promise<PatientRecord>;

  update(
    transaction: RepositoryTransaction,
    context: TenantRequestContext,
    patient: PatientRecord,
  ): Promise<PatientRecord>;
}
```

## Required service pattern

```typescript
export class RegisterPatientService {
  constructor(
    private readonly patients: PatientRepository,
    private readonly audit: AuditRepository,
    private readonly transactions: TransactionManager,
  ) {}

  async execute(
    context: TenantRequestContext,
    command: RegisterPatientCommand,
  ): Promise<RegisterPatientResult> {
    requirePermission(
      context,
      "patients.manage",
    );

    return this.transactions.run(
      context,
      async (transaction) => {
        const patient = await this.patients.create(
          transaction,
          context,
          mapRegistrationToPatient(command),
        );

        await this.audit.record(
          transaction,
          context,
          {
            action: "patient.registered",
            entityType: "patient",
            entityId: patient.id,
          },
        );

        return {
          patient,
        };
      },
    );
  }
}
```

## Query and command separation

Queries:

- Do not change durable state
- May use optimized read models
- Must still enforce tenant, branch, and permission rules

Commands:

- Change durable state
- Require idempotency where requests may be repeated
- Run inside one transaction where consistency requires it
- Produce audit and outbox events

## Tenant isolation

Every production repository method receives a trusted request context.

Forbidden:

```text
findPatientById(patientId)
```

Required:

```text
findPatientById(context, patientId)
```

A record must never be loaded by identifier alone when it belongs to a
tenant.

## Branch isolation

Branch-specific records must be filtered using the authorized branch
scope.

An empty branch selection does not mean access to all branches.

## Transactions

Only application services start transactions.

Repositories receive the transaction object.

Nested services reuse the current transaction rather than opening
unrelated transactions.

## Idempotency

The following operations require an idempotency key, supplied by the
caller and stored with the resulting record so a repeated request
returns the original result instead of creating a duplicate:

- Appointment booking
- Patient registration
- Payment receipt
- Refund issuance
- Prescription dispensing
- Laboratory result release
- Radiology result release
- Notification dispatch
- Device or session registration
- Any mobile-originated command sent over an unreliable network

An idempotency key is scoped to the tenant, the command type, and the
caller. A repeated key with a different payload is rejected as a
conflict rather than silently accepted.

## Audit rule

Every command that changes durable state writes an audit record in the
same transaction as the state change. An audit record without a
corresponding state change, or a state change without an audit record,
is a defect.

## Testing rule

Application services are tested against repository interfaces, using
in-memory implementations from `packages/repositories`. Production
repository implementations are tested against a real database, not
mocked.

## Rule precedence

If a page, component, or service appears to require breaking tenant
isolation, branch isolation, the transaction boundary, or the audit
rule to function, the design is wrong. Fix the design before writing
the code.
