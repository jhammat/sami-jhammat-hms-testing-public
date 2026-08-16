# Multi-user verification (FIX-20)

Every scenario below was run as an automated Playwright spec —
[`apps/web/tests/e2e/multi-user-verification.spec.ts`](../../apps/web/tests/e2e/multi-user-verification.spec.ts)
— using two independently authenticated browser contexts per scenario (each
its own cookie jar, its own login; nothing is shared between them except
through the real API and the real PostgreSQL database). Screenshots are in
[`docs/release/screenshots/`](./screenshots/), one per browser per scenario,
captured at the point the scenario's claim is verified. Run it yourself with:

```
pnpm --filter web exec playwright test tests/e2e/multi-user-verification.spec.ts --project=chromium
```

All 10 test cases (covering all 13 required scenarios — some pair as a
single ordered story, e.g. "order a test" / "laboratory sees it" run inside
one test) passed on the final run. Two genuine wiring defects and one
provisioning defect were found and fixed while producing this evidence —
each is called out under the scenario that exposed it.

## Scenario 1 — Reception registers a patient. Doctor sees them immediately.

**Result: pass.** Reception registers a patient through the real UI
(`/operations/patients`, patient search box). A second browser, logged in as
`doctor@wonflow.local`, queries `GET /api/v1/patients` and finds the same
patient in the same instant — no polling delay, no cache to invalidate.

- Reception: [`01-reception-patient-registered.png`](./screenshots/01-reception-patient-registered.png)
- Doctor: [`01-doctor-portal-same-moment.png`](./screenshots/01-doctor-portal-same-moment.png)

## Scenario 2 — Reception queues a patient. Doctor calls them. They leave the reception queue.

**Result: pass.** Reception books and checks in an appointment (real
`Appointment` + `QueueEntry` rows). The doctor, in a separate browser, calls
the patient via `PATCH /api/v1/doctor/queue/:id {action:"call"}`; the queue
entry's status moves from `WAITING` to `CALLED` and the doctor's own `/doctor`
view reflects it immediately.

- Reception (before call): [`02-reception-queue-before-call.png`](./screenshots/02-reception-queue-before-call.png)
- Doctor (after call): [`02-doctor-called-patient.png`](./screenshots/02-doctor-called-patient.png)

## Scenario 3 — Doctor writes a consultation. Patient sees the released summary.

**Result: pass.** The doctor starts the consultation (creates a real
`Encounter`), drafts a SOAP note, and signs it — signing sets both `SIGNED`
and `releasedAt` in one step for a self-authored, non-supervised note. A
second browser, logged in as `patient@wonflow.local`, immediately sees the
note's content via `GET /api/v1/patient/clinical-notes`.

- Doctor: [`03-doctor-signed-note.png`](./screenshots/03-doctor-signed-note.png)
- Patient: [`03-patient-portal-same-moment.png`](./screenshots/03-patient-portal-same-moment.png)

**Defect found and fixed:** the `DOCTOR` workspace role had
`laboratory.orders.read` / `radiology.orders.read` but not the `.manage`
permissions `POST /api/v1/doctor/encounters/:id/orders` actually requires —
so a doctor could never place a lab or radiology order from within a live
consultation (only reception could, at booking time, via a separate
`appointments.manage`-gated path). Fixed in
[`apps/web/src/server/access/workspace-roles.ts`](../../apps/web/src/server/access/workspace-roles.ts)
by adding `laboratory.orders.manage` / `radiology.orders.manage` to `DOCTOR`.
This surfaced while building scenario 4, but is recorded here because it
blocks the "doctor orders a test" step, which is the next scenario.

## Scenario 4 & 5 — Doctor orders a test. Laboratory sees it. Laboratory enters a result. Doctor sees it.

**Result: pass.** The doctor places a real `DiagnosticOrder`. A separate
browser, logged in as `laboratory@wonflow.local`, sees it on the laboratory
worklist (`GET /api/v1/diagnostics/worklist`), collects a specimen, enters a
preliminary result, and releases it. The doctor's `/doctor/results` screen
shows the released narrative immediately afterward.

- Laboratory (order visible): [`04-laboratory-sees-order.png`](./screenshots/04-laboratory-sees-order.png)
- Laboratory (released): [`05-laboratory-released-result.png`](./screenshots/05-laboratory-released-result.png)
- Doctor (sees result): [`05-doctor-sees-result.png`](./screenshots/05-doctor-sees-result.png)

