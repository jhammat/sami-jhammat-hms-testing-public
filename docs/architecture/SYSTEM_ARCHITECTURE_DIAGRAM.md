# WonFlow Final System Architecture

## Document Status

```text
Task: WF-039
Status: Approved architecture baseline
Diagram Source:
docs/architecture/diagrams/WONFLOW_SYSTEM_ARCHITECTURE.mmd
```

## Purpose

This document provides the final high-level system architecture for WonFlow.

The diagram connects:

- Users
- Role-specific portals
- Current frontend demo
- Production application boundary
- Hospital domain modules
- Shared platform services
- Databases and storage
- External integrations
- Production infrastructure

## Architecture Position

WonFlow is currently being developed using a frontend-first strategy.

```text
Current stage:
Interactive frontend demo

Current data:
Realistic fictional mock data

Current logic:
Shared TypeScript contracts, validation and frontend workflows

Later stage:
Production backend, PostgreSQL, authentication, security and integrations
```

The frontend demo must not be described as a production-ready hospital system.

## Client Architecture

WonFlow uses one connected platform with several role-specific interfaces:

```text
Platform Administration Portal
Organization Administration Portal
Hospital Operations Workspace
Doctor Clinical Workspace
Management and Reporting Portal
Patient Access Web and PWA
Patient Access Android APK
```

These applications share:

- Design language
- Domain contracts
- Validation rules
- Permissions model
- Organization and branch context
- Patient identity
- Backend services
- Audit standards

## Frontend Demo Boundary

The current frontend architecture contains:

```text
Next.js App Router
React
TypeScript
Tailwind CSS
Shared WonFlow UI components
Portal shells
Navigation
Contracts
Validation
Mock data
Interactive frontend state
English and Urdu foundation
```

The demo will allow hospital stakeholders to review:

- Screens
- Navigation
- Workflows
- Roles
- Forms
- Dashboards
- Patient journeys
- Doctor experience
- Operational behaviour

## Production Entry Boundary

Production requests will pass through controlled entry services.

```text
Client
→ CDN and WAF
→ Application Gateway
→ Authentication
→ Authorization
→ Tenant Context
→ Validation
→ Domain Module
```

The system must not rely only on frontend permission checks.

Backend authorization will verify:

- User identity
- Organization
- Branch
- Role
- Permission
- Patient context
- Clinical relationship
- Restricted-record rules
- Requested action

## Multi-Tenant Architecture

WonFlow supports multiple healthcare organizations.

```text
WonFlow Platform
├── Organization A
│   ├── Branch A1
│   └── Branch A2
└── Organization B
    ├── Branch B1
    └── Branch B2
```

Every production record must include the correct organizational context.

Tenant isolation applies to:

- Users
- Patients
- Staff
- Clinical data
- Appointments
- Financial records
- Documents
- Configuration
- Reports
- Audit events

## Patient Identity

A patient has one primary identity inside an organization.

```text
Organization Patient Identity
├── Organization MR number
├── Demographic information
├── Contact information
└── Duplicate-prevention links
```

The same patient may visit several branches without receiving unrelated patient identities.

Branch encounters and visit numbers remain separate from the organization MR number.

## Domain Architecture

WonFlow is organized into connected domain modules.

The modules are not independent applications.

They exchange controlled data through:

- Shared patient identity
- Encounters
- Patient journeys
- Clinical orders
- State transitions
- Domain events
- Financial charges
- Audit records

## Clinical Flow Example

```text
Appointment
→ Arrival
→ Check-In
→ Queue
→ Encounter
→ Consultation
→ Treatment Plan
→ Prescription or Diagnostic Order
→ Billing
→ Pharmacy or Diagnostic Service
→ Follow-Up
```

## Inpatient Flow Example

```text
Admission Request
→ Admission Approval
→ Bed Reservation
→ Inpatient Encounter
→ Nursing Care
→ Investigations
→ Surgery when required
→ Discharge Planning
→ Final Billing
→ Discharge
```

## Shared Platform Services

Cross-cutting services support all domain modules.

These include:

- Workflow engine
- Dynamic metadata
- Configurable forms
- Notifications
- Documents
- Search
- Background jobs
- Real-time events
- Audit trails
- Localization
- Reporting

