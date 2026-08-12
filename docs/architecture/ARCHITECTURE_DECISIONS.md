# WonFlow Architecture Decision Register

## Document Status

```text
Task: WF-040
Document Type: Architecture Decision Register
Product: WonFlow Hospital Management and Patient-Care Platform
Status: Approved architecture baseline
Owner: WonFlow Product and Engineering
```

## Purpose

This document records the major architectural decisions governing WonFlow.

It explains:

- What was decided
- Why it was decided
- Which alternatives were considered
- What consequences the decision creates
- When the decision should be reviewed

The purpose is to prevent future contributors from changing foundational
architecture without understanding the product requirements behind it.

## Decision Statuses

Every architecture decision uses one of these statuses:

```text
Proposed
= Under review and not yet binding

Accepted
= Approved and currently binding

Superseded
= Replaced by a newer architecture decision

Deprecated
= Still present temporarily but should not be used for new work

Rejected
= Considered but intentionally not selected
```

## Change-Control Rule

An accepted decision must not be silently changed.

A major architecture change requires:

1. A new architecture decision record
2. The reason for changing the existing decision
3. Migration impact
4. Security impact
5. Data impact
6. Product-owner approval
7. Technical review
8. Reference to the decision being superseded

---

# ADR-001 — Build One Connected WonFlow Platform

## Status

```text
Accepted
```

## Decision

WonFlow will be built as one connected healthcare platform with several
role-specific interfaces.

These interfaces include:

- Platform Super Admin
- Organization Administration
- Hospital Operations
- Doctor Workspace
- Nursing and Ward Operations
- Diagnostic and Pharmacy Operations
- Finance and Insurance Operations
- Management Portal
- Patient Access

## Rationale

Hospitals require multiple interfaces, but their information belongs to one
connected operational system.

A patient registered by reception may later appear in:

- Doctor consultation
- Laboratory
- Radiology
- Pharmacy
- Billing
- Insurance
- Ward
- Operation theatre
- Patient Access

Separate disconnected products would create duplicate records and inconsistent
workflows.

## Consequences

- Shared contracts are required.
- Shared identity rules are required.
- Every portal must respect the same authorization model.
- Different portals may have different visual personalities.
- Portals must not create isolated copies of the same patient or encounter.

## Rejected Alternative

```text
Separate independent applications for every department
```

This was rejected because it would increase duplication, synchronization
problems and operational risk.

---

# ADR-002 — Use a Frontend-First Approval Strategy

## Status

```text
Accepted
```

## Decision

WonFlow will first produce a complete interactive frontend demonstration using:

- Realistic fictional data
- Working navigation
- Role-specific portals
- Connected workflows
- Frontend validation
- Shared TypeScript contracts
- Interactive states

The production backend will be implemented after doctors and hospital
stakeholders review the frontend workflows.

## Rationale

Hospital workflows are difficult to correct after database schemas and APIs
have been deeply implemented.

Frontend approval allows clinicians and operational staff to review:

- Screen structure
- Required information
- Workflow order
- Terminology
- Role access
- Navigation
- Data visibility
- Clinical usability

## Consequences

- Mock data must look realistic but remain fictional.
- Frontend workflows must represent intended production behaviour.
- Production readiness must not be claimed during the demo stage.
- Backend implementation begins only after the approved frontend is frozen.
- Contract changes found during review must be completed before backend work.

## Rejected Alternative

```text
Build the entire backend first and show the interface later
```

This was rejected because workflow mistakes would become expensive to correct.

---

# ADR-003 — Use a TypeScript Monorepo

## Status

```text
Accepted
```

## Decision

WonFlow uses a pnpm TypeScript monorepo.

The workspace contains:

```text
apps/
packages/
tooling/
docs/
```

Shared packages include:

- UI
- Contracts
- Validation
- Configuration
- Mock data
- Database foundations

## Rationale

The portals share:

