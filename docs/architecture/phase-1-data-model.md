# WonFlow Phase 1 Production Data Model

## Scope

The Phase 1 database contains only the entities required by:

- Authentication and sessions
- Multi-tenant and multi-branch administration
- Platform Administration
- Hospital Administration
- Reception and patient registration
- Appointments, check-in and queues
- Doctor web and mobile workflows
- Patient web and mobile workflows
- Laboratory
- Radiology
- Core pharmacy
- Core billing
- Documents
- Notifications
- Audit

## Explicitly excluded

Phase 1 does not model:

- Inpatient admissions
- Wards and beds
- Nursing
- Surgery and theatre
- CSSD
- Blood bank
- Full insurance claims
- Payroll
- Advanced procurement
- Telemedicine
- AI workflows

## Isolation

`Tenant` is the primary isolation boundary.

Every tenant-owned operational record contains `tenantId`.

Application code must never authorize access using a record ID alone.

## Organization hierarchy

```text
Tenant
  -> Organization
    -> Branch
```

Phase 1 supports departments and rooms through organization settings or
later schema additions only when required by an implemented workflow.

## Authentication

```text
Identity
  -> TenantMembership
    -> MembershipRole
    -> MembershipPermissionGrant

Identity
  -> AuthSession
  -> OneTimeToken
  -> MfaCredential
```

An Identity represents login credentials.

A TenantMembership represents the identity's access to one hospital
tenant.

One identity may belong to multiple tenants.

## Workspaces

Phase 1 workspaces are:

- Platform
- Hospital Administration
- Reception
- Doctor
- Patient
- Laboratory
- Radiology
- Pharmacy
- Billing
- Management

Workspace names are navigation choices, not authorization shortcuts.

Permissions remain the authorization source of truth.

## Patient and clinical scope

```text
Patient
  -> Appointment
    -> Encounter
      -> DiagnosticOrder
      -> Prescription

DiagnosticOrder
  -> DiagnosticResult
```

Phase 1 clinical documentation may initially store structured note
sections as JSON, but signed and released records must be versioned and
must not be silently overwritten.

## Pharmacy

```text
Medication
  -> InventoryBatch
  -> PrescriptionItem
```

Phase 1 pharmacy supports:

- Medication catalogue
- Branch batches
- Expiry
- Available quantity
- Dispensing foundations

It does not include advanced procurement.

## Billing

```text
Patient
  -> Invoice
    -> InvoiceLine
    -> Payment
```

Money is stored as integer minor units with an explicit currency code.

Floating-point money is forbidden.

## Documents

Object storage metadata is separate from the business document record.

```text
StoredObject
  -> DocumentRecord
```

Knowing an object key is not authorization.

## Notifications and jobs

Notifications and background work use durable records and an outbox.

No critical operation should depend on an untracked fire-and-forget task.

## Audit

Audit events include:

- Tenant ID
- Branch ID where applicable
- Actor membership ID
- Session ID
- Request ID
- Action
- Entity type
- Entity ID
- Severity
- Reason or safe metadata
- Timestamp

Passwords, tokens, MFA secrets and sensitive clinical content must not be
blindly copied into audit metadata.

## Identifier rules

Primary keys use UUIDs.

Human-facing codes remain separate:

- Tenant slug
- Organization code
- Branch code
- Patient number
- Employee number
- Service code
- Permission code
- Invoice number

## Time rules

- Events use timezone-aware timestamps.
- Birth dates use dates.
- Recurring availability uses weekday and minute offsets.
- Display uses the selected branch or tenant timezone.

## Deletion rules

Clinical, financial, authentication and audit history is not physically
deleted through normal application actions.

Lifecycle status and archive timestamps are used instead.
