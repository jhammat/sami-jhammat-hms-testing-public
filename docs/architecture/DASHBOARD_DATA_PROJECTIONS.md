# WonFlow Dashboard Data Projections

## Document Status

```text
Task: WF-051
Area: Shared Frontend Foundation
Status: Approved dashboard-data baseline
```

## Purpose

WonFlow dashboards use portal-specific projections instead of making each
screen independently calculate operational information.

```text
Hospital service
→ Dashboard loader
→ Dashboard projection
→ Reusable hook
→ Dashboard interface
```

## Supported Projections

WonFlow currently provides projections for:

- Platform Administration
- Organization Administration
- Hospital Operations
- Doctor Workspace
- Management Portal
- Patient Access

## Projection Principle

A dashboard projection is a read-only interface model.

It may combine:

- Organizations
- Branches
- Patients
- Practitioners
- Appointments
- Queues
- Admissions
- Invoices

The projection does not replace the authoritative domain records.

## Platform Dashboard

The platform projection provides:

- Organization count
- Branch count
- Practitioner count
- Patient count
- Appointment count
- Queue count
- Admission count
- Invoice count

## Organization Dashboard

The organization projection provides:

- Organization totals
- Branch summaries
- Patient totals
- Practitioner totals
- Today’s appointments
- Live queues
- Active admissions
- Doctors on duty
- Financial totals

## Hospital Operations Dashboard

The operations projection provides:

- Total patients
- Total practitioners
- Today’s appointments
- Live queue
- Active admissions
- Doctors on duty
- Outstanding balances
- Appointment records
- Queue records
- Admission records
- Invoice records

## Doctor Dashboard

The doctor projection provides:

- Selected practitioner
- Today’s appointments
- Completed appointments
- Waiting patients
- Unique patients
- Active inpatient cases
- Current queue

## Management Dashboard

The management projection provides:

- Patient and practitioner totals
- Appointment completion
- Queue completion
- Active admissions
- Financial totals
- Branch-level performance

## Patient Dashboard

The patient projection provides:

- Patient identity
- Upcoming appointments
- Recent appointments
- Active admissions
- Outstanding invoices
- Outstanding balance

## Financial Representation

Financial values use:

```text
Integer minor units
+
Explicit currency code
```

The current fictional dataset uses PKR.

Dashboards format values for display without modifying the stored amount.

## Time Model

Demo dashboards use the fixed fictional dataset anchor time.

This ensures that:

- Today’s appointments remain stable
- Screenshots remain repeatable
- Demonstrations do not change each day
- Automated tests remain deterministic

Production dashboards will use controlled backend time and organization
timezone rules.

## Dashboard Hooks

Reusable hooks include:

```text
useWonFlowPlatformDashboard
useWonFlowOrganizationDashboard
useWonFlowOperationsDashboard
useWonFlowDoctorDashboard
useWonFlowManagementDashboard
useWonFlowPatientDashboard
```

Each hook uses the shared async-data system.

## Cancellation and Refresh

Dashboard requests support:

- AbortSignal cancellation
- Stable request keys
- Retained previous data
- Refresh indicators
- Retry actions
- Normalized errors

## Safety Rules

1. Dashboards use approved service adapters.
2. Screens do not calculate critical totals independently.
3. Projections remain read-only.
4. Financial values preserve currency and minor units.
5. Mock dashboard data remains fictional.
6. Production dashboards require backend authorization.
7. Hidden dashboard cards do not replace permissions.
8. Appointment and queue totals remain distinct.
9. Requests and completed actions remain distinct.
10. Patient dashboard data remains patient-specific.
11. Doctor dashboard data requires a selected practitioner.
12. Branch summaries preserve branch context.

## Locked Decisions

1. Dashboard projections are centralized.
2. Portal dashboards use reusable hooks.
3. Dashboard loaders use the hospital-service boundary.
4. One snapshot may support several metrics.
5. Platform, organization and operations dashboards remain distinct.
6. Doctor and patient dashboards require explicit identities.
7. Financial totals use integer minor units.
8. Demo dates use the fixed scenario clock.
9. Hooks use the shared async-data foundation.
10. The production API adapter may replace mock loaders without redesigning screens.

## Acceptance Checklist

- [x] Dashboard source metadata created
- [x] Platform dashboard projection created
- [x] Organization dashboard projection created
- [x] Hospital operations projection created
- [x] Doctor dashboard projection created
- [x] Management dashboard projection created
- [x] Patient dashboard projection created
- [x] Branch summaries created
- [x] Financial summaries created
- [x] Appointment completion rate created
- [x] Queue completion rate created
- [x] Dashboard formatters created
- [x] Platform dashboard hook created
- [x] Organization dashboard hook created
- [x] Operations dashboard hook created
- [x] Doctor dashboard hook created
- [x] Management dashboard hook created
- [x] Patient dashboard hook created
- [x] Runtime preview page created
- [x] Safety and production boundaries documented