- Domain types
- Validation
- UI components
- Configuration
- Terminology
- Testing tools

A monorepo reduces duplication and makes contract changes visible across the
platform.

## Consequences

- Packages must have clear responsibilities.
- Circular dependencies must be avoided.
- Root development commands must check the complete workspace.
- Shared code should not contain portal-specific business assumptions.

---

# ADR-004 — Use Next.js App Router and React

## Status

```text
Accepted
```

## Decision

The primary WonFlow web platform uses:

```text
Next.js
React
App Router
TypeScript
```

## Rationale

This architecture supports:

- Server and client rendering
- Route groups
- Shared layouts
- Role-specific portals
- Responsive interfaces
- Progressive Web App capabilities
- Controlled future API integration

## Consequences

- Route architecture must remain organized by portal and responsibility.
- Client components should only be used where interaction requires them.
- Sensitive authorization must not depend only on Next.js page visibility.
- Production API and authorization remain backend responsibilities.

---

# ADR-005 — Use a Shared WonFlow Design System

## Status

```text
Accepted
```

## Decision

All WonFlow interfaces use shared UI foundations and accessibility rules.

The selected visual direction is:

- Clean white foundation
- Blue and purple brand accents
- Meaningful clinical status colors
- Soft tinted surfaces
- Restrained gradients
- Attractive charts and icons
- Strong visual hierarchy
- Minimal unnecessary scrolling
- Keyboard-friendly and touch-friendly controls

## Rationale

The system must feel unified while allowing each workspace to support different
operational needs.

## Consequences

- Shared primitives live in the UI package.
- Portal-specific components may extend shared primitives.
- Clinical safety should take priority over decoration.
- Red, amber and green must communicate meaningful operational status.
- Dense hospital screens must remain readable.

## Rejected Alternatives

- Excessive black-and-white screens
- Neon artificial-intelligence styling
- Heavy glass effects
- Large empty marketing-style layouts
- Repetitive card grids without information hierarchy

---

# ADR-006 — Maintain Shared Domain Contracts

## Status

```text
Accepted
```

## Decision

WonFlow stores shared domain contracts in:

```text
packages/contracts
```

The contracts define:

- Identities
- Statuses
- Records
- Relationships
- Events
- State transitions
- Aggregate structures

## Rationale

The frontend demo, production backend, testing and integrations require one
consistent understanding of the domain.

## Consequences

- Generic names that create export collisions must be avoided.
- Domain-specific prefixes should be used where necessary.
- Existing contracts must be reviewed before creating duplicate concepts.
- Breaking contract changes require controlled migration.

## Previous Correction

A duplicate exported type named:

```text
RoomType
```

was renamed to:

```text
InpatientRoomType
```

to avoid a barrel-export collision.

---

# ADR-007 — Separate Domain Records That Represent Different Real Events

## Status

```text
Accepted
```

## Decision

Concepts that represent different real-world events must remain separate.

Examples:

```text
Patient identity
≠ Encounter
≠ Appointment
≠ Patient journey

Admission request
≠ Admission
≠ Bed reservation
≠ Bed assignment

Medication order
≠ Medication administration

Surgical request
≠ Surgical case
≠ Procedure

Discharge planning
≠ Discharge order
≠ Physical departure
```

## Rationale

Combining these concepts causes incorrect histories and weak auditability.

## Consequences

- The system contains more linked records.
- Each status transition becomes more accurate.
- Operational history can be reconstructed.
- Reporting can distinguish requests from completed actions.

---

# ADR-008 — Use One Organization-Level Patient Identity

## Status

```text
Accepted
```

## Decision

A patient receives one primary patient identity within an organization.

Branches create branch encounters, not unrelated duplicate patients.

## Rationale

A patient may visit several hospital branches while remaining the same person.

## Consequences

- The MR identity belongs to the organization.
- Encounters remain branch-specific.
- Duplicate detection operates across the organization.
- Authorized staff may access records across branches according to permissions.
- Patient Access uses the same organization-level identity.

