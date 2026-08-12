# WonFlow Phase 1 Release Scope

## Objective

Phase 1 delivers a production-capable first release of WonFlow for:

- Platform administrators
- Hospital administrators
- Reception staff
- Doctors
- Patients
- Laboratory staff
- Radiology staff
- Pharmacy staff
- Billing staff
- Management users

Phase 1 includes both web portals and the Patient and Doctor Android
applications.

## Included

### Shared platform

- Multi-tenant organization context
- Multi-branch context
- English and Urdu
- Configurable currency with PKR as the initial default
- Configurable timezone and date/time formats
- Shared navigation
- WonFlow route loader
- Loading, empty, error, not-found and permission states
- Notifications
- Documents
- Audit history

### Authentication

- Login
- Logout
- Session expiry
- Account lock state
- Invitations
- Email verification
- Forgot password
- Reset password
- MFA
- Organization selection
- Branch selection
- Workspace selection
- Unauthorized state

### Platform Administration

- Platform overview
- Tenant directory
- Tenant creation
- Tenant details
- Tenant lifecycle
- Entitlements
- Subscriptions
- Support access
- Platform audit
- System settings

### Hospital Administration

- Organization profile
- Hospital branding
- Branches
- Departments
- Rooms and facilities
- Users
- Doctors
- Roles
- Permission matrix
- Services
- Prices
- Schedules
- Policies
- Content
- Audit
- Settings

### Reception and patients

- Preserve the approved Reception design
- Reception dashboard
- Patient registration
- Patient directory
- Patient search
- Duplicate warnings
- Guardians and contacts
- Patient summary
- Appointment booking
- Rescheduling
- Cancellation
- Walk-in workflow
- Check-in
- Tokens
- Patient queues

### Doctor web portal

- Dashboard
- Schedule
- Appointments
- Queue
- Patient list
- Patient summary
- Consultation
- Diagnoses
- Allergies
- Vitals
- Orders
- Prescriptions
- Results
- Follow-up
- Availability
- Profile

### Patient web portal

- Home
- Appointments
- Booking
- Tokens and queue
- Prescriptions
- Laboratory results
- Radiology reports
- Documents
- Notifications
- Profile

### Laboratory

- Orders
- Worklists
- Specimen status
- Result entry
- Validation
- Release
- Correction
- Critical-result handling
- Printing

### Radiology

- Orders
- Worklists
- Procedure status
- Report entry
- Validation
- Release
- Correction
- Critical findings
- Printing

### Pharmacy

- Core medication catalogue
- Core branch inventory
- Batches
- Expiry
- Prescription queue
- Dispensing
- Returns
- Stock movements

### Billing

- Service charges
- Invoices
- Payments
- Receipts
- Refunds
- Credit notes
- PKR formatting
- Audit history

### Management

- Operational dashboard
- Financial summary
- Branch filters
- Date filters
- Real-data KPIs
- Audit timeline
- Export boundaries

### Mobile

- Patient Android APK
- Doctor Android APK
- Shared backend rules
- Secure device sessions
- Push notifications
- Mobile-quality interfaces
- No desktop WebView replacement

## Excluded from Phase 1

- Inpatient admissions
- Ward and bed management
- Nursing workflows
- Surgery and theatre
- CSSD
- Blood bank
- Full insurance claims
- Payroll
- Full HR management
- Advanced procurement
- Supplier management beyond basic pharmacy needs
- Telemedicine
- Medical-device integrations
- National health integrations
- Advanced PACS viewer
- AI diagnosis or autonomous clinical decisions

Existing excluded-module prototypes may remain in the repository, but they
are not part of the Phase 1 release and must not block Phase 1 delivery.

## Reception design freeze

The Reception interface is approved.

Do not redesign its:

- Page layout
- Card structure
- Queue presentation
- Workflow hierarchy
- Navigation pattern
- Overall visual language

Allowed changes are limited to integration, accessibility, responsive
corrections, performance and truthful application states.

## No-dummy-data rule

A new production tenant begins empty.

Do not preload fictional:

- Hospitals
- Branches
- Users
- Doctors
- Patients
- Appointments
- Services
- Prices
- Results
- Prescriptions
- Invoices
- Subscriptions
- Reports
- KPIs
- Audit events

## Definition of complete

A Phase 1 feature is complete only when its required:

- Data model
- Repository
- Service
- API
- Permission enforcement
- Frontend
- Mobile experience where applicable
- Audit behavior
- Error handling
- Automated tests
- Documentation

are complete.
