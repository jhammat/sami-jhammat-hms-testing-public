# WonFlow Patient Access Dashboard

## Document Status

```text
Task: WF-057
Portal: Patient Access
Status: Approved frontend dashboard baseline
Data: Deterministic fictional demonstration data
```

## Purpose

Patient Access gives an individual patient a clear overview of their connected
hospital information.

```text
Patient identity
→ Appointments
→ Recent care
→ Admissions
→ Invoices
```

## Dashboard Capabilities

The dashboard displays:

- Patient identity
- Medical record number
- Next appointment
- Upcoming appointments
- Assigned practitioner
- Hospital branch
- Recent appointment activity
- Active admissions
- Ward, room and bed placement
- Outstanding invoices
- Outstanding patient balance

## Demonstration Patient Selection

During frontend development, the interface permits switching between fictional
patients.

In production:

```text
Authenticated account
→ Verified patient identity
→ Authorized patient record
```

A real patient must not be allowed to select another patient from a directory.

## Patient Identity

Patient Access uses the organization-level patient identity.

The patient MR number remains connected across approved branches while each
encounter retains its branch context.

## Practitioner and Branch Lookups

The patient projection includes:

- Connected branch records
- Practitioner records

These records resolve appointment context without requiring the page to access
raw fixtures.

## Data Flow

```text
Application provider
→ Hospital service
→ Patient directory
→ Patient dashboard projection
→ Patient Access interface
```

## Financial Representation

Financial values use:

```text
Integer minor units
+
Explicit PKR currency code
```

The interface formats these values without modifying the original amounts.

## Privacy Boundary

The current patient selector exists only for demonstration purposes.

Production Patient Access requires:

- Secure authentication
- Patient-account verification
- Session protection
- Backend authorization
- Patient-specific record filtering
- Audit logging
- Controlled account recovery
- Consent and privacy policies

## Safety Rules

1. Patient information remains patient-specific.
2. Production users cannot select arbitrary patients.
3. Patient identity must be verified by the backend.
4. Financial values preserve currency and minor units.
5. Appointment information retains doctor and branch context.
6. Admission information retains ward and bed context.
7. Fictional records remain clearly identified.
8. Loading values are not presented as confirmed values.
9. Empty and failed states remain separate.
10. Frontend visibility does not replace authorization.
11. Patient Access does not permit clinical record modification through the dashboard.
12. Production access requires audit logging and privacy controls.

## Locked Decisions

1. Patient Access uses a dedicated responsive dashboard.
2. Demonstration patient switching is development-only.
3. Patient projections include branch and practitioner lookups.
4. The next appointment receives prominent visibility.
5. Upcoming and recent appointments remain separate.
6. Admissions and invoices remain separate sections.
7. Outstanding balances remain connected to invoices.
8. The dashboard uses the shared async-data foundation.
9. The portal remains inside the common WonFlow shell.
10. Patient appointment booking will be built as a dedicated workflow.

## Acceptance Checklist

- [x] Patient projection exposes branch records
- [x] Patient projection exposes practitioner records
- [x] Patient directory connected
- [x] Demonstration patient selector created
- [x] Patient identity hero created
- [x] Next appointment created
- [x] Upcoming appointment KPI created
- [x] Recent visit KPI created
- [x] Active admission KPI created
- [x] Outstanding invoice KPI created
- [x] Outstanding balance KPI created
- [x] Patient care navigation created
- [x] Upcoming appointments panel created
- [x] Recent care timeline created
- [x] Active admissions panel created
- [x] Outstanding invoices panel created
- [x] Doctor and branch context connected
- [x] Privacy information panel created
- [x] Loading, empty and error states connected
- [x] Responsive layout created