## Rejected Alternative

```text
Create a new patient record at every branch
```

This was rejected because it fragments medical history and increases safety
risk.

---

# ADR-009 — Make Multi-Organization and Multi-Branch Tenancy Foundational

## Status

```text
Accepted
```

## Decision

WonFlow supports multiple healthcare organizations, each containing one or more
branches.

Every protected production record must carry the appropriate organizational
context.

## Rationale

WonFlow is intended to serve multiple hospitals and hospital groups.

## Consequences

Backend access must verify:

- Organization
- Branch
- Department where applicable
- User scope
- Requested record
- Requested action

Tenant isolation cannot depend only on frontend filters.

---

# ADR-010 — Use Role-Based and Scope-Based Authorization

## Status

```text
Accepted
```

## Decision

WonFlow combines:

```text
Role permissions
+
Organization scope
+
Branch scope
+
Department or unit scope
+
Patient and clinical context
```

## Rationale

A role alone is not enough.

Two users with the same job title may be authorized for different branches or
departments.

## Consequences

- Backend authorization is authoritative.
- Frontend controls improve usability but are not security boundaries.
- Sensitive actions may require reasons or secondary approval.
- Restricted clinical records require additional policy checks.

---

# ADR-011 — Use Service-Driven Workflows

## Status

```text
Accepted
```

## Decision

Hospital workflows should begin with the selected service whenever practical.

Example:

```text
Select X-ray service
→ Show body part
→ Show view
→ Show preparation
→ Show pricing
→ Show required authorization
```

## Rationale

Hospital employees should not repeatedly type information that the selected
service already determines.

## Consequences

- Services require structured metadata.
- Forms use progressive disclosure.
- Departments can configure service-specific fields.
- Billing, scheduling and clinical workflows reference the same service
  definition.

---

# ADR-012 — Use Metadata-Driven Configuration

## Status

```text
Accepted
```

## Decision

WonFlow uses metadata and configuration for information that varies between
organizations.

This includes:

- Services
- Specialties
- Departments
- Appointment types
- Form fields
- Clinical templates
- Queue rules
- Bed classes
- Pricing
- Notification templates
- Workflow rules

## Rationale

Hospitals differ operationally.

Hard-coding every specialty into the central application would slow expansion
and create duplicated logic.

## Consequences

- Configuration must be validated and versioned.
- Clinical safety rules must not be weakened through unrestricted configuration.
- Controlled custom values require approval and auditability.
- Dentistry and other specialties can be introduced as configured extensions.

---

# ADR-013 — Minimize Manual Data Entry

## Status

```text
Accepted
```

## Decision

WonFlow prioritizes:

- Searchable dropdowns
- Master data
- Smart defaults
- Existing-patient search
- Reusable clinical templates
- Service-driven fields
- Keyboard shortcuts
- Progressive disclosure
- Controlled custom values

## Rationale

Hospital staff work under time pressure.

Repeated manual typing slows care and increases data inconsistency.

## Consequences

- Master data quality becomes important.
- Users must still be able to enter exceptions safely.
- Custom entries must not silently corrupt standardized reporting.
- Search and selection must remain fast.

---

# ADR-014 — Use Fictional Mock Data During the Demo Stage

## Status

```text
Accepted
```

## Decision

The interactive frontend demo uses realistic fictional records.

## Rationale

Stakeholders need convincing operational examples without exposing real patient
information.

## Consequences

- Mock records must never represent real patients.
- Names, contact data and identifiers must be fictional.
- Mock-data structures must follow shared contracts.
- Production data access is not enabled during the demo stage.

---

# ADR-015 — Use PostgreSQL as the Production Transactional Database

## Status

```text
Accepted
```

## Decision

WonFlow will use PostgreSQL as its authoritative transactional database.

## Rationale

The system requires:

