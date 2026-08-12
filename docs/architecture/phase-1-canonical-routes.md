# WonFlow Phase 1 Canonical Routes

## Authentication

| Workflow | Route |
|---|---|
| Login | `/login` |
| Forgot password | `/auth/forgot-password` |
| Reset password | `/auth/reset-password` |
| Verify email | `/auth/verify-email` |
| Invitation | `/auth/invitation` |
| MFA | `/auth/mfa` |
| Select context | `/auth/select-context` |
| Session expired | `/auth/session-expired` |
| Account locked | `/auth/account-locked` |
| Unauthorized | `/unauthorized` |

`/auth/login` may redirect to `/login`.

## Platform Administration

| Workflow | Route |
|---|---|
| Overview | `/platform` |
| Tenants | `/platform/organizations` |
| Create tenant | `/platform/organizations/new` |
| Tenant details | `/platform/organizations/[organizationId]` |
| Entitlements | `/platform/entitlements` |
| Subscriptions | `/platform/subscriptions` |
| Support access | `/platform/support` |
| Audit | `/platform/audit` |
| Settings | `/platform/settings` |

## Hospital Administration

| Workflow | Route |
|---|---|
| Dashboard | `/admin` |
| Setup | `/admin/setup` |
| Branches and facilities | `/admin/locations` |
| Doctors | `/admin/doctors` |
| Users | `/admin/users` |
| Roles and permissions | `/admin/roles` |
| Schedules | `/admin/schedules` |
| Services and prices | `/admin/services` |
| Policies | `/admin/policies` |
| Content | `/admin/content` |
| Audit | `/admin/audit` |
| Settings | `/admin/settings` |

Existing `/organization/*` routes must be classified before redirects are
introduced.

## Reception

The approved Reception route family remains canonical for Phase 1.

| Workflow | Route |
|---|---|
| Reception desk | `/operations/reception` |
| Patient directory | `/operations/patients` |
| Patient registration | `/operations/patients/register` |
| Patient details | `/operations/patients/[patientId]` |
| Appointments | `/operations/appointments` |
| New appointment | `/operations/appointments/new` |
| Queue | `/operations/queue` |
| Billing counter | `/operations/billing/new` |
| Refunds | `/operations/billing/refunds` |

## Doctor

| Workflow | Route |
|---|---|
| Dashboard | `/doctor` |
| Patients | `/doctor/patients` |
| Appointments | `/doctor/appointments` |
| Queue and consultations | `/doctor/consultations` |
| Encounter | `/doctor/encounters/[encounterId]` |
| Results | `/doctor/results` |
| Availability | `/doctor/availability` |
| Profile | `/doctor/profile` |

## Patient

| Workflow | Route |
|---|---|
| Home | `/patient` |
| Appointments | `/patient/appointments` |
| New booking | `/patient/appointments/new` |
| Care | `/patient/care` |
| Reports | `/patient/reports` |
| Documents | `/patient/documents` |
| Notifications | `/patient/notifications` |
| Profile | `/patient/profile` |

## Diagnostics and operations

| Workflow | Route |
|---|---|
| Laboratory | `/operations/laboratory` |
| Radiology | `/operations/radiology` |
| Pharmacy | `/operations/pharmacy` |
| Pharmacy inventory | `/operations/pharmacy/inventory` |
| Pharmacy returns | `/operations/pharmacy/returns` |
| Management | `/management` |

## API

New production APIs use:

```text
/api/v1/*
```

Examples:

```text
/api/v1/auth/login
/api/v1/context
/api/v1/platform/organizations
/api/v1/admin/branches
/api/v1/patients
/api/v1/appointments
/api/v1/queues
/api/v1/encounters
/api/v1/laboratory/orders
/api/v1/radiology/orders
/api/v1/pharmacy/dispenses
/api/v1/billing/invoices
```

## Duplicate-route register