These services should not be reimplemented independently inside every module.

## Workflow Engine

The workflow engine controls allowed state transitions.

Example:

```text
Appointment:
Reserved
→ Confirmed
→ Arrived
→ Checked In
→ Completed
```

Invalid transitions are rejected by production services.

The frontend may display the available actions but the backend remains authoritative.

## Metadata and Dynamic Configuration

WonFlow uses a configuration-first approach.

Configurable information may include:

- Departments
- Specialties
- Services
- Appointment types
- Form fields
- Clinical templates
- Queue rules
- Pricing
- Discount policies
- Bed classes
- Surgical protocols
- Notification templates
- Role permissions

This allows future specialties such as dentistry to be added without redesigning the entire system.

## Real-Time Architecture

Real-time events may update:

- Doctor status
- Queue position
- Patient calls
- Bed availability
- Admission status
- Theatre status
- Critical laboratory results
- Critical radiology findings
- Pharmacy readiness
- Payment status
- Notifications

Real-time updates improve operations but do not replace persistent database records.

## Background Processing

Background jobs may handle:

- Reminders
- Appointment expiration
- Token and reservation expiration
- Insurance checks
- Claim submission
- Report generation
- Notification retries
- Daily inpatient charges
- Search indexing
- Data exports
- Backup verification
- Escalation deadlines

Long-running processes should not freeze the user interface.

## Data Architecture

The production data layer is expected to include:

```text
PostgreSQL
= Authoritative transactional data

Redis
= Cache, locks, temporary coordination and selected queues

Object Storage
= Documents, attachments and generated reports

Search Index
= Fast patient and operational search

Analytics Store
= Reporting and business intelligence

PACS References
= Secure imaging study and image references

Backup Storage
= Recovery and disaster-protection copies
```

## PostgreSQL

PostgreSQL will be the main production database.

It will store:

- Organizations
- Branches
- Users
- Roles
- Patients
- Encounters
- Appointments
- Clinical records
- Orders
- Admissions
- Billing
- Insurance
- Inventory references
- Audit events
- Configuration

Prisma will provide the TypeScript database-access layer.

## Object Storage

Large files should not normally be stored directly inside ordinary relational columns.

Object storage may contain:

- Scanned documents
- Consent forms
- Insurance cards
- Reports
- Attachments
- Generated invoices
- Discharge summaries
- Clinical images that are not managed by PACS

The database stores secure metadata and references.

## Diagnostic Imaging

Radiology images may be managed through:

- PACS
- DICOM-compatible systems
- Approved secure imaging archives

WonFlow stores the workflow and secure imaging references.

Unrestricted internal file paths must not be exposed to clients.

## Integration Architecture

The integration layer connects WonFlow to approved external systems.

Examples include:

- Payment gateways
- Banks
- Insurance payers
- Clearinghouses
- SMS providers
- Email providers
- Push notifications
- Laboratory analyzers
- External laboratories
- PACS
- Imaging equipment
- Pharmacy devices
- Government systems

External systems do not receive unrestricted access to the WonFlow database.

## Domain Events

Domain events communicate meaningful changes.

Examples:

```text
AppointmentConfirmed
PatientCheckedIn
ConsultationCompleted
LaboratoryResultVerified
CriticalResultCreated
MedicationDispensed
AdmissionCompleted
PatientDischarged
InvoiceIssued
PaymentCaptured
ClaimSubmitted
```

Events support:

- Background jobs
- Notifications
- Real-time updates
- Reporting
- Integration
- Audit correlation

## Reliable Event Delivery

Production event delivery may use an outbox pattern.

```text
Database transaction commits
→ Domain event stored
→ Background worker reads event
→ Event delivered
→ Delivery status recorded
```

This reduces the risk of losing important events after a successful database transaction.

## Security Architecture

Security controls apply across the entire system.

These include:

- Strong authentication
- Optional multi-factor authentication
- Role-based permissions
- Organization and branch scopes
- Patient-context restrictions
- Restricted clinical records
- Session controls
- Rate limiting
- Input validation
- Secure secrets
- Encryption
- Audit trails
- Security monitoring

## Minimum Necessary Access

