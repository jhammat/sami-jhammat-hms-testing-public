# WonFlow Production Data Model

## Isolation boundary

`Tenant` is the primary data-isolation boundary.

Every tenant-owned operational record contains `tenantId`.

A record identifier alone must never be used to authorize access.

## Organization hierarchy

```text
Tenant
  -> Organization
    -> Branch
      -> Department
        -> Room
```

A tenant initially has one organization, but the data model does not
depend on a display name or hard-coded hospital identity.

## Identity and access

```text
Identity
  -> TenantUser
    -> UserBranchAssignment
    -> UserRoleAssignment
    -> UserPermissionGrant

Role
  -> RolePermission
    -> Permission
```

Identity represents authentication.

TenantUser represents membership in a tenant.

A single identity may belong to multiple tenants.

## Patient identity

```text
Patient
  -> PatientIdentifier
  -> PatientContactPoint
  -> PatientAddress
  -> PatientRelatedPerson
  -> PatientConsent
  -> PatientPortalAccount
```

Patient identifiers are tenant-scoped.

A national identifier must not replace the internal patient ID.

## Workforce

```text
TenantUser
  -> StaffProfile
    -> StaffBranchAssignment
    -> DoctorProfile
      -> DoctorSpecialty
        -> Specialty
```

Not every user is staff.

Not every staff member is a doctor.

## Scheduling

```text
DoctorProfile
  -> AvailabilitySchedule
    -> AvailabilityRule
    -> AvailabilityException
    -> AppointmentSlot

Patient
  -> Appointment
    -> QueueEntry
    -> Encounter
```

Slots are capacity records.

Appointments are booking records.

Queue entries are operational patient-flow records.

## Clinical record

```text
Encounter
  -> EncounterNote
  -> EncounterDiagnosis
  -> ClinicalObservation
  -> MedicationStatement
  -> EncounterAmendment

Patient
  -> PatientAllergy
```

Clinical drafts, signatures, releases, and amendments are preserved
without overwriting signed history.

## Identifier rules

All primary keys use UUIDs.

Human-readable codes are separate fields.

Examples:

- Tenant slug
- Branch code
- Department code
- Patient number
- Employee number
- Service code
- Permission code

Human-readable codes may change only through explicit workflows.

## Time rules

Operational timestamps use timezone-aware PostgreSQL timestamps.

Calendar-only values use PostgreSQL dates.

Recurring schedule clock times use PostgreSQL time values.

The tenant or branch timezone determines display and slot generation.

## Money rules

Money is stored as integer minor units plus an explicit currency code.

Example:

```text
PKR 1250.50
priceMinorUnits = 125050
currencyCode = PKR
```

Floating-point money is forbidden.

## Deletion rules

Clinical, financial, authentication, and audit history is not physically
deleted through ordinary application workflows.

Lifecycle states use status and archived timestamps.

Physical deletion is limited to approved retention and privacy
procedures.

## Naming rules

Database models use singular PascalCase.

Fields use camelCase.

Tables and fields are mapped by Prisma only when integration or legacy
requirements demand it.

Foreign keys use:

- `tenantId`
- `organizationId`
- `branchId`
- `patientId`
- `appointmentId`
- `encounterId`

Boolean fields use:

- `isPrimary`
- `isActive`
- `isMainBranch`
- `requiresApproval`

Timestamp fields use:

- `createdAt`
- `updatedAt`
- `archivedAt`
- `signedAt`
- `releasedAt`
- `expiresAt`

## Required indexes

Tenant-owned lookups begin with `tenantId`.

Branch-owned worklists use tenant, branch, state, and date/time indexes.

Patient clinical history uses tenant, patient, and event-time indexes.

Authentication tokens are queried by hashed token, never plaintext
token.

## Schema evolution

The initial schema is built cumulatively.

Migration creation begins in WF-024 after WF-014 through WF-023 are
reviewed together.

WF-013 is documentation-only.
