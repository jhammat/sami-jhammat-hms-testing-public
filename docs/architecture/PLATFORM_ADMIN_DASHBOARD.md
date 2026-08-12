# WonFlow Platform Super Administration Dashboard

## Document Status

```text
Task: WF-056
Portal: Platform Administration
Status: Approved frontend dashboard baseline
Data: Deterministic fictional demonstration data
```

## Purpose

The Platform Administration portal gives the WonFlow platform owner central
visibility across tenant organizations and application workspaces.

```text
WonFlow Platform
→ Tenant organizations
→ Hospital branches
→ Portal registry
→ Runtime services
→ Platform activity
```

## Platform Scope

The Platform Super Administrator is separate from:

- Organization administrators
- Hospital operations staff
- Doctors
- Management users
- Patients

Platform access does not automatically represent hospital clinical authority.

## Dashboard Capabilities

The dashboard displays:

- Tenant organization count
- Connected branch count
- Patient count
- Practitioner count
- Appointment records
- Queue records
- Admission records
- Invoice records
- Tenant organization registry
- Connected branch registry
- Enabled portal registry
- Platform health
- Runtime environment
- Data mode
- Demo scenario
- Dataset identity
- Platform activity distribution

## Tenant Registry

The current fictional scenario contains one tenant organization.

The production platform will later support:

- Multiple tenant organizations
- Tenant onboarding
- Subscription and entitlement control
- Organization activation and suspension
- Tenant-specific configuration
- Tenant-specific data isolation
- Organization administrator assignment

## Portal Registry

Enabled portals come from the resolved application configuration.

The dashboard does not hard-code portal availability.

Supported workspaces currently include:

- Platform Administration
- Organization Administration
- Hospital Operations
- Doctor Workspace
- Management Portal
- Patient Access

## Platform Health

Current frontend health checks include:

- Configuration resolution
- Frontend runtime creation
- Hospital service availability
- Portal registry availability
- Fictional-data warning availability

These checks confirm the frontend demonstration runtime only.

They do not prove production readiness.

## Data Flow

```text
Application provider
→ Frontend runtime
→ Hospital service
→ Platform dashboard projection
→ Platform administration interface
```

## Search

The shared platform search supports:

- Hospital branch name
- Portal name
- Portal description
- Portal code
- Route prefix

Search does not modify platform configuration.

## Safety Rules

1. Platform administration remains separate from organization administration.
2. Platform visibility does not grant clinical authority.
3. Tenant data must remain isolated in production.
4. The dashboard uses an approved read-only projection.
5. Fictional data remains clearly identified.
6. Frontend portal visibility does not replace authorization.
7. Runtime health does not prove backend security.
8. Production tenant actions require audited backend workflows.
9. Platform search does not modify records.
10. Dataset identity remains visible during demonstrations.
11. Configuration secrets are not exposed to client components.
12. Production platform access requires strong authentication and permission checks.

## Locked Decisions

1. Platform Administration has a dedicated dashboard.
2. The platform dashboard remains separate from hospital management.
3. Tenant organizations receive primary visibility.
4. Portal definitions come from application configuration.
5. Platform health uses controlled frontend checks.
6. Runtime environment and data mode remain visible.
7. Branches are displayed under their organization tenant.
8. Platform activity uses read-only record counts.
9. The dashboard uses the shared async-data foundation.
10. Full tenant management will be implemented through dedicated workflows.

## Acceptance Checklist

- [x] Platform dashboard connected
- [x] Platform identity hero created
- [x] Environment status displayed
- [x] Data mode displayed
- [x] Demo scenario displayed
- [x] Organization KPI created
- [x] Branch KPI created
- [x] Patient KPI created
- [x] Practitioner KPI created
- [x] Appointment KPI created
- [x] Queue KPI created
- [x] Admission KPI created
- [x] Invoice KPI created
- [x] Tenant organization registry created
- [x] Connected branch registry created
- [x] Portal registry created
- [x] Platform health panel created
- [x] Platform activity distribution created
- [x] Platform search created
- [x] Refresh behaviour connected
- [x] Loading, empty and error states connected
- [x] Safety and tenant-isolation boundaries documented