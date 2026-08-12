# WonFlow Management Portal Dashboard

## Document Status

```text
Task: WF-054
Portal: Management Portal
Status: Approved executive-dashboard baseline
Data: Deterministic fictional demonstration data
```

## Purpose

The Management Portal provides consolidated hospital leadership visibility.

```text
Hospital operations
+ Financial collection
+ Branch performance
+ Management attention
=
Executive dashboard
```

## Dashboard Capabilities

The dashboard displays:

- Patient totals
- Practitioner totals
- Appointment completion
- Queue completion
- Active admissions
- Total billed value
- Collected value
- Outstanding patient balances
- Branch-level patient volume
- Branch-level appointments
- Branch-level queue activity
- Branch-level admissions
- Branch-level outstanding balances

## Data Flow

```text
Application provider
→ Hospital service
→ Management dashboard projection
→ Management dashboard hook
→ Executive interface
```

The interface does not access raw fixtures or repositories.

## Financial Representation

Financial values remain represented as:

```text
Integer minor units
+
Explicit PKR currency code
```

The dashboard calculates the collection rate without changing stored values.

## Branch Comparison

Branches may be:

- Searched by name
- Sorted by operational activity
- Sorted by patient count
- Sorted by appointment count
- Sorted by outstanding balance

## Operational Completion

The dashboard distinguishes:

- Total appointments
- Completed appointments
- Appointment completion rate
- Total queue entries
- Completed queue entries
- Queue completion rate

Appointment completion and queue completion remain separate operational metrics.

## Management Attention

The interface highlights:

- Outstanding financial exposure
- Appointment completion
- Queue completion

These indicators support review but do not make automated management decisions.

## Safety Rules

1. Executive values use the approved management projection.
2. Financial values preserve currency and minor units.
3. Branch comparisons preserve branch identity.
4. Completion rates retain their original totals.
5. Search and sorting do not modify records.
6. Fictional records remain clearly identified.
7. Management navigation does not replace authorization.
8. Production values require backend permission enforcement.
9. Financial indicators are informational, not audited accounting statements.
10. Operational indicators do not replace clinical judgment.
11. Loading values are not displayed as confirmed values.
12. Empty and failed data states remain distinct.

## Locked Decisions

1. The Management Portal uses a dedicated executive dashboard.
2. Management metrics remain separate from Hospital Operations controls.
3. Financial collection receives prominent visibility.
4. Appointment and queue completion remain separate.
5. Branch activity uses shared branch projections.
6. Branch search and sorting are supported.
7. The dashboard includes management-attention indicators.
8. Financial calculations remain read-only.
9. The dashboard uses the shared async-data foundation.
10. The portal remains inside the common WonFlow application shell.

## Acceptance Checklist

- [x] Management dashboard connected
- [x] Executive organization overview created
- [x] Patient KPI created
- [x] Practitioner KPI created
- [x] Appointment completion KPI created
- [x] Queue completion KPI created
- [x] Active admission KPI created
- [x] Outstanding balance KPI created
- [x] Collection-rate presentation created
- [x] Operational completion panel created
- [x] Financial collection panel created
- [x] Management-attention panel created
- [x] Branch activity comparison created
- [x] Branch performance table created
- [x] Branch search created
- [x] Branch sorting created
- [x] Refresh behaviour connected
- [x] Loading, empty and error states connected
- [x] Responsive layout created
- [x] Safety and production boundaries documented