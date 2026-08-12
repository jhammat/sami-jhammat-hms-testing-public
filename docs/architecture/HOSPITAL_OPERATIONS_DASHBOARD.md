# WonFlow Hospital Operations Dashboard

## Document Status

```text
Task: WF-052
Portal: Hospital Operations
Status: Approved first operational dashboard baseline
Data: Deterministic fictional demonstration data
```

## Purpose

The Hospital Operations dashboard provides one connected view of daily
hospital activity.

```text
Appointments
+ Patient Queue
+ Doctors
+ Admissions
+ Branch Activity
+ Outstanding Invoices
=
Hospital Operations Command Centre
```

## Data Source

The dashboard uses:

```text
WonFlow application provider
→ Frontend data runtime
→ Mock hospital service
→ Operations dashboard projection
→ Operations dashboard hook
```

The interface does not import raw fixture arrays.

## Dashboard Capabilities

The dashboard displays:

- Total patients
- Today’s appointments
- Live queue
- Active admissions
- Doctors on duty
- Outstanding balance
- Appointment schedule
- Patient queue
- Practitioner operational status
- Inpatient placement
- Branch activity
- Outstanding invoices

## Branch Selection

Users may view:

- All branches
- One selected branch

Branch selection updates:

- KPI cards
- Appointments
- Queue entries
- Doctors
- Admissions
- Outstanding balances

## Search

The operational search supports:

- Patient name
- MR number
- Doctor name
- Specialty
- Appointment number
- Service
- Token
- Admission number
- Ward
- Bed
- Invoice number

## Status Presentation

Operational statuses use text and color.

Examples:

```text
Green
= Available, completed or ready

Blue
= Confirmed, checked in or admitted

Violet
= Consultation, procedure or transfer activity

Amber
= Waiting, pending or attention required

Rose
= Overdue, cancelled or exceptional
```

Color never replaces the written status.

## Responsive Layout

The dashboard supports:

- Laptop and desktop dashboards
- Wide hospital workstations
- Tablet layouts
- Mobile navigation
- Horizontally scrollable operational tables

## Financial Values

Financial records retain:

```text
Integer minor units
+
Explicit PKR currency code
```

Display formatting does not change stored amounts.

## Safety Rules

1. The dashboard uses the shared hospital service.
2. Patient and practitioner names are resolved from shared projection data.
3. Branch context affects every operational section.
4. Search does not modify underlying records.
5. Financial values retain their currency.
6. Loading values are not shown as confirmed values.
7. Empty and failed states remain separate.
8. Status colors always include text.
9. Refresh retains previous data where possible.
10. Fictional records remain clearly identified.
11. Navigation visibility does not replace authorization.
12. Production access will require backend permission enforcement.

## Locked Decisions

1. `/operations` contains the first complete operational dashboard.
2. The dashboard uses the operations projection from WF-051.
3. Patient and practitioner lookup collections are included in the projection.
4. Branch filtering is performed consistently across sections.
5. One search field supports common operational identifiers.
6. The dashboard includes six compact KPI cards.
7. Appointments, queues, doctors and admissions remain distinct.
8. Outstanding invoices remain connected to patient context.
9. Branch activity uses real projection counts.
10. The dashboard remains part of the shared WonFlow shell.

## Acceptance Checklist

- [x] Operations projection exposes patient lookups
- [x] Operations projection exposes practitioner lookups
- [x] Hospital Operations dashboard created
- [x] Branch filter created
- [x] Operational search created
- [x] Total-patients KPI created
- [x] Today’s-appointments KPI created
- [x] Live-queue KPI created
- [x] Active-admissions KPI created
- [x] Doctors-on-duty KPI created
- [x] Outstanding-balance KPI created
- [x] Quick navigation created
- [x] Appointment table created
- [x] Live queue created
- [x] Doctors-on-duty panel created
- [x] Active-admissions panel created
- [x] Branch-activity visualization created
- [x] Outstanding-invoices table created
- [x] Loading, error and empty states connected
- [x] Responsive layout created
- [x] Accessibility and safety rules documented