- Strong relational integrity
- Transactions
- Complex reporting
- Concurrency controls
- Structured clinical and financial relationships
- Reliable indexing
- Mature operational tooling

## Consequences

- Database migrations require review.
- Organization context must be present in relevant records and indexes.
- Atomic operations are required for reservations and financial changes.
- Database constraints must support application validation.

---

# ADR-016 — Use Prisma for the TypeScript Database Layer

## Status

```text
Accepted
```

## Decision

Prisma will provide the primary TypeScript data-access and migration foundation.

## Rationale

Prisma provides:

- Type-safe database access
- Schema-driven migrations
- Development tooling
- Integration with the TypeScript codebase

## Consequences

- Complex queries may require carefully reviewed SQL.
- Prisma does not replace database design.
- Database constraints remain necessary.
- Query performance must be measured in realistic environments.

---

# ADR-017 — Use Zod-Compatible Runtime Validation

## Status

```text
Accepted
```

## Decision

TypeScript types will be supported by runtime validation using the shared
validation package and Zod-compatible schemas.

## Rationale

TypeScript types disappear at runtime.

External input must be validated when it enters the system.

## Consequences

Validation is required for:

- Forms
- API requests
- Imports
- External integrations
- Configuration
- Environment variables

Frontend validation improves usability, while backend validation remains
authoritative.

---

# ADR-018 — Keep Frontends Away from Direct Database Access

## Status

```text
Accepted
```

## Decision

Client applications must not connect directly to the production database.

## Rationale

Direct database access would bypass:

- Authentication
- Authorization
- Validation
- Audit logging
- Workflow rules
- Tenant isolation
- Integration events

## Consequences

Production clients communicate through controlled application services and
APIs.

---

# ADR-019 — Preserve Immutable Audit History

## Status

```text
Accepted
```

## Decision

Significant actions create permanent audit records.

Examples include:

- Access changes
- Clinical-note signatures
- Result verification
- Medication overrides
- Patient merges
- Bed assignments
- Financial adjustments
- Claim submissions
- Surgery checklist overrides
- Record corrections

## Rationale

Healthcare systems require accountability and reconstructable history.

## Consequences

- Signed records are not silently overwritten.
- Corrections reference previous records.
- Important status changes record actor, reason and time.
- Audit history requires restricted access and retention policies.

---

# ADR-020 — Use Explicit State-Transition Rules

## Status

```text
Accepted
```

## Decision

Major workflows define allowed status transitions.

Examples include:

- Appointments
- Queues
- Laboratory orders
- Radiology studies
- Prescriptions
- Admissions
- Claims
- Surgery
- Recovery
- Discharge

## Rationale

Uncontrolled status changes create impossible operational states.

## Consequences

- The frontend shows valid actions.
- The backend verifies transitions.
- Invalid transitions are rejected.
- Exceptional overrides require authorization and reasons.

---

# ADR-021 — Use Domain Events and Reliable Background Processing

## Status

```text
Accepted
```

## Decision

Meaningful changes may create domain events.

Examples:

```text
PatientCheckedIn
ConsultationCompleted
CriticalResultCreated
MedicationDispensed
PatientAdmitted
SurgeryCompleted
PatientDischarged
InvoiceIssued
ClaimSubmitted
```

Production delivery may use an outbox pattern.

## Rationale

Events support:

- Notifications
- Real-time updates
- Background jobs
- Integrations
- Reporting
- Escalation

## Consequences

- Events must be idempotent where necessary.
- Failed delivery requires retries and monitoring.
- Events do not replace authoritative database records.
- Personally identifiable information must be minimized in event payloads.

---

# ADR-022 — Support Real-Time Operational Updates

## Status

```text
Accepted
```

## Decision

WonFlow will support real-time updates for operational use cases.

Examples include:

- Queue position
- Doctor availability
- Bed status
- Theatre status
- Pharmacy readiness
- Critical results
- Payment status
- Patient notifications