Users should receive only the information required for their work.

Examples:

```text
Receptionist:
Can register patients and manage appointments

Doctor:
Can access authorized clinical records

Cashier:
Can access billing information without unnecessary clinical detail

Platform administrator:
Can manage tenants without automatically reading unrestricted clinical records
```

## Audit Architecture

Significant actions generate immutable audit history.

Audit information may include:

- Actor
- Organization
- Branch
- Patient
- Module
- Record
- Action
- Previous state
- New state
- Reason
- Date and time
- Request correlation
- Device or session context where appropriate

Audit history is not a replacement for operational domain events.

Both may be connected but serve different purposes.

## Infrastructure Architecture

Production infrastructure will use controlled environments.

```text
Development
→ Local engineering

Staging
→ Integration and acceptance testing

Pilot
→ Controlled hospital validation

Production
→ Approved real healthcare use
```

The system will not move directly from a frontend demo into unrestricted hospital production.

## Containerization

Application services may be containerized for:

- Consistent environments
- Deployment repeatability
- Service isolation
- Scaling
- Operational recovery

Docker Desktop is currently used for local development support.

## Observability

Production observability includes:

- Application logs
- Security logs
- Metrics
- Distributed traces
- Health checks
- Job monitoring
- Integration failures
- Notification failures
- Database performance
- Error tracking

Sensitive medical information must not be unnecessarily written into logs.

## Backup and Disaster Recovery

Production planning must include:

- Database backups
- Object-storage backups
- Backup encryption
- Backup-retention policy
- Recovery testing
- Point-in-time recovery
- Disaster-recovery procedures
- Recovery ownership
- Recovery evidence

A backup that has never been tested is not enough.

## Deployment Principle

WonFlow will progress through:

```text
Architecture
→ Frontend Demo
→ Hospital Review
→ Production Backend
→ Security Hardening
→ Complete Testing
→ Pilot Deployment
→ Controlled Production Release
```

## Architecture Boundaries

WonFlow follows these boundaries:

1. Frontend clients never connect directly to production databases.
2. Backend authorization remains authoritative.
3. Every request carries organization and branch context.
4. Patient identity is shared across branches in an organization.
5. Domain modules remain connected through controlled contracts.
6. External systems use approved integration services.
7. Large documents use secure storage references.
8. Real-time events do not replace transactional records.
9. Audit history is preserved independently.
10. Production deployment requires security, testing and pilot approval.

## Locked Decisions

1. WonFlow is one platform with several role-specific interfaces.
2. The frontend demo and production backend remain clearly distinguished.
3. Next.js and React provide the shared frontend platform.
4. TypeScript contracts remain shared across applications.
5. PostgreSQL will be the production transactional database.
6. Prisma will provide the TypeScript database layer.
7. Multi-organization and multi-branch tenancy are foundational.
8. One organization-level patient identity is used.
9. Backend authorization verifies every protected action.
10. Clinical, operational and financial domains remain connected.
11. Shared platform services support all modules.
12. Domain events support background processing and integrations.
13. An integration layer protects the internal platform.
14. Documents and imaging use secure storage references.
15. Real-time hospital updates are supported.
16. English and Urdu are supported from the platform foundation.
17. Patient Access uses the same platform and backend.
18. Android packaging uses Capacitor after the responsive patient experience is ready.
19. Security, testing and pilot validation occur before production use.
20. This architecture is expandable through metadata and controlled module extensions.

## Acceptance Checklist

- [x] Users and access channels shown
- [x] All major portals shown
- [x] Current frontend demo boundary shown
- [x] Production security boundary shown
- [x] Multi-tenant architecture shown
- [x] Patient identity architecture shown
- [x] Administration modules shown
- [x] Clinical modules shown
- [x] Laboratory and radiology shown
- [x] Pharmacy shown
- [x] Inpatient and nursing shown
- [x] Operation theatre and anaesthesia shown
- [x] Billing and insurance shown
- [x] Configurable future modules shown
- [x] Shared services shown
- [x] Event and integration layer shown
- [x] Production data layer shown
- [x] External integrations shown
- [x] Infrastructure and operations shown
- [x] Security and audit requirements documented
- [x] Frontend demo is not misrepresented as production