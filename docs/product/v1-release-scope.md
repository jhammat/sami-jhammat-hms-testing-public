# WonFlow V1 Release Scope

## Product objective

WonFlow V1 is a configurable, multi-tenant, multi-branch hospital
management platform for hospital administrators, operational staff,
clinicians, patients, platform administrators, and management teams.

V1 must be deployable for a real hospital without relying on fictional,
sample, seeded, or hard-coded operational data.

## Supported interfaces

V1 includes:

1. Web application
2. Patient Android application
3. Doctor Android application
4. Production API
5. Background worker
6. PostgreSQL database
7. Object storage
8. Notification services
9. Operational monitoring and audit

## Supported languages and regional configuration

- English is the initial interface language.
- Urdu is supported as a secondary language.
- PKR is the initial configurable currency.
- Currency must remain configurable by organization.
- Timezone, date format, time format, language, and Main Branch must be
  configurable.

## Platform Administration

V1 includes:

- Tenant creation and onboarding
- Tenant directory and tenant details
- Tenant lifecycle controls
- Entitlements
- Subscriptions
- Support access
- Platform audit
- Platform system settings

## Hospital Administration

V1 includes:

- Organization identity and branding
- Branches and facilities
- Departments and rooms
- Users, doctors, and staff
- Role and permission matrix
- Services and branch prices
- Schedules and availability
- Booking policies
- Consent and notification content
- Organization audit
- Hospital settings

## Reception and patient administration

V1 includes:

- Patient registration
- Patient search
- Duplicate detection
- Guardians and contacts
- Consent management
- Identity documents
- Appointment booking
- Walk-in intake
- Check-in
- Tokens and queue management
- Patient administrative timeline

## Doctor and clinical workflows

V1 includes:

- Doctor dashboard
- Doctor schedule
- Patient queue
- Patient summary
- Consultation notes
- Diagnoses
- Allergies
- Vitals
- Medication history
- Prescriptions
- Orders
- Results review
- Follow-up plan
- Referrals
- Clinical signatures and amendments

## Diagnostics and pharmacy

V1 includes:

- Laboratory orders
- Specimen lifecycle
- Laboratory worklists
- Result entry and release
- Radiology scheduling
- Radiology worklists
- Radiology reporting
- Pharmacy formulary
- Inventory and batches
- Prescription dispensing
- Returns and stock movements
- Blood-bank workflows

## Inpatient and surgical workflows

V1 includes:

- Admission
- Ward and bed management
- Transfers
- Nursing observations
- Medication administration
- Handover
- Discharge
- Surgery and theatre scheduling
- Surgical checklists
- Operative records
- CSSD traceability

## Billing and insurance

V1 includes:

- Service charges
- Invoices
- Payments
- Receipts
- Refunds
- Credit notes
- Cashier sessions
- Insurance payers
- Eligibility
- Preauthorization
- Claims
- Settlement and reconciliation

## Patient Android application

V1 includes:

- Authentication
- Hospital and branch selection
- Appointment booking
- Appointment management
- Tokens
- Prescriptions
- Laboratory results
- Radiology reports
- Documents
- Notifications
- Profile and preferences
- Device and session security

## Doctor Android application

V1 includes:

- Authentication
- Dashboard
- Queue
- Appointments
- Patient summary
- Consultation drafts
- Notes
- Prescriptions
- Orders
- Results
- Follow-up
- Availability
- Device and session security

## Technical completion requirements

V1 is not complete until all of the following are proven:

- Production PostgreSQL schema and migrations
- Production authentication
- Tenant isolation
- Branch isolation
- Server-side permission enforcement
- No production dependency on mock data
- Automated unit, integration, API, and end-to-end tests
- Patient Android APK
- Doctor Android APK
- CI/CD
- Monitoring
- Backups and restore testing
- Security review
- Accessibility review
- Performance testing
- Hospital user acceptance testing
- Deployment and rollback procedure

## Deferred unless separately approved

The following are not required for the first production release unless a
pilot hospital explicitly requires them:

- Artificial-intelligence diagnosis
- Autonomous clinical decision-making
- Country-wide health-information exchange
- Full payroll and human-resources management
- Manufacturing or pharmaceutical production
- Advanced PACS diagnostic image viewer
- Medical-device hardware integration
- Video telemedicine
- National identity or insurance-network integration
- Country-specific regulatory certification

## Data rule

New installations begin empty.

No hospital, branch, user, doctor, patient, appointment, service, price,
clinical record, invoice, subscription, or report is invented by the
application.

## Release boundary

A feature is considered complete only when its database model, service,
API, permission enforcement, user interface, audit behavior, automated
tests, error handling, and documentation are complete.