## Rationale

Hospital operations change continuously.

Manual page refreshes are insufficient for high-activity workspaces.

## Consequences

- Real-time connections require authorization.
- Reconnection must restore the current authoritative state.
- Real-time messages must not become the only copy of important information.
- Polling may be used as a controlled fallback.

---

# ADR-023 — Store Documents Outside Ordinary Transactional Columns

## Status

```text
Accepted
```

## Decision

Large documents and attachments use secure object storage.

The database stores:

- Metadata
- Ownership
- Access rules
- Storage references
- Checksums
- Version information

## Rationale

Large binary documents should not overload ordinary transactional database
operations.

## Consequences

- Storage access uses signed or controlled URLs.
- Storage permissions must follow tenant and patient context.
- Orphan-file cleanup is required.
- Backups must cover both database records and stored objects.

---

# ADR-024 — Integrate with PACS Instead of Rebuilding Medical Imaging Storage

## Status

```text
Accepted
```

## Decision

WonFlow manages radiology workflow and secure imaging references.

Medical images may remain in:

- PACS
- DICOM-compatible archives
- Approved imaging systems

## Rationale

A complete medical-imaging archive requires specialized standards, storage and
clinical capabilities.

## Consequences

- WonFlow stores study and report relationships.
- Image access uses approved secure integration.
- Internal PACS paths must not be exposed directly.
- Availability failures require clear operational handling.

---

# ADR-025 — Support English and Urdu from the Platform Foundation

## Status

```text
Accepted
```

## Decision

WonFlow supports English and Urdu localization from the beginning.

## Rationale

The first intended market includes Pakistan.

Localization added late would require major interface and database corrections.

## Consequences

- User-facing text should not be unnecessarily hard-coded.
- Layouts must support right-to-left presentation where required.
- Clinical terminology requires controlled translation.
- Saved clinical meaning must remain unambiguous.
- User-entered records are not automatically translated without explicit
  workflow.

---

# ADR-026 — Deliver Patient Access Through the Same Platform

## Status

```text
Accepted
```

## Decision

Patient Access is part of WonFlow rather than a disconnected standalone patient
system.

It will be delivered as:

```text
Responsive web interface
→ Progressive Web App
→ Android APK using Capacitor
```

## Rationale

Patients should access the same authorized records used by hospital staff.

## Consequences

- The same backend data is reused.
- Patient authorization is separate from staff authorization.
- Patient Access exposes only patient-safe information.
- The responsive experience is completed before APK packaging.
- Android Studio and Java verification may be deferred until the packaging
  stage.

---

# ADR-027 — Use Capacitor for Android Packaging

## Status

```text
Accepted
```

## Decision

The approved responsive Patient Access application will later be packaged as an
Android application using Capacitor.

## Rationale

This supports reuse of the existing web application and shared TypeScript code.

## Consequences

- Mobile-specific capabilities must use controlled plugins.
- Permission handling must be tested on real Android devices.
- Offline behaviour must be explicitly designed.
- Store packaging occurs only after the responsive patient experience is
  approved.

---

# ADR-028 — Do Not Reuse the Previous Project

## Status

```text
Accepted
```

## Decision

WonFlow is being implemented as a clean project rather than extending the
previous experimental project.

## Rationale

The previous project contained architectural and setup decisions that did not
fully match the approved WonFlow direction.

## Consequences

- Required concepts are recreated deliberately.
- Unverified legacy code is not copied.
- Useful ideas may be reconsidered, but code is not assumed safe or suitable.
- The current monorepo remains the source of truth.

---

# ADR-029 — Manually Own Shared UI Components

## Status

```text
Accepted
```

## Decision

WonFlow may use shadcn-style component architecture, but shared components are
owned directly inside the repository.

## Context

The shadcn command-line tool encountered Windows permission errors while
scanning protected directories.

## Rationale

