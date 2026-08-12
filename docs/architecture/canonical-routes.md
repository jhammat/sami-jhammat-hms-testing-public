# WonFlow Canonical Routes and Portal Ownership

> **Scope note.** This document is the full route plan across all phases. The
> queue, inpatient, surgery, insurance and blood bank routes listed below are
> **not part of Phase 1** — their screens are parked in `deferred/phase-two/`
> and the paths return 404 today. See that folder's README, and
> `disabledModuleCodes` in `packages/config/src/feature-flags.ts`.

## Route principles

1. Every workflow has one canonical route.
2. Route groups may organize source code but do not change public URLs.
3. Duplicate routes must redirect to the canonical route.
4. Authorization is enforced by the server, not only by navigation.
5. A user may have access to multiple portals through the same account.
6. URLs must not contain tenant secrets or unvalidated tenant identifiers.
7. Dynamic record routes use stable identifiers.
8. API routes use `/api/v1`.
9. Public booking routes remain separate from authenticated patient routes.

## Authentication

| Workflow | Canonical route |
|---|---|
| Login | `/auth/login` |
| Forgot password | `/auth/forgot-password` |
| Reset password | `/auth/reset-password` |
| Email verification | `/auth/verify-email` |
| Invitation acceptance | `/auth/invitation` |
| MFA verification | `/auth/mfa` |
| Context selection | `/auth/select-context` |
| Session expired | `/auth/session-expired` |
| Access restricted | `/unauthorized` |

## Platform Administration

| Workflow | Canonical route |
|---|---|
| Platform overview | `/platform` |
| Tenant directory | `/platform/tenants` |
| Create tenant | `/platform/tenants/new` |
| Tenant details | `/platform/tenants/[tenantId]` |
| Entitlements | `/platform/entitlements` |
| Subscriptions | `/platform/subscriptions` |
| Support access | `/platform/support-access` |
| Platform audit | `/platform/audit` |
| Platform settings | `/platform/settings` |

## Hospital Administration

| Workflow | Canonical route |
|---|---|
| Administration dashboard | `/admin` |
| Organization setup | `/admin/setup` |
| Branches and facilities | `/admin/locations` |
| Doctors | `/admin/doctors` |
| Users and staff | `/admin/staff` |
| Roles and permissions | `/admin/roles` |
| Schedules | `/admin/schedules` |
| Services and prices | `/admin/services` |
| Policies | `/admin/policies` |
| Content | `/admin/content` |
| Organization audit | `/admin/audit` |
| Settings | `/admin/settings` |

## Reception

| Workflow | Canonical route |
|---|---|
| Reception dashboard | `/reception` |
| Patient directory | `/reception/patients` |
| New patient | `/reception/patients/new` |
| Patient summary | `/reception/patients/[patientId]` |
| Appointments | `/reception/appointments` |
| Booking | `/reception/appointments/new` |
| Check-in | `/reception/check-in` |
| Queue | `/reception/queue` |
| Walk-in intake | `/reception/walk-in` |
| Emergency intake | `/reception/emergency` |

## Doctor portal

| Workflow | Canonical route |
|---|---|
| Doctor dashboard | `/doctor` |
| Queue | `/doctor/queue` |
| Appointments | `/doctor/appointments` |
| Patient directory | `/doctor/patients` |
| Patient summary | `/doctor/patients/[patientId]` |
| Consultation | `/doctor/encounters/[encounterId]` |
| Results | `/doctor/results` |
| Availability | `/doctor/availability` |
| Profile | `/doctor/profile` |

## Patient portal

| Workflow | Canonical route |
|---|---|
| Patient home | `/patient` |
| Appointments | `/patient/appointments` |
| New booking | `/patient/appointments/new` |
| Token and queue | `/patient/token` |
| Prescriptions | `/patient/prescriptions` |
| Laboratory results | `/patient/laboratory` |
| Radiology reports | `/patient/radiology` |
| Documents | `/patient/documents` |
| Notifications | `/patient/notifications` |
| Profile | `/patient/profile` |

## Operational modules

| Portal | Canonical route prefix |
|---|---|
| Laboratory | `/laboratory` |
| Radiology | `/radiology` |
| Pharmacy | `/pharmacy` |
| Billing | `/billing` |
| Insurance | `/insurance` |
| Inpatient | `/inpatient` |
| Surgery | `/surgery` |
| Blood bank | `/blood-bank` |
| Management | `/management` |

## Public routes

| Workflow | Canonical route |
|---|---|
| Public hospital page | `/public/[organizationSlug]` |
| Public booking | `/public/[organizationSlug]/book` |
| Booking confirmation | `/public/[organizationSlug]/book/confirmation` |

