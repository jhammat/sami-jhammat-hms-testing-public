# WonFlow Portal Route Architecture

## Document Status

```text
Task: WF-024
Status: Approved architecture baseline
Scope: All WonFlow web portals
```

## Core Routing Decision

WonFlow uses:

- One Next.js application
- One top-level root layout
- Multiple internal route groups
- Stable public portal prefixes
- Shared organization and branch context
- Dynamic resource identifiers only where needed

## Route Group Structure

```text
apps/web/src/app
├── layout.tsx
├── page.tsx
├── _components
│   └── portal-placeholder.tsx
│
├── (access)
│   └── auth
│       └── login
│
├── (platform-admin)
│   └── platform
│
├── (organization-admin)
│   └── admin
│
├── (hospital-operations)
│   └── operations
│
├── (doctor-workspace)
│   └── doctor
│
├── (management)
│   └── management
│
└── (patient-access)
    └── patient
```

Folders in parentheses organize the application internally but do not
appear in public URLs.

## Public Portal Prefixes

| Portal | Public Prefix |
|---|---|
| Authentication | /auth |
| Platform Super Admin | /platform |
| Organization Administration | /admin |
| Hospital Operations | /operations |
| Doctor Workspace | /doctor |
| Management Portal | /management |
| Patient Access | /patient |

## Platform Routes

```text
/platform
/platform/organizations
/platform/organizations/[organizationId]
/platform/plans
/platform/modules
/platform/administrators
/platform/support
/platform/audit
/platform/health
/platform/incidents
/platform/settings
```

## Organization Administration Routes

```text
/admin
/admin/branches
/admin/branches/[branchId]
/admin/departments
/admin/departments/[departmentId]
/admin/facilities
/admin/workforce
/admin/doctors
/admin/roles
/admin/permissions
/admin/modules
/admin/services
/admin/services/[serviceId]
/admin/master-data
/admin/templates
/admin/policies
/admin/settings
```

## Hospital Operations Routes

```text
/operations
/operations/patients
/operations/patients/register
/operations/patients/[patientId]
/operations/appointments
/operations/appointments/[appointmentId]
/operations/check-in
/operations/queue
/operations/referrals
/operations/laboratory
/operations/radiology
/operations/pharmacy
/operations/billing
/operations/insurance
/operations/inventory
/operations/admissions
/operations/wards
/operations/operation-theatre
```

## Doctor Workspace Routes

```text
/doctor
/doctor/schedule
/doctor/patients
/doctor/patients/[patientId]
/doctor/consultations/[encounterId]
/doctor/tasks
/doctor/reports
/doctor/referrals
/doctor/messages
/doctor/admitted-patients
```

## Management Routes

```text
/management
/management/branches
/management/departments
/management/doctors
/management/appointments
/management/patient-flow
/management/laboratory
/management/radiology
/management/pharmacy
/management/finance
/management/insurance
/management/inpatient
/management/quality
/management/audit
/management/exports
```

## Patient Access Routes

```text
/patient
/patient/doctors
/patient/doctors/[doctorId]
/patient/appointments
/patient/appointments/[appointmentId]
/patient/queue
/patient/consultations
/patient/prescriptions
/patient/results/laboratory
/patient/results/radiology
/patient/bills
/patient/bills/[invoiceId]
/patient/messages
/patient/family
/patient/profile
/patient/notifications
```

## Organization and Branch Context

WonFlow does not place organization and branch IDs inside every route.

The active context is selected through:

- Authenticated organization membership
- Organization switcher
- Branch switcher
- Department switcher
- Role assignment
- Server authorization

Example:

```text
URL:
/operations/patients

Active context:
Organization: WonFlow General Hospital
Branch: Main Hospital
```

The API must still validate the organization and branch for every protected
request.

## Dynamic Resource Routes

Dynamic segments are used for specific resources:

```text
[organizationId]
[branchId]
[departmentId]
[serviceId]
[patientId]
[appointmentId]
[encounterId]
[doctorId]
[invoiceId]
```

IDs must be encoded before being added to URLs.

## Shared Resource Context

A patient may be viewed through different role-focused routes:

```text
Hospital operations:
/operations/patients/[patientId]

Doctor workspace:
/doctor/patients/[patientId]

Patient Access:
/patient/profile
```

These routes provide different interfaces over the same authorized patient
identity.

## Navigation Resolution

A navigation item becomes available only when:

```text
Portal matches the user's persona
+ Module is enabled
+ Feature is enabled
+ User has permission
+ Organization scope matches
+ Branch scope matches
+ Department scope matches
```

## Locked Decisions

1. WonFlow uses one Next.js application.
2. One top-level root layout is retained.
3. Route-group names do not appear in public URLs.
4. Public portal prefixes remain stable.
5. Organization and branch context are not duplicated in every URL.
6. Backend authorization validates every protected route request.
7. Route constants must come from the shared configuration package.
8. Dynamic route values must use route-builder functions.
9. Portal layouts will be implemented later inside the route groups.
10. The patient and staff portals use the same platform and contracts.
11. Different role routes may display the same resource differently.
12. Navigation must be generated from modules and permissions.

## Acceptance Checklist

- [x] Authentication route group defined
- [x] Platform Super Admin route group defined
- [x] Organization Admin route group defined
- [x] Hospital Operations route group defined
- [x] Doctor Workspace route group defined
- [x] Management route group defined
- [x] Patient Access route group defined
- [x] Stable public prefixes defined
- [x] Dynamic resource route builders defined
- [x] Module and permission metadata supported
- [x] Organization and branch context behavior documented
- [x] Typed shared route registry created