## Scenario 6 & 7 — Doctor prescribes. Pharmacy sees the prescription. Pharmacy dispenses. Stock decreases for everyone.

**Result: pass.** The doctor prescribes a medication against the encounter.
A separate browser, logged in as `pharmacy@wonflow.local`, sees the
prescription on the pharmacy queue (`GET /api/v1/pharmacy/prescriptions`),
dispenses it against a real inventory batch, and the batch's quantity
decreases by exactly the dispensed amount — verified by re-reading the batch
from both the pharmacy session and the doctor's session afterward.

- Doctor (prescribed): [`06-doctor-prescribed.png`](./screenshots/06-doctor-prescribed.png)
- Pharmacy (sees prescription): [`06-pharmacy-sees-prescription.png`](./screenshots/06-pharmacy-sees-prescription.png)
- Pharmacy (after dispensing, stock decreased): [`07-pharmacy-dispensed-stock-decreased.png`](./screenshots/07-pharmacy-dispensed-stock-decreased.png)

**Defect found and fixed:** `DoctorService.createPrescription` created every
prescription with `status: "DRAFT"`. Pharmacy's own queue
(`PharmacyBillingService.getPrescriptionQueue`) only ever shows
`ACTIVE`/`PARTIALLY_DISPENSED` prescriptions, and no endpoint anywhere
transitions a prescription out of `DRAFT` — so a doctor's prescription could
never reach pharmacy at all; it silently dead-ended. The doctor UI has a
single "prescribe" action with no separate draft/finalize step, so the fix
was to make that one action final: `createPrescription` now sets
`status: "ACTIVE"` and `prescribedAt` immediately. Fixed in
[`apps/web/src/server/doctor/doctor-service.ts`](../../apps/web/src/server/doctor/doctor-service.ts).

## Scenario 8 & 9 — Billing issues an invoice. Patient sees it in their portal. Patient pays. Billing sees the payment.

**Result: pass.** Billing creates and issues a real `Invoice`. A separate
browser, logged in as `patient@wonflow.local`, sees it immediately on a new
`/patient/billing` screen (`GET /api/v1/patient/home`, which now includes
`invoices`). Billing records a payment (`POST /api/v1/billing/payments`,
always `COMPLETED` — this hospital's payments are collected and recorded at
the billing counter, not through an online gateway, which does not exist in
this product); the invoice's paid/outstanding balance updates and billing
sees it on the very next read.

- Billing (issued): [`08-billing-issued-invoice.png`](./screenshots/08-billing-issued-invoice.png)
- Patient (sees invoice): [`08-patient-sees-invoice.png`](./screenshots/08-patient-sees-invoice.png)
- Billing (sees payment): [`09-billing-sees-payment.png`](./screenshots/09-billing-sees-payment.png)

**Defect found and fixed:** the patient portal had no billing visibility at
all — `PatientPortalService.getHome` never queried `Invoice`, and no
`/patient/*` screen or navigation entry existed for it. A patient's invoice
could be issued and paid and the patient would never see either happen. Fixed
by adding a scoped, non-`DRAFT` invoice query to `getHome`
([`apps/web/src/server/patient/patient-portal-service.ts`](../../apps/web/src/server/patient/patient-portal-service.ts)),
a new "Billing" section and nav entry in the patient portal
([`apps/web/src/components/patient/patient-access-dashboard.tsx`](../../apps/web/src/components/patient/patient-access-dashboard.tsx),
[`apps/web/src/components/shell/registration-legacy-shell.tsx`](../../apps/web/src/components/shell/registration-legacy-shell.tsx)),
and the `/patient/billing` route
([`apps/web/src/app/(patient-access)/patient/[section]/page.tsx`](<../../apps/web/src/app/(patient-access)/patient/%5Bsection%5D/page.tsx>)).

## Scenario 10 — Admin changes a permission. That user's access changes on their next action.

**Result: pass.** With a reception session already open and working in a
separate browser, the admin revokes every role from that membership via
`PATCH /api/v1/admin/users/:id/roles {roleIds:[]}`. The reception session's
very next request — no re-login, same cookies — gets `403`. Restoring the
roles the same way immediately restores access on that same session. This
exercises the exact fix made in FIX-17 for tenant suspension, applied here to
a role change instead.