## API

All new production APIs use:

```text
/api/v1/*
```

Examples:

```text
/api/v1/auth/login
/api/v1/tenants
/api/v1/patients
/api/v1/appointments
/api/v1/encounters
/api/v1/laboratory/orders
/api/v1/billing/invoices
```

## Duplicate-route register

Populate this table from the route list printed by `pnpm build`.

| Existing route | Canonical route | Action | Reason |
|---|---|---|---|
| `/` | `/` | Preserve | Matches canonical web root |
| `/admin` | `/admin` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/[section]` | `/admin/[section]` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/audit` | `/admin/audit` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/catalogue` | `/admin/catalogue` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/content` | `/admin/content` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/locations` | `/admin/locations` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/policies` | `/admin/policies` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/services` | `/admin/services` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/setup` | `/admin/setup` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/staff` | `/admin/staff` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/admin/team` | `/admin/team` | Preserve | Matches canonical Hospital Administration prefix `/admin` |
| `/api/auth/login` | `/api/v1/auth/login` | Redirect | Existing API routes are unversioned; move under `/api/v1` |
| `/api/auth/logout` | `/api/v1/auth/logout` | Redirect | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents` | `/api/v1/patient/documents` | Redirect | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents/[documentId]/access` | `/api/v1/patient/documents/[documentId]/access` | Redirect | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents/uploads` | `/api/v1/patient/documents/uploads` | Redirect | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents/uploads/[uploadId]/chunks/[chunkIndex]` | `/api/v1/patient/documents/uploads/[uploadId]/chunks/[chunkIndex]` | Redirect | Existing API routes are unversioned; move under `/api/v1` |
| `/api/patient/documents/uploads/[uploadId]/complete` | `/api/v1/patient/documents/uploads/[uploadId]/complete` | Redirect | Existing API routes are unversioned; move under `/api/v1` |
| `/api/public-booking/[organizationId]/resume` | `/api/v1/public-booking/[organizationId]/resume` | Redirect | Existing API routes are unversioned; move under `/api/v1` |
| `/api/public-booking/[organizationId]/slots` | `/api/v1/public-booking/[organizationId]/slots` | Redirect | Existing API routes are unversioned; move under `/api/v1` |
| `/auth/account-locked` | `/auth/account-locked` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/forgot-password` | `/auth/forgot-password` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/invitation` | `/auth/invitation` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/login` | `/auth/login` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/reset-password` | `/auth/reset-password` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/select-context` | `/auth/select-context` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/session-expired` | `/auth/session-expired` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/auth/verify-email` | `/auth/verify-email` | Preserve | Matches canonical Authentication prefix `/auth` |
| `/book/[organizationId]` | `/public/[organizationSlug]/book` | Redirect | Existing public booking route predates the `/public/[organizationSlug]` convention |
| `/demo-review` | `(remove)` | Remove later | Demo-only route; not part of V1 scope |
| `/doctor` | `/doctor` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/[section]` | `/doctor/[section]` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/consultations` | `/doctor/consultations` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/countersignatures` | `/doctor/countersignatures` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/documents` | `/doctor/documents` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/documents/[documentId]` | `/doctor/documents/[documentId]` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/encounters/[encounterId]` | `/doctor/encounters/[encounterId]` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/follow-ups` | `/doctor/follow-ups` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/history` | `/doctor/history` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/inbox` | `/doctor/inbox` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/inpatients` | `/doctor/inpatients` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/inpatients/[admissionId]/progress-note/print` | `/doctor/inpatients/[admissionId]/progress-note/print` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/messages` | `/doctor/messages` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/patients` | `/doctor/patients` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/policies` | `/doctor/policies` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/profile` | `/doctor/profile` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/queue` | `/doctor/queue` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/radiology-results` | `/doctor/radiology-results` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/results` | `/doctor/results` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/schedule` | `/doctor/schedule` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/settings` | `/doctor/settings` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/doctor/team` | `/doctor/team` | Preserve | Matches canonical Doctor portal prefix `/doctor` |
| `/foundation/components` | `(remove)` | Remove later | Internal design-system/dev route; not part of V1 scope |
| `/foundation/dashboard-data` | `(remove)` | Remove later | Internal design-system/dev route; not part of V1 scope |
| `/foundation/design-system` | `(remove)` | Remove later | Internal design-system/dev route; not part of V1 scope |
| `/foundation/primitives` | `(remove)` | Remove later | Internal design-system/dev route; not part of V1 scope |
| `/foundation/workflow-components` | `(remove)` | Remove later | Internal design-system/dev route; not part of V1 scope |
| `/login` | `/auth/login` | Redirect | Duplicate of canonical `/auth/login` |
| `/management` | `/management` | Preserve | Matches canonical Management prefix |
| `/notifications` | `/notifications` | Preserve | Shared cross-portal notifications route; not yet namespaced per portal |
| `/operations` | `(remove)` | Remove later | Umbrella operations landing page has no single canonical portal owner |
| `/operations/appointments` | `/reception/appointments` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/appointments/new` | `/reception/appointments/new` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/billing` | `/billing` | Redirect | Existing route nests Billing under `/operations`; canonical prefix is `/billing` |
| `/operations/billing/new` | `/billing/new` | Redirect | Existing route nests Billing under `/operations`; canonical prefix is `/billing` |
| `/operations/billing/refunds` | `/billing/refunds` | Redirect | Existing route nests Billing under `/operations`; canonical prefix is `/billing` |
| `/operations/billing/refunds/[refundId]/receipt` | `/billing/refunds/[refundId]/receipt` | Redirect | Existing route nests Billing under `/operations`; canonical prefix is `/billing` |
| `/operations/blood-bank` | `/blood-bank` | Redirect | Existing route nests Blood bank under `/operations`; canonical prefix is `/blood-bank` |
| `/operations/blood-bank/transfusions/[transfusionId]/print` | `/blood-bank/transfusions/[transfusionId]/print` | Redirect | Existing route nests Blood bank under `/operations`; canonical prefix is `/blood-bank` |
| `/operations/inpatient` | `/inpatient` | Redirect | Existing route nests Inpatient under `/operations`; canonical prefix is `/inpatient` |
| `/operations/inpatient/nursing` | `/inpatient/nursing` | Redirect | Existing route nests Inpatient under `/operations`; canonical prefix is `/inpatient` |
| `/operations/inpatient/nursing/[admissionId]/handover/print` | `/inpatient/nursing/[admissionId]/handover/print` | Redirect | Existing route nests Inpatient under `/operations`; canonical prefix is `/inpatient` |
| `/operations/inpatient/wards` | `/inpatient/wards` | Redirect | Existing route nests Inpatient under `/operations`; canonical prefix is `/inpatient` |
| `/operations/inpatient/wards/census/print` | `/inpatient/wards/census/print` | Redirect | Existing route nests Inpatient under `/operations`; canonical prefix is `/inpatient` |
| `/operations/insurance` | `/insurance` | Redirect | Existing route nests Insurance under `/operations`; canonical prefix is `/insurance` |
| `/operations/insurance/claims/[claimId]/print` | `/insurance/claims/[claimId]/print` | Redirect | Existing route nests Insurance under `/operations`; canonical prefix is `/insurance` |
| `/operations/insurance/receivables` | `/insurance/receivables` | Redirect | Existing route nests Insurance under `/operations`; canonical prefix is `/insurance` |
| `/operations/insurance/receivables/aging/print` | `/insurance/receivables/aging/print` | Redirect | Existing route nests Insurance under `/operations`; canonical prefix is `/insurance` |
| `/operations/laboratory` | `/laboratory` | Redirect | Existing route nests Laboratory under `/operations`; canonical prefix is `/laboratory` |
| `/operations/laboratory/results/[orderId]` | `/laboratory/results/[orderId]` | Redirect | Existing route nests Laboratory under `/operations`; canonical prefix is `/laboratory` |
| `/operations/laboratory/results/[orderId]/report` | `/laboratory/results/[orderId]/report` | Redirect | Existing route nests Laboratory under `/operations`; canonical prefix is `/laboratory` |
| `/operations/patients` | `/reception/patients` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/patients/[patientId]/billing` | `/reception/patients/[patientId]/billing` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/patients/[patientId]/billing/statement` | `/reception/patients/[patientId]/billing/statement` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/patients/[patientId]/imaging` | `/reception/patients/[patientId]/imaging` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/patients/[patientId]/medicines` | `/reception/patients/[patientId]/medicines` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/patients/[patientId]/results` | `/reception/patients/[patientId]/results` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/patients/register` | `/reception/patients/register` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/pharmacy` | `/pharmacy` | Redirect | Existing route nests Pharmacy under `/operations`; canonical prefix is `/pharmacy` |
| `/operations/pharmacy/inventory` | `/pharmacy/inventory` | Redirect | Existing route nests Pharmacy under `/operations`; canonical prefix is `/pharmacy` |
| `/operations/pharmacy/receipts/[caseId]` | `/pharmacy/receipts/[caseId]` | Redirect | Existing route nests Pharmacy under `/operations`; canonical prefix is `/pharmacy` |
| `/operations/pharmacy/returns` | `/pharmacy/returns` | Redirect | Existing route nests Pharmacy under `/operations`; canonical prefix is `/pharmacy` |
| `/operations/queue` | `/reception/queue` | Redirect | Reception-owned workflow currently nested under `/operations`; canonical prefix is `/reception` |
| `/operations/radiology` | `/radiology` | Redirect | Existing route nests Radiology under `/operations`; canonical prefix is `/radiology` |
| `/operations/radiology/results/[orderId]` | `/radiology/results/[orderId]` | Redirect | Existing route nests Radiology under `/operations`; canonical prefix is `/radiology` |
| `/operations/radiology/results/[orderId]/report` | `/radiology/results/[orderId]/report` | Redirect | Existing route nests Radiology under `/operations`; canonical prefix is `/radiology` |
| `/operations/reception` | `/reception` | Redirect | Existing route nests Reception under `/operations`; canonical prefix is `/reception` |
| `/operations/surgery` | `/surgery` | Redirect | Existing route nests Surgery under `/operations`; canonical prefix is `/surgery` |
| `/operations/surgery/cssd` | `/surgery/cssd` | Redirect | Existing route nests Surgery under `/operations`; canonical prefix is `/surgery` |
| `/operations/surgery/cssd/[issueId]/traceability/print` | `/surgery/cssd/[issueId]/traceability/print` | Redirect | Existing route nests Surgery under `/operations`; canonical prefix is `/surgery` |
| `/operations/surgery/operation-theatre` | `/surgery/operation-theatre` | Redirect | Existing route nests Surgery under `/operations`; canonical prefix is `/surgery` |
| `/operations/surgery/operation-theatre/[caseId]/report/print` | `/surgery/operation-theatre/[caseId]/report/print` | Redirect | Existing route nests Surgery under `/operations`; canonical prefix is `/surgery` |
| `/organization` | `/admin` | Redirect | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/catalogue` | `/admin/catalogue` | Redirect | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/policies` | `/admin/policies` | Redirect | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/services` | `/admin/services` | Redirect | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/settings` | `/admin/settings` | Redirect | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/staff` | `/admin/staff` | Redirect | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/organization/team` | `/admin/team` | Redirect | Duplicates Hospital Administration workflows already covered by canonical `/admin` prefix |
| `/patient` | `/patient` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/[section]` | `/patient/[section]` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments` | `/patient/appointments` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments/[appointmentId]` | `/patient/appointments/[appointmentId]` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments/[appointmentId]/cancel` | `/patient/appointments/[appointmentId]/cancel` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments/[appointmentId]/payment` | `/patient/appointments/[appointmentId]/payment` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/appointments/book` | `/patient/appointments/book` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/documents` | `/patient/documents` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/documents/upload` | `/patient/documents/upload` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/documents/view/[accessToken]` | `/patient/documents/view/[accessToken]` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/messages` | `/patient/messages` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/patient/register` | `/patient/register` | Preserve | Matches canonical Patient portal prefix `/patient` |
| `/platform` | `/platform` | Preserve | Matches canonical Platform Administration prefix `/platform` |
| `/platform/audit` | `/platform/audit` | Preserve | Matches canonical Platform Administration prefix `/platform` |
| `/platform/entitlements` | `/platform/entitlements` | Preserve | Matches canonical Platform Administration prefix `/platform` |
| `/platform/organizations` | `/platform/tenants` | Redirect | Canonical tenant directory route is `/platform/tenants` |
| `/platform/organizations/[organizationId]` | `/platform/tenants/[organizationId]` | Redirect | Canonical tenant routes use `/platform/tenants` naming |
| `/platform/organizations/new` | `/platform/tenants/new` | Redirect | Canonical tenant routes use `/platform/tenants` naming |
| `/platform/settings` | `/platform/settings` | Preserve | Matches canonical Platform Administration prefix `/platform` |
| `/platform/subscriptions` | `/platform/subscriptions` | Preserve | Matches canonical Platform Administration prefix `/platform` |
| `/platform/support` | `/platform/support-access` | Redirect | Canonical route name is `/platform/support-access` |
| `/unauthorized` | `/unauthorized` | Preserve | Matches canonical access-restricted route |
| `/workspace` | `/doctor` | Redirect | Legacy doctor workspace route superseded by canonical `/doctor` prefix |
| `/workspace/[section]` | `/doctor/[section]` | Redirect | Legacy doctor workspace route superseded by canonical `/doctor` prefix |

## Ownership rule

The route owner controls:

- Page composition
- Required permissions
- Loading and empty states
- Error handling
- Route-specific navigation
- End-to-end tests

Shared services and data models remain portal-neutral.

Do not rename existing routes yet. First add existing duplicates to the
register.