The CLI is a convenience tool, not an architectural dependency.

## Consequences

- Components may be created and maintained manually.
- The shadcn CLI should not be repeatedly rerun in the current environment.
- Component source remains visible and editable.
- Dependencies must be added deliberately.
- Accessibility must be verified manually.

---

# ADR-030 — Separate Clinical Readiness from Financial Readiness

## Status

```text
Accepted
```

## Decision

Clinical decisions and financial processes remain separate states.

Examples:

```text
Clinically ready for admission
≠ Financial clearance completed

Clinically ready for discharge
≠ Final invoice settled

Emergency procedure required
≠ Insurance authorization completed
```

## Rationale

Patient safety must not be represented as identical to financial status.

## Consequences

- Interfaces display both states clearly.
- Emergency pathways may proceed before optional financial completion.
- Financial exceptions remain auditable.
- Organization policy controls non-emergency financial requirements.

---

# ADR-031 — Use Actual Consumption for Final Clinical Charges

## Status

```text
Accepted
```

## Decision

Final billing should normally use the service and resources actually delivered.

Examples include:

- Medicines dispensed
- Laboratory tests performed
- Radiology studies completed
- Bed days
- Surgical duration
- Implants used
- Consumables used
- Blood products used

## Rationale

Planned quantities may differ from actual care.

## Consequences

- Planned charges and final charges remain distinguishable.
- Corrections require controlled credit or adjustment workflows.
- Inventory and billing events must remain connected.
- Financial records cannot silently rewrite clinical records.

---

# ADR-032 — Use Integer Minor Units for Money

## Status

```text
Accepted
```

## Decision

Production money values should use integer minor units rather than binary
floating-point arithmetic.

Example:

```text
$125.75
→ 12,575 cents
```

## Rationale

Floating-point values can create rounding errors.

## Consequences

- Every amount includes a currency code.
- Display formatting converts minor units into user-facing money.
- Tax, discount and allocation rounding rules must be explicit.
- Mixed-currency transactions require controlled handling.

---

# ADR-033 — Require Atomic Reservations

## Status

```text
Accepted
```

## Decision

Resources that cannot be assigned twice must use atomic reservation logic.

Examples:

- Appointment slot
- Queue token
- Bed
- Theatre room
- Recovery bed
- Inventory allocation
- Claim-submission idempotency
- Payment request

## Rationale

Two users may act at nearly the same time.

Frontend checks alone cannot prevent double-booking.

## Consequences

- Production code uses database transactions, locks or equivalent controls.
- Reservation records use idempotency keys where appropriate.
- Temporary holds require expiry.
- Failed operations must release or reconcile resources safely.

---

# ADR-034 — Require Security, Testing and Pilot Approval Before Production

## Status

```text
Accepted
```

## Decision

WonFlow will not be considered production-ready until it passes:

- Backend integration
- Authorization testing
- Tenant-isolation testing
- Clinical workflow testing
- Financial reconciliation testing
- Security assessment
- Performance testing
- Backup restoration testing
- Hospital user acceptance
- Controlled pilot
- Release approval

## Rationale

A hospital system can affect patient safety, privacy and finances.

## Consequences

The development sequence remains:

```text
Architecture
→ Frontend Demo
→ Hospital Review
→ Backend
→ Security
→ Testing
→ Pilot
→ Production
```

A visually complete demo is not equivalent to a deployable clinical system.

---

# ADR-035 — Defer Git and Release Commands Until the Approved Release Stage

## Status

```text
Accepted project-delivery decision
```

## Decision

Routine development instructions will not include Git or GitHub commands until
the owner requests the release and version-control stage.

## Rationale

The current workflow is focused on step-by-step local development.

## Consequences

- No unrelated Git commands are inserted into normal tasks.
- Source-control setup must be completed before serious production collaboration.
- Release work will include repository, branching and deployment rules.
- The project owner may supersede this decision earlier.

---