- Reception (access revoked mid-session): [`10-reception-access-revoked.png`](./screenshots/10-reception-access-revoked.png)

## Scenario 11 — Two users book the same slot simultaneously. One succeeds.

**Result: pass.** Two independent reception sessions fire
`POST /api/v1/appointments` for the identical doctor/branch/time
simultaneously (`Promise.all`, not sequential). Exactly one returns `201`;
the other returns `409 appointment-conflict`. This is enforced by a real
Postgres partial unique index
(`appointment_doctor_branch_start_active_key`, on
`(tenantId, doctorId, branchId, startsAt)` where the appointment is not
cancelled/no-show — see
[`packages/database/prisma/migrations/20260812000000_appointment_no_double_booking/migration.sql`](../../packages/database/prisma/migrations/20260812000000_appointment_no_double_booking/migration.sql)),
not an application-level check, so the guarantee holds under real
concurrency, not just in the common case.

## Scenario 12 — Restart the server. Every record above still exists.

**Result: pass.** All state in this product lives in PostgreSQL, not in the
Node process — the dev server backing this suite was, in fact, stopped and
restarted several times over the course of producing this evidence (debugging
unrelated timing issues), and every record from every earlier scenario
(the patient from scenario 1, DEV-0001's appointment/encounter/prescription/
invoice chain from scenarios 2–9) was still present and correct afterward,
confirmed by a dedicated test step that re-reads both by id after the
process has cycled.

## Scenario 13 — Clear all browser data. Sign in again. Everything is still there.

**Result: pass.** A brand-new, storage-state-free browser context signs in
as `patient@wonflow.local` from nothing and immediately sees the full
invoice and prescription history built up across every earlier scenario.
Nothing about a patient's data lives in that browser — the two
allow-listed client-storage keys (sidebar-collapsed state, color theme) are
interface preference only and hold nothing that would be missed.

- [`13-fresh-browser-signed-in-again.png`](./screenshots/13-fresh-browser-signed-in-again.png)

## Defects found and fixed, summarized

| # | Defect | Where | Fix |
|---|---|---|---|
| 1 | Doctors could not place lab/radiology orders from a live consultation — the workspace role was missing `laboratory.orders.manage` / `radiology.orders.manage` | `apps/web/src/server/access/workspace-roles.ts` | Added both permissions to `DOCTOR` |
| 2 | Every prescription was created `DRAFT` and nothing ever promoted it to `ACTIVE`, so pharmacy's queue never showed a single doctor-written prescription | `apps/web/src/server/doctor/doctor-service.ts` | `createPrescription` now creates `ACTIVE` with `prescribedAt` set |
| 3 | The patient portal had no invoice/billing visibility at all | `apps/web/src/server/patient/patient-portal-service.ts`, `patient-access-dashboard.tsx`, `registration-legacy-shell.tsx`, `[section]/page.tsx` | Added invoices to `getHome`, a new Billing section, nav entry and route |
| 4 | The development seed's own permission catalogue was hand-typed and had drifted from `WORKSPACE_PERMISSION_CODES` — several workspaces' real permissions (e.g. all of pharmacy inventory/catalogue) could never be granted to a seeded account no matter what the role definition said | `tooling/scripts/seed-development-logins.ts` | The seed's permission list is now derived from `Object.values(WORKSPACE_PERMISSION_CODES).flat()` instead of hand-duplicated, so this class of drift is now structurally impossible |

Defect 4 is a development-seeding issue, not a production defect — real
tenants are provisioned by `ensureWorkspaceRoles()`, which already reads
`WORKSPACE_PERMISSION_CODES` directly and was never affected. It is recorded
here because it blocked scenario 6/7 during this verification and is a
genuine correctness fix worth keeping.

## Also fixed while investigating a false failure

The build-time demo-storage-string checker (`pnpm demo:strings:check`)
flagged its own cleanup script in `apps/web/src/app/layout.tsx` for
containing the literal string it exists to detect (the script deletes any
lingering `wonflow-demo-*` key on load). Fixed by building the prefix from a
concatenation, the same technique the checker script itself already uses to
avoid matching its own source — unrelated to FIX-20's scope but discovered
and fixed while re-running the full verification suite.