| Existing route | Canonical route | Action | Notes |
|---|---|---|---|
| `/` | `/` | Preserve | Matches canonical web root |
| `/admin` | `/admin` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/[section]` | `/admin/[section]` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/audit` | `/admin/audit` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/catalogue` | `/admin/services` | Redirect later | Canonical Phase 1 route is `/admin/services` |
| `/admin/content` | `/admin/content` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/locations` | `/admin/locations` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/policies` | `/admin/policies` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/services` | `/admin/services` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/setup` | `/admin/setup` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/staff` | `/admin/users` | Redirect later | Canonical Phase 1 route is `/admin/users` |
| `/admin/team` | `/admin/users` | Redirect later | Duplicates `/admin/users` |
| `/api/auth/login` | `/api/v1/auth/login` | Redirect later | Existing API routes are unversioned; move under `/api/v1` |
| `/api/auth/logout` | `/api/v1/auth/logout` | Redirect later | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents` | `/api/v1/patient/documents` | Redirect later | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents/[documentId]/access` | `/api/v1/patient/documents/[documentId]/access` | Redirect later | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents/uploads` | `/api/v1/patient/documents/uploads` | Redirect later | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents/uploads/[uploadId]/chunks/[chunkIndex]` | `/api/v1/patient/documents/uploads/[uploadId]/chunks/[chunkIndex]` | Redirect later | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents/uploads/[uploadId]/complete` | `/api/v1/patient/documents/uploads/[uploadId]/complete` | Redirect later | Existing API routes are unversioned; move under `/api/v1` |
| `/api/public-booking/[organizationId]/resume` | `/api/v1/public-booking/[organizationId]/resume` | Redirect later | Existing API routes are unversioned; move under `/api/v1` |
| `/api/public-booking/[organizationId]/slots` | `/api/v1/public-booking/[organizationId]/slots` | Redirect later | Existing API routes are unversioned; move under `/api/v1` |
| `/auth/account-locked` | `/auth/account-locked` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/forgot-password` | `/auth/forgot-password` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/invitation` | `/auth/invitation` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/login` | `/auth/login` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/reset-password` | `/auth/reset-password` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/select-context` | `/auth/select-context` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/session-expired` | `/auth/session-expired` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/verify-email` | `/auth/verify-email` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/book/[organizationId]` | `/book/[organizationId]` | Out of Phase | Public booking canonicalization not defined in the Phase 1 route set; revisit separately |
| `/demo-review` | `(remove)` | Out of Phase | Demo-only route; not part of Phase 1 |
| `/doctor` | `/doctor` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/[section]` | `/doctor/[section]` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/consultations` | `/doctor/consultations` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/countersignatures` | `/doctor/countersignatures` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/documents` | `/doctor/documents` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/documents/[documentId]` | `/doctor/documents/[documentId]` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/encounters/[encounterId]` | `/doctor/encounters/[encounterId]` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/follow-ups` | `/doctor/follow-ups` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/history` | `/doctor/history` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/inbox` | `/doctor/inbox` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/inpatients` | `/doctor/inpatients` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/inpatients/[admissionId]/progress-note/print` | `/doctor/inpatients/[admissionId]/progress-note/print` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/messages` | `/doctor/messages` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/patients` | `/doctor/patients` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/policies` | `/doctor/policies` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/profile` | `/doctor/profile` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/queue` | `/doctor/queue` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/radiology-results` | `/doctor/radiology-results` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/results` | `/doctor/results` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/schedule` | `/doctor/schedule` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/settings` | `/doctor/settings` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/doctor/team` | `/doctor/team` | Preserve | Matches canonical Doctor prefix `/doctor` |
| `/foundation/components` | `(remove)` | Out of Phase | Internal design-system/dev route; not part of Phase 1 |
| `/foundation/dashboard-data` | `(remove)` | Out of Phase | Internal design-system/dev route; not part of Phase 1 |
| `/foundation/design-system` | `(remove)` | Out of Phase | Internal design-system/dev route; not part of Phase 1 |
| `/foundation/primitives` | `(remove)` | Out of Phase | Internal design-system/dev route; not part of Phase 1 |
| `/foundation/workflow-components` | `(remove)` | Out of Phase | Internal design-system/dev route; not part of Phase 1 |
| `/login` | `/login` | Preserve | Matches canonical Phase 1 login route `/login` |
| `/management` | `/management` | Preserve | Matches canonical Management route |
| `/notifications` | `/notifications` | Preserve | Shared cross-portal notifications route |
| `/operations` | `/operations` | Preserve | Reception/Laboratory/Radiology/Pharmacy/Billing/Queue remain under `/operations` per the Phase 1 Reception design freeze |
| `/operations/appointments` | `/operations/appointments` | Preserve | Remains under `/operations` per the Reception design freeze |
| `/operations/appointments/new` | `/operations/appointments/new` | Preserve | Remains under `/operations` per the Reception design freeze |
| `/operations/billing` | `/operations/billing` | Preserve | Remains under `/operations` per the Reception design freeze |
| `/operations/billing/new` | `/operations/billing/new` | Preserve | Matches canonical Reception billing-counter route |
| `/operations/billing/refunds` | `/operations/billing/refunds` | Preserve | Matches canonical Reception refunds route |
| `/operations/billing/refunds/[refundId]/receipt` | `/operations/billing/refunds/[refundId]/receipt` | Preserve | Remains under `/operations` per the Reception design freeze |
| `/operations/blood-bank` | `/operations/blood-bank` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/blood-bank/transfusions/[transfusionId]/print` | `/operations/blood-bank/transfusions/[transfusionId]/print` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/inpatient` | `/operations/inpatient` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/inpatient/nursing` | `/operations/inpatient/nursing` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/inpatient/nursing/[admissionId]/handover/print` | `/operations/inpatient/nursing/[admissionId]/handover/print` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/inpatient/wards` | `/operations/inpatient/wards` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/inpatient/wards/census/print` | `/operations/inpatient/wards/census/print` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/insurance` | `/operations/insurance` | Preserve | Out-of-Phase module prototype (full claims); remains in repository, not blocking Phase 1 |
| `/operations/insurance/claims/[claimId]/print` | `/operations/insurance/claims/[claimId]/print` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/insurance/receivables` | `/operations/insurance/receivables` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/insurance/receivables/aging/print` | `/operations/insurance/receivables/aging/print` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/laboratory` | `/operations/laboratory` | Preserve | Matches canonical Laboratory route |
| `/operations/laboratory/results/[orderId]` | `/operations/laboratory/results/[orderId]` | Preserve | Remains under `/operations/laboratory` |
| `/operations/laboratory/results/[orderId]/report` | `/operations/laboratory/results/[orderId]/report` | Preserve | Remains under `/operations/laboratory` |
| `/operations/patients` | `/operations/patients` | Preserve | Matches canonical Reception patient-directory route |
| `/operations/patients/[patientId]/billing` | `/operations/patients/[patientId]/billing` | Preserve | Remains under `/operations/patients` |
| `/operations/patients/[patientId]/billing/statement` | `/operations/patients/[patientId]/billing/statement` | Preserve | Remains under `/operations/patients` |
| `/operations/patients/[patientId]/imaging` | `/operations/patients/[patientId]/imaging` | Preserve | Remains under `/operations/patients` |
| `/operations/patients/[patientId]/medicines` | `/operations/patients/[patientId]/medicines` | Preserve | Remains under `/operations/patients` |
| `/operations/patients/[patientId]/results` | `/operations/patients/[patientId]/results` | Preserve | Remains under `/operations/patients` |
| `/operations/patients/register` | `/operations/patients/register` | Preserve | Matches canonical Reception registration route |
| `/operations/pharmacy` | `/operations/pharmacy` | Preserve | Matches canonical Pharmacy route |
| `/operations/pharmacy/inventory` | `/operations/pharmacy/inventory` | Preserve | Matches canonical Pharmacy inventory route |
| `/operations/pharmacy/receipts/[caseId]` | `/operations/pharmacy/receipts/[caseId]` | Preserve | Remains under `/operations/pharmacy` |
| `/operations/pharmacy/returns` | `/operations/pharmacy/returns` | Preserve | Matches canonical Pharmacy returns route |
| `/operations/queue` | `/operations/queue` | Preserve | Matches canonical Reception queue route |
| `/operations/radiology` | `/operations/radiology` | Preserve | Matches canonical Radiology route |
| `/operations/radiology/results/[orderId]` | `/operations/radiology/results/[orderId]` | Preserve | Remains under `/operations/radiology` |
| `/operations/radiology/results/[orderId]/report` | `/operations/radiology/results/[orderId]/report` | Preserve | Remains under `/operations/radiology` |
| `/operations/reception` | `/operations/reception` | Preserve | Matches canonical Reception-desk route |
| `/operations/surgery` | `/operations/surgery` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/surgery/cssd` | `/operations/surgery/cssd` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/surgery/cssd/[issueId]/traceability/print` | `/operations/surgery/cssd/[issueId]/traceability/print` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/surgery/operation-theatre` | `/operations/surgery/operation-theatre` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/operations/surgery/operation-theatre/[caseId]/report/print` | `/operations/surgery/operation-theatre/[caseId]/report/print` | Preserve | Out-of-Phase module prototype; remains in repository, not blocking Phase 1 |
| `/organization` | `/admin` | Redirect later | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/catalogue` | `/admin/services` | Redirect later | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/policies` | `/admin/policies` | Redirect later | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/services` | `/admin/services` | Redirect later | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/settings` | `/admin/settings` | Redirect later | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/staff` | `/admin/users` | Redirect later | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/team` | `/admin/users` | Redirect later | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/patient` | `/patient` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/[section]` | `/patient/[section]` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments` | `/patient/appointments` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments/[appointmentId]` | `/patient/appointments/[appointmentId]` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments/[appointmentId]/cancel` | `/patient/appointments/[appointmentId]/cancel` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments/[appointmentId]/payment` | `/patient/appointments/[appointmentId]/payment` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments/book` | `/patient/appointments/book` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/documents` | `/patient/documents` | Preserve | Matches canonical Patient documents route |
| `/patient/documents/upload` | `/patient/documents/upload` | Preserve | Remains under `/patient/documents` |
| `/patient/documents/view/[accessToken]` | `/patient/documents/view/[accessToken]` | Preserve | Remains under `/patient/documents` |
| `/patient/messages` | `/patient/notifications` | Redirect later | Canonical Phase 1 route is `/patient/notifications` |
| `/patient/register` | `/patient/register` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/platform` | `/platform` | Preserve | Matches canonical Platform Administration overview route |
| `/platform/audit` | `/platform/audit` | Preserve | Matches canonical Platform Administration audit route |
| `/platform/entitlements` | `/platform/entitlements` | Preserve | Matches canonical Platform Administration entitlements route |
| `/platform/organizations` | `/platform/organizations` | Preserve | Matches canonical Platform Administration tenant-directory route |
| `/platform/organizations/[organizationId]` | `/platform/organizations/[organizationId]` | Preserve | Matches canonical Platform Administration tenant-details route |
| `/platform/organizations/new` | `/platform/organizations/new` | Preserve | Matches canonical Platform Administration create-tenant route |
| `/platform/settings` | `/platform/settings` | Preserve | Matches canonical Platform Administration settings route |
| `/platform/subscriptions` | `/platform/subscriptions` | Preserve | Matches canonical Platform Administration subscriptions route |
| `/platform/support` | `/platform/support` | Preserve | Matches canonical Platform Administration support-access route |
| `/unauthorized` | `/unauthorized` | Preserve | Matches canonical access-restricted route |
| `/workspace` | `/doctor` | Redirect later | Legacy doctor workspace route superseded by canonical `/doctor` prefix |
| `/workspace/[section]` | `/doctor/[section]` | Redirect later | Legacy doctor workspace route superseded by canonical `/doctor` prefix |

Do not remove or redirect a route until its current dependencies are
identified.