# Architecture Decisions That Require Future Review

The following decisions should be reviewed before production implementation:

| Decision area | Review trigger |
|---|---|
| Backend deployment model | Before production infrastructure begins |
| Authentication provider | Before WF production authentication work |
| Redis usage | Before real-time coordination and distributed locking |
| Search engine | When patient and operational data volumes are measurable |
| Analytics store | Before management reporting uses production data |
| Object-storage provider | Before document uploads begin |
| PACS integration | When the pilot hospital’s imaging environment is known |
| SMS and email providers | Before notification integration |
| Payment providers | Before production patient payments |
| Insurance integrations | When payer specifications are available |
| Hosting region | Before real patient data is stored |
| Data-retention policy | During legal, security and hospital review |
| Offline Patient Access | Before PWA and APK implementation |
| Multi-region disaster recovery | Before large-scale deployment |

---

# Rejected Architectural Directions

## Separate Patient Application Database

Rejected because Patient Access must use the same authorized patient records as
the hospital platform.

## Branch-Only Patient Identity

Rejected because it fragments the patient’s history inside one organization.

## Frontend Directly Connected to PostgreSQL

Rejected because it bypasses authorization, validation and audit controls.

## Hard-Coded Specialty Modules

Rejected because WonFlow must support configurable expansion such as dentistry.

## Production Backend Before Workflow Approval

Rejected because major clinical workflow changes would become expensive.

## Microservices From the First Development Day

Rejected because the product boundaries and operational scale have not yet been
validated.

WonFlow may use modular services later when justified, but premature service
fragmentation would create unnecessary deployment and integration complexity.

## Real Patient Data in the Demo

Rejected because the frontend demo can be reviewed using fictional data.

## Silent Clinical Record Editing

Rejected because signed and verified healthcare records require visible
amendment history.

---

# Decision Review Process

A decision review should answer:

1. Is the original context still valid?
2. Has the product scope changed?
3. Does the decision create a security problem?
4. Does it create a patient-safety problem?
5. Does it prevent hospital expansion?
6. Does it conflict with new law or hospital policy?
7. What data migration would be required?
8. What modules would be affected?
9. What testing would be required?
10. Who approves the replacement decision?

---

# Locked Architecture Summary

WonFlow remains:

```text
One connected platform
Multiple role-specific portals
Frontend-first demonstration
TypeScript monorepo
Next.js and React frontend
Shared design system
Shared contracts and validation
Realistic fictional mock data
Multi-organization and multi-branch
One organization-level patient identity
Service-driven workflows
Metadata-driven expansion
PostgreSQL and Prisma production foundation
Backend-enforced authorization
Immutable audit history
Domain events and real-time operations
Secure document and imaging references
English and Urdu support
Responsive Patient Access
PWA and Capacitor Android packaging
Security, testing and pilot before production
```

## Acceptance Checklist

- [x] Architecture decision purpose documented
- [x] Decision statuses documented
- [x] Change-control process documented
- [x] Single-platform decision documented
- [x] Frontend-first decision documented
- [x] Monorepo decision documented
- [x] Next.js and React decision documented
- [x] Shared design-system decision documented
- [x] Shared-contract decision documented
- [x] Patient-identity decision documented
- [x] Multi-tenant decision documented
- [x] Authorization decision documented
- [x] Service-driven workflow decision documented
- [x] Metadata configuration documented
- [x] Mock-data decision documented
- [x] PostgreSQL and Prisma decisions documented
- [x] Runtime validation documented
- [x] Audit and state-transition decisions documented
- [x] Event and real-time decisions documented
- [x] Document and PACS decisions documented
- [x] English and Urdu decision documented
- [x] Patient Access and Capacitor decisions documented
- [x] Financial-safety decisions documented
- [x] Atomic reservation decision documented
- [x] Production-readiness gates documented
- [x] Rejected alternatives documented
- [x] Future review triggers documented