# WonFlow Organization Administration Dashboard

## Document Status

```text
Task: WF-055
Portal: Organization Administration
Status: Approved frontend dashboard baseline
Data: Deterministic fictional demonstration data
```

## Purpose

The Organization Administration portal provides a central administrative view
across every branch in one hospital organization.

```text
Organization
→ Branches
→ Patients
→ Practitioners
→ Operational activity
→ Financial visibility
```

## Dashboard Capabilities

The dashboard displays:

- Organization identity
- Connected branches
- Registered patients
- Practitioners
- Doctors on duty
- Today’s appointments
- Live queue activity
- Active admissions
- Total billed value
- Collected value
- Outstanding patient balances
- Branch operational activity
- Branch administration comparison

## Branch Network

Each branch summary includes:

- Patient count
- Practitioner count
- Today’s appointments
- Live queue count
- Active admissions
- Outstanding invoice value

## Organization Controls

The administrator can:

- Search branches by name
- Sort branches by activity
- Sort branches by patient count
- Sort branches by practitioner count
- Sort branches by outstanding financial value
- Refresh the organization dashboard

## Financial Representation

Financial values remain represented as:

```text
Integer minor units
+
Explicit PKR currency code
```

The dashboard formats these values for display without modifying the stored
amounts.

## Organization Attention

The dashboard identifies branches with:

- Highest live queue
- Highest active admissions
- Highest outstanding financial value

These indicators support administrative attention and do not make automatic
operational decisions.

## Data Flow

```text
Application provider
→ Hospital service
→ Organization dashboard projection
→ Organization dashboard hook
→ Administration interface
```

## Safety Rules

1. Organization figures use the approved dashboard projection.
2. Branch identity remains attached to every branch metric.
3. Search and sorting do not modify underlying records.
4. Financial values preserve currency and integer minor units.
5. Fictional demonstration records remain clearly identified.
6. Navigation visibility does not replace authorization.
7. Organization administrators do not automatically receive platform rights.
8. Loading values are not displayed as confirmed values.
9. Empty and failed states remain separate.
10. Financial indicators are not audited accounting statements.
11. Operational attention indicators do not replace hospital judgment.
12. Production access requires backend permission enforcement.

## Locked Decisions

1. Organization Administration uses a dedicated dashboard.
2. Organization and Management portals remain separate.
3. Branch administration receives primary visibility.
4. Doctors on duty remain visible at organization level.
5. Branch operational load uses shared dashboard summaries.
6. Branch search and sorting are supported.
7. Financial collection remains read-only.
8. Attention indicators are informational.
9. The dashboard uses the shared async-data foundation.
10. The portal remains inside the common WonFlow application shell.

## Acceptance Checklist

- [x] Organization dashboard connected
- [x] Organization identity hero created
- [x] Collection-rate presentation created
- [x] Patient KPI created
- [x] Practitioner KPI created
- [x] Today’s-appointments KPI created
- [x] Live-queue KPI created
- [x] Active-admissions KPI created
- [x] Doctors-on-duty KPI created
- [x] Hospital branch network created
- [x] Financial overview created
- [x] Organization-attention indicators created
- [x] Branch administration table created
- [x] Branch search created
- [x] Branch sorting created
- [x] Refresh behaviour connected
- [x] Loading, empty and error states connected
- [x] Responsive layout created
- [x] Financial safety rules documented
- [x] Production boundaries documented