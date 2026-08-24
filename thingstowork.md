# WonFlow HPBSP — Build to Production

**Repository:** `jhammat/wonflow` (public mirror `jhammat/sami-public`)
**Baseline measured:** 69 Prisma models · 134 API routes · 120 pages · 18 files still on browser storage
**Objective:** the complete HPBSP clinical scope, running in production, reachable from any phone browser.

App stores are out of scope. Distribution is a web application at the practice domain, installable to the home screen. Nothing in this document waits on Apple or Google.

Run one task per Claude Code session, in order. Paste section 1 first, every time.

---

## 1. Standing context block

```
PROJECT CONTEXT — WonFlow HPBSP

Repo: pnpm monorepo. Node >= 20.9, pnpm >= 10, PostgreSQL 16, Redis.
  apps/web              Next.js App Router — the product
  apps/worker           background jobs
  packages/config       configuration and feature flags
  packages/contracts    domain and API contracts
  packages/database     Prisma schema and client
  packages/ui           shared components
  packages/validation   Zod schemas
  tooling/scripts       seeds, audits, maintenance

Commands: pnpm dev | pnpm build | pnpm check | pnpm lint | pnpm typecheck
          pnpm test | pnpm test:e2e | pnpm db:generate | pnpm db:seed:dev

=== WHAT ALREADY EXISTS — DO NOT REBUILD ===

69 models including: Tenant, Organization, Branch, Patient,
PatientAccess, PatientIdentifier, Identity, TenantMembership, Role,
Permission, RolePermission, MembershipRole, StaffProfile, DoctorProfile,
ServiceDefinition, AvailabilityRule, DoctorSitting, Appointment,
Encounter, EncounterNote, EncounterDiagnosis, ClinicalObservation,
PatientAllergy, DiagnosticOrder, DiagnosticResult, Prescription,
PrescriptionItem, Medication, Invoice, Payment, Refund, DocumentRecord,
StoredObject, DocumentAccessToken, Notification, DeviceRegistration,
AuditEvent, OutboxEvent, Queue, QueueEntry, VideoCallSession.

Auth, multi-tenancy, RBAC, audit logging, document storage with
short-lived access tokens, and the notification worker are built and
working. Reuse them.

Permissions follow the convention domain.resource.action, for example
"encounters.manage". Workspace roles are defined in
apps/web/src/server/access/workspace-roles.ts under
WORKSPACE_PERMISSION_CODES, and the development seed at
tooling/scripts/seed-development-logins.ts reads from that same map so
the two cannot drift. Extend both together.

=== THE CLINICAL SCOPE WE ARE BUILDING ===

A hepato-pancreato-biliary surgical practice in Lahore. One consultant
surgeon sitting at several hospitals, a senior registrar, residents,
house surgeons, a physiotherapist and a clinical dietitian.

Patients are largely post-operative — Whipple procedure, hepatectomy —
often elderly, mostly on mid-range Android over intermittent mobile
data, and frequently managed by a family caregiver rather than by
themselves.

The platform must deliver:
  - three new roles: physiotherapist, nutritionist, caregiver
  - physiotherapy and nutrition workspaces, access granted by referral
  - a care plan engine: the surgeon defines tasks by patient category
    and recovery phase; they flow automatically to the patient
  - a Daily Action Centre: one task list merged from every clinician
  - vitals logging with trend graphs
  - a drain tracker: volume, colour, amylase, photographs, all trended
  - medication reminders and adherence
  - a symptom log
  - an education library with completion tracking
  - lab value trends
  - offline logging that syncs when signal returns
  - alert thresholds with escalation: push, then SMS, then a call

Departmental systems for laboratory, radiology and pharmacy are
excluded. Lab values, radiology reports and prescriptions are included.

=== NON-NEGOTIABLES ===

- The server holds the truth. The browser displays it. No user data in
  localStorage, sessionStorage or module-level variables.
- Never show success before the server confirms. No fire-and-forget
  mutations.
- Every query filters by tenant. Cross-tenant access must be impossible
  to express by accident.
- Every endpoint checks permission server-side. Hiding a button is not
  security.
- Access to a patient is granted by referral or assignment with an
  expiry — never by job title alone.
- Clinical records are never hard deleted. Signed notes are immutable;
  amendments are additive and marked.
- Every patient record view and document access writes an AuditEvent.
- Money is integer minor units with an explicit currency.
- Multi-table mutations run in a transaction.
- Every failure message names what failed, why, and what to do.

=== SCOPE DISCIPLINE ===

- One task per session. No scope creep.
- Extend existing models and services rather than creating parallel
  ones. If you are about to write a second way to do something that
  already exists, stop and say so.
- Run the verification command and paste the output.
- Report every file changed, every model added, every migration created.
```

---

## 2. Task index

| ID | Task | Blocks |
|---|---|---|
| **Stage A — Unblock and stabilise** | | |
| A-01 | Make clinical observations independent of encounters | Everything in C |
| A-02 | Finish the wiring — remove the last browser storage | Delivery |
| A-03 | Fix the sitting and consultation defects | Doctor use |
| **Stage B — Roles and access** | | |
| B-01 | Three new roles and their permissions | C, D |
| B-02 | Referral-based patient access with expiry | D |
| B-03 | Caregiver accounts and delegated access | C |
| **Stage C — The monitoring layer** | | |
| C-01 | Care plans and the task engine | C-02 |
| C-02 | Daily Action Centre — patient side | — |
| C-03 | Vitals logging with trends | — |
| C-04 | Drain tracker | — |
| C-05 | Medication reminders and adherence | — |
| C-06 | Symptom log | — |
| C-07 | Results ledger and lab trends | — |
| C-08 | Education library | — |
| C-09 | Offline logging and sync | — |
| **Stage D — The two new workspaces** | | |
| D-01 | Physiotherapy workspace | — |
| D-02 | Nutrition workspace | — |
| D-03 | Referral flow from the surgeon | — |
| **Stage E — Alerting** | | |
| E-01 | Alert rules and evaluation | E-02 |
| E-02 | Escalation chain and acknowledgement | — |
| E-03 | Clinical alert console | — |
| **Stage F — Production** | | |
| F-01 | Performance and query audit | — |
| F-02 | Security and isolation audit | — |
| F-03 | Test suite | — |
| F-04 | Installable web application | — |
| F-05 | Deployment, backup and restore | — |
| F-06 | Observability and support | — |
| F-07 | Pilot readiness | GATE |

---

## 3. Stage A — Unblock and stabilise

### A-01 — Make clinical observations independent of encounters

```
TASK A-01 — Remove the schema constraint that blocks all home
monitoring.

ClinicalObservation.encounterId is currently required. Every clinical
measurement must therefore belong to a consultation. But the entire
monitoring layer is a patient at home on day four with no encounter
open, so as the schema stands that data cannot be stored at all.

This is the single blocker for Stage C. Do it first.

Migration:
1. Make ClinicalObservation.encounterId nullable.
2. Make recordedByMembershipId nullable — a patient is not a membership.
3. Add source: ObservationSource enum — STAFF, PATIENT, CAREGIVER,
   DEVICE. Default STAFF, so existing rows are correct.
4. Add recordedByIdentityId (nullable) for patient and caregiver entries.
5. Add carePlanTaskId (nullable) — set later by C-01, so the observation
   can be traced to the task that requested it.
6. Add deviceRecordedAt (nullable) — the time the patient recorded it on
   their phone, which differs from observedAt when logged offline.
7. Add index on (tenantId, patientId, source, observedAt).

Rules to encode:
- A patient- or caregiver-sourced observation is created with status
  PRELIMINARY and must remain so until a clinician confirms it. Only a
  clinician may set FINAL.
- An observation with no encounter still requires patientId and
  tenantId. There is no such thing as an untenanted measurement.
- Existing rows must be unaffected. Verify the count before and after.

Also update:
- the observation service and any contract types
- the doctor's observation entry screen, which must keep working
  unchanged

Verify:
  pnpm --filter @wonflow/database exec prisma validate
  pnpm --filter @wonflow/database exec prisma migrate dev
  pnpm check
  Report the ClinicalObservation row count before and after the
  migration, and confirm the doctor's existing observation entry still
  saves correctly.
```

### A-02 — Finish the wiring

```
TASK A-02 — Remove the last of the browser-storage persistence.

18 files under apps/web/src still read or write localStorage. Each is a
screen that appears to work and saves nothing beyond that browser tab.

Do:
1. List all 18 files with the storage keys each uses.
2. For each, read the module to learn the domain rules it encodes —
   status transitions, validation, derived values. That logic is
   correct; it belongs on the server.
3. Confirm the API route exists. If not, build it against the existing
   models before wiring.
4. Replace local reads with a fetch and local writes with an awaited
   mutation that revalidates.
5. Add loading, empty and error states.
6. Delete the storage functions.

localStorage remains permitted for exactly two things: sidebar collapse
state and theme preference. Add an ESLint rule enforcing that, with
those two files allow-listed, and a build check that fails on any
"wonflow-demo-" string in source.

Verify:
  pnpm check, then in a browser console run Object.keys(localStorage)
  after using every screen. Only the two allowed keys may appear.
  Then: create a record in Chrome, open Firefox signed in as a different
  user, and confirm it is there.
```

### A-03 — Fix the sitting and consultation defects

```
TASK A-03 — Two features that do not work, with the same root cause.

Defect 1 — the sitting. The interface writes to the browser, announces
success immediately, then attempts the server call afterwards without
watching the result. When the server refuses, the badge still reads NOT
STARTED while the banner says the sitting started. A second bug
compounds it: the server's identifier for the sitting is held in a
module-level Map, so after any page refresh the status actions fail
permanently with a message claiming the sitting was never published.

Defect 2 — the consultation. There is no endpoint to create an
encounter. Routes exist for notes, orders, prescriptions and
observations on an encounter, but nothing that makes one.

Do:
1. Build a readiness service at
   apps/web/src/server/readiness/readiness-service.ts. For each of
   start-sitting, start-consultation and book-appointment, return either
   ready, or a list of blockers. Each blocker carries a code, a plain
   sentence explaining the cause, who can resolve it, and the route that
   resolves it.
   Blockers for start-sitting: no active staff profile, no doctor
   profile, no branch assignment, branch archived, another sitting
   already active, room already occupied.
   Blockers for start-consultation: no active sitting, appointment does
   not belong to this doctor, patient not checked in, payment not
   confirmed where prepayment is required, another encounter already
   open.
2. Build POST /api/v1/doctor/encounters to create an encounter from an
   appointment, validating through the readiness check. Appointment
   status and queue entry transition in the same transaction. One open
   encounter per doctor; a second attempt returns 409 naming the patient
   already in progress.
   Also build /complete, /pause and /cancel on the encounter.
3. Rewrite the sitting save and status changes to call the server first
   and update only on a confirmed response. Delete the in-memory Map;
   the server id comes from fetched state.
4. The status badge and the message must read the same server value. It
   must be impossible for them to disagree.
5. Where readiness is blocked, disable the action and render the
   blockers with their links.

Verify:
  pnpm check, then: attempt Start Sitting on an account with no doctor
  profile and confirm the blocker names that exact cause and links to
  the team screen. Start a sitting, refresh the page, and confirm Take
  Break and End Sitting still work.
```

---

## 4. Stage B — Roles and access

### B-01 — Three new roles

```
TASK B-01 — Add physiotherapist, nutritionist and caregiver.

No schema change. Roles are Role rows with permission grants, defined in
apps/web/src/server/access/workspace-roles.ts under
WORKSPACE_PERMISSION_CODES, and seeded through
tooling/scripts/seed-development-logins.ts, which reads that same map.
Extend both together so they cannot drift.

New permission codes, following the existing domain.resource.action
convention:

  careplans.read           careplans.manage
  careplans.assign         careplans.template.manage
  therapy.assessments.read therapy.assessments.manage
  therapy.plans.manage     therapy.sessions.manage
  nutrition.assessments.read  nutrition.assessments.manage
  nutrition.plans.manage
  observations.patient.read   observations.patient.manage
  drains.read              drains.manage
  education.read           education.assign  education.manage
  alerts.read              alerts.acknowledge  alerts.configure
  referrals.create         referrals.read

New workspace roles:

  PHYSIOTHERAPIST
    patients.read (referred patients only, enforced by B-02)
    therapy.assessments.read, therapy.assessments.manage
    therapy.plans.manage, therapy.sessions.manage
    careplans.read, careplans.assign
    observations.patient.read
    documents.view, documents.upload
    education.read, education.assign
    referrals.read

  NUTRITIONIST
    patients.read (referred patients only)
    nutrition.assessments.read, nutrition.assessments.manage
    nutrition.plans.manage
    careplans.read, careplans.assign
    observations.patient.read
    documents.view, documents.upload
    education.read, education.assign
    referrals.read

  CAREGIVER
    Not a workspace role. A caregiver acts through PatientAccess on the
    patient's own portal, with the patient's permission set. Implemented
    in B-03.

Also extend DOCTOR with: careplans.manage, careplans.template.manage,
referrals.create, alerts.configure, alerts.acknowledge, drains.read,
observations.patient.read, education.manage.

Add the new roles to tenant provisioning so a new tenant receives them
automatically, and to the development seed with a working login for
each.

Verify:
  pnpm check && pnpm db:seed:dev
  Sign in as each new role and confirm the navigation shows only what
  that role can reach, and that a direct URL to a forbidden screen
  returns not-authorised rather than a blank page.
```

### B-02 — Referral-based access with expiry

```
TASK B-02 — Access follows referral, not job title.

A physiotherapist must not browse the full patient list. They see a
patient because that patient was referred to them, and that access
lapses when the episode closes.

Extend PatientAccess, which currently holds patientId, identityId,
relationship, isPrimary, isActive:
  add membershipId (nullable) — for staff access, as distinct from the
      identity-based access a patient or caregiver holds
  add accessReason: enum — SELF, CAREGIVER, TREATING_CLINICIAN,
      REFERRAL_PHYSIOTHERAPY, REFERRAL_NUTRITION, NURSING,
      ADMINISTRATIVE
  add grantedByMembershipId (nullable)
  add grantedAt, expiresAt (nullable), endedAt, endedReason
  add referralId (nullable), populated by D-03
  add index on (membershipId, isActive, expiresAt)

Build a single authorisation helper that every patient-scoped endpoint
calls. It must:
  - resolve whether the caller may access this patient, and why
  - treat an expired grant as no access, without a scheduled job — the
    expiry is evaluated at read time
  - return a typed refusal with a reason, so the interface can explain
    rather than showing an empty page
  - write an AuditEvent on every access, and on every refusal

Then apply it to every existing patient-scoped route. A route that does
not call it is a bug — list any you find that currently rely on role
alone.

Verify:
  pnpm check, plus tests: a physiotherapist with a live referral can
  open the patient; the same physiotherapist cannot open a different
  patient; after expiresAt passes, access is refused without any job
  running; every attempt appears in the audit log.
```

### B-03 — Caregiver accounts

```
TASK B-03 — Let a family member manage a patient's care.

In the first fortnight after major surgery the person who will reliably
use the application is often a son, daughter or spouse. This is not a
secondary feature.

Do:
1. Allow an Identity to hold PatientAccess to more than one patient,
   with accessReason CAREGIVER and a relationship string.
2. Invitation flow: the patient, or staff on their behalf, invites a
   caregiver by mobile number or email. Single-use token, expiring.
3. A caregiver signing in with access to several patients chooses which
   patient they are acting for, and the choice persists for the session.
4. The interface must state unmistakably, on every screen, whose record
   is being viewed. A caregiver acting for a parent must never be in
   doubt.
5. Every action a caregiver takes records both the acting identity and
   the patient, so the audit trail shows who actually entered a reading.
6. The patient can revoke caregiver access at any time. Revocation is
   immediate and recorded, never deleted.
7. Consent: the patient consents to caregiver access, versioned, using
   the existing PolicyDocument and PolicyDocumentVersion models.

Verify:
  pnpm check, then: invite a caregiver, accept, record a drain reading
  as the caregiver, and confirm the audit shows the caregiver as the
  actor and the patient as the subject. Revoke and confirm access ends
  at once.
```

---

## 5. Stage C — The monitoring layer

### C-01 — Care plans and the task engine

```
TASK C-01 — The engine that turns clinical plans into patient tasks.

This is the spine of the monitoring layer. Everything in C-02 through
C-08 either feeds it or reads from it.

New models:

  CarePlanTemplate
    tenantId, name, description, patientCategory (free text, tenant
    defined — for example "Post-Whipple", "Post-hepatectomy"),
    createdByMembershipId, isActive, timestamps

  CarePlanTemplateItem
    templateId, taskType, title, instruction, phaseStartDay,
    phaseEndDay (nullable, meaning ongoing), frequency (enum: ONCE,
    DAILY, TWICE_DAILY, THREE_TIMES_DAILY, WEEKLY, AS_NEEDED),
    timeOfDay (nullable), assignedRole (which discipline owns it),
    educationContentId (nullable), observationCode (nullable),
    isRequired, displayOrder

  CarePlan
    tenantId, patientId, templateId (nullable — a plan may be built
    from scratch), name, startDate, endDate (nullable),
    createdByMembershipId, status, timestamps

  CarePlanItem
    carePlanId, and every field from the template item, plus
    assignedByMembershipId and assignedAt. Items may be added by the
    surgeon, the physiotherapist or the nutritionist, all into the same
    plan.

  PatientTask
    tenantId, patientId, carePlanItemId, dueDate, dueTime (nullable),
    status (PENDING, COMPLETED, SKIPPED, MISSED), completedAt,
    completedByIdentityId, skipReason, generatedAt
    index on (tenantId, patientId, dueDate, status)

Task generation:
- Runs in apps/worker, daily, generating the next 48 hours of tasks for
  every active care plan. Generating a rolling window rather than the
  whole plan means a plan change takes effect within a day without
  rewriting history.
- Generation is idempotent. Running it twice must not duplicate tasks.
- A task whose due time has passed without completion becomes MISSED,
  and that transition is what C-05 and E-01 act on.

Rules:
- Editing a care plan never alters tasks already completed.
- Removing an item stops future tasks; it does not delete past ones.
- taskType values: VITALS, DRAIN, MEDICATION, EXERCISE, MEAL,
  SUPPLEMENT, EDUCATION, SYMPTOM_CHECK, WOUND_CARE, OTHER.

Also build the care plan builder for the doctor workspace: create and
edit templates, apply a template to a patient, adjust for an individual.

Verify:
  pnpm check, then: create a template, apply it to a patient, run the
  generator twice, and confirm no duplicate tasks. Change the plan and
  confirm tomorrow's tasks reflect it while yesterday's do not.
```

### C-02 — Daily Action Centre

```
TASK C-02 — One task list for the patient, merged from every clinician.

This is the screen the patient opens every day. It must be the simplest
thing in the product.

Build:
- GET /api/v1/patient/tasks returning today's tasks, grouped by time of
  day, with anything overdue shown first.
- The patient screen: today's tasks with a completion control, what is
  overdue, what is coming later today, and a simple streak or
  completion figure for the week.
- Completing a task that carries an observation code opens the relevant
  entry — a vitals task opens vitals entry, a drain task opens the drain
  form — and completion is recorded with the reading in one action.
- Skipping requires a reason, chosen from a short list plus free text.
- Tasks assigned by different clinicians are visually distinguishable by
  discipline, but they are one list. The patient must never have to
  visit three places.

Design constraints:
- Mobile first. Large touch targets. Readable at arm's length by an
  elderly patient.
- No more than one screen of scrolling for a typical day. If a plan
  generates more tasks than that, show the next three and a count.
- Works with one hand.
- No clinical jargon in task titles. The clinician writes the
  instruction; the interface does not add to it.

Verify:
  pnpm check, then complete a full day of tasks on a 360px viewport and
  report the number of taps required.
```

### C-03 — Vitals logging with trends

```
TASK C-03 — Patient-recorded vitals, trended.

Depends on A-01, which made observations independent of encounters.

Vitals to support, each with its LOINC-style code, unit and sensible
input range: temperature, systolic and diastolic blood pressure, pulse,
respiratory rate, oxygen saturation, weight, blood glucose, pain score.

Build:
- POST /api/v1/patient/observations — creates a ClinicalObservation with
  source PATIENT or CAREGIVER, status PRELIMINARY.
- GET /api/v1/patient/observations — the patient's own history.
- GET /api/v1/patients/[patientId]/observations/trends — for clinicians,
  returning a series per code over a date range.
- Patient entry screen: one vital at a time, large numeric input,
  previous value shown for context, immediate feedback if a value is
  outside the plausible input range.
- Trend graphs on both sides. The clinician view overlays related
  markers and marks the threshold line from E-01.

Rules:
- A patient-entered value is PRELIMINARY. A clinician may confirm it to
  FINAL, and that action is audited.
- An implausible value is questioned, not rejected. "That is unusually
  high — please check and confirm" rather than a validation error,
  because the value may be real and the patient may be unwell.
- Never show a clinical interpretation to the patient. The application
  records; the clinician interprets.

Verify:
  pnpm check, then record a week of vitals as a patient and confirm the
  clinician sees a correct trend graph.
```

### C-04 — Drain tracker

```
TASK C-04 — The highest-value clinical feature in the platform.

Many HPB patients go home with drains. Volume, colour and amylase
trended together are how a pancreatic fistula, bile leak, chyle leak or
bleed announces itself before the patient feels seriously unwell.

Build it as a first-class record rather than forcing it through
observations, because colour and photographs do not fit that shape.

New models:

  PatientDrain
    tenantId, patientId, label (for example "Drain 1", "Left subhepatic"),
    site, insertedAt, removedAt (nullable), insertedByMembershipId,
    isActive, notes

  DrainLog
    tenantId, patientId, drainId, recordedAt, deviceRecordedAt,
    volumeMl (integer), colour (enum: CLEAR, PALE_YELLOW, RED,
    DARK_BROWN, GREEN, MILKY, OTHER), colourNote (nullable),
    character (nullable enum: SEROUS, SEROSANGUINOUS, PURULENT, BILIOUS,
    CHYLOUS), amylaseValue (nullable decimal), amylaseUnit,
    amylaseSource (PATIENT_REPORTED or LAB_CONFIRMED),
    fluidPhotoDocumentId (nullable), sitePhotoDocumentId (nullable),
    recordedByIdentityId, source (PATIENT, CAREGIVER, STAFF),
    carePlanTaskId (nullable), notes
    index on (tenantId, patientId, drainId, recordedAt)

Patient entry screen:
- Volume as a large numeric input in millilitres.
- Colour as a VISUAL selector — actual colour swatches, not a dropdown
  of words. Patients describe colour inconsistently and point
  accurately. This detail matters more than it appears.
- Photograph capture for fluid and for the site, using the existing
  document upload with camera capture.
- Amylase entered when the patient has a value.
- One drain at a time when several are present, clearly labelled.

Clinician view:
- Volume, colour and amylase on one timeline per drain, so a change in
  one is read against the others.
- Colour rendered as the actual colour on the chart, not a legend key.
- Photographs opened inline with zoom.
- A clear marker where colour changed between readings.

Rules:
- Photographs are clinical documents: private, scanned, opened through
  short-lived tokens, every access audited. Reuse the existing
  DocumentRecord and DocumentAccessToken machinery.
- Never show the patient an interpretation of their drain output. Record
  and escalate; do not advise.
- A drain removed stops generating tasks but its history remains.

Verify:
  pnpm check, then: record five days of drain output including a colour
  change and an amylase value, and confirm the clinician timeline makes
  the change immediately visible.
```

### C-05 — Medication reminders and adherence

```
TASK C-05 — Turn prescriptions into reminders, and record what was
actually taken.

Prescription and PrescriptionItem already exist. Build on them.

Do:
1. Generate MEDICATION care plan items from an active prescription, at
   the prescribed frequency and times.
2. Patient screen: what to take now, what was taken, what was missed.
3. Recording is one tap. Taken, or skipped with a reason.
4. Adherence view for the clinician: per medication, per week, with
   missed doses visible.
5. Pancreatic enzyme dosing is tied to meals rather than to clock times.
   Support a frequency of WITH_MEALS that generates tasks alongside the
   nutritionist's meal tasks.

Rules:
- Never tell a patient to change a dose. The application records
  adherence; the clinician changes prescriptions.
- A missed dose is a fact, not a failure. Wording must not shame.

Verify:
  pnpm check, then: prescribe a medication three times daily, confirm
  tasks generate correctly, mark some taken and some missed, and confirm
  the clinician adherence view is accurate.
```

### C-06 — Symptom log

```
TASK C-06 — The patient records what they feel; the team reads it.

Build the symptom LOG only. Do not build automated triage advice — an
application telling a post-Whipple patient their symptoms are probably
fine is a clinical risk we are not accepting.

New model:

  SymptomLog
    tenantId, patientId, recordedAt, deviceRecordedAt,
    symptomCode, severity (0-10 or a mild/moderate/severe scale),
    freeText, photoDocumentId (nullable), recordedByIdentityId, source,
    carePlanTaskId (nullable)

Symptom list is tenant-configurable, not hardcoded. Seed with symptoms
relevant to HPB recovery: pain, nausea, vomiting, fever, appetite,
steatorrhoea, jaundice, abdominal distension, wound discharge,
breathlessness.

Patient screen: pick a symptom, set severity, add a note, optionally a
photograph. Fast — no more than four taps for a simple entry.

Clinician view: symptoms on the same timeline as vitals and drains, so
a fever alongside a rising drain amylase reads as one picture.

Rules:
- No interpretation shown to the patient.
- Severe entries surface to the clinical team through E-01, not through
  advice to the patient.

Verify:
  pnpm check, then log three symptoms and confirm they appear on the
  clinician's combined timeline.
```

### C-07 — Results ledger and lab trends

```
TASK C-07 — Lab values recorded and trended, without a laboratory
system.

We are not building specimen tracking, worklists or analyser
interfaces. We are building the values themselves, trended.

DiagnosticOrder and DiagnosticResult already exist. Extend rather than
duplicating.

Do:
1. Structured result entry: code, display name, value, unit, reference
   low and high, abnormal flag, collected date, source facility.
2. Three entry routes, all supported:
   - staff enter values from the report a patient brings
   - the patient enters values from their own report, marked
     patient-reported until a clinician confirms
   - a report is attached as a document and values keyed in alongside it
3. Trend endpoint and graph: liver function (bilirubin, ALP, ALT),
   inflammatory markers (CRP, WBC), and drain amylase from C-04, with
   reference ranges shown and multiple markers overlaid where that aids
   reading.
4. Radiology reports attach as documents to the patient timeline and
   open beside the consultation. No image storage, no PACS.

Rules:
- A patient-entered value is never treated as confirmed until a
  clinician marks it so.
- Reference ranges are per test and tenant-configurable, since
  laboratories differ.

Verify:
  pnpm check, then enter a series of bilirubin values across three
  dates and confirm the trend renders with the reference range.
```

### C-08 — Education library

```
TASK C-08 — Assign content, and know who has watched it.

New models:

  EducationContent
    tenantId, title, description, category, contentType (VIDEO,
    DOCUMENT, ARTICLE), url or documentId, durationSeconds, language,
    isActive, displayOrder

  EducationAssignment
    tenantId, patientId, contentId, assignedByMembershipId, assignedAt,
    dueDate (nullable), carePlanItemId (nullable)

  EducationCompletion
    assignmentId, completedAt, completedByIdentityId,
    watchedSeconds (nullable), comprehensionPassed (nullable)

Do:
1. Content management for the practice: add, categorise, order, retire.
   Content is tenant data. No video is hardcoded.
2. Assignment by care plan item, so education arrives at the right
   phase rather than all at once.
3. Patient library: assigned content first, then the full library.
4. Completion tracking, and a clinician view of who has not watched
   their pre-operative preparation while there is still time to act.
5. Language field on content, so Urdu and English versions of the same
   material can both exist and the patient sees the one matching their
   preference.
6. Optional short comprehension check after critical content, for
   example drain care.

Verify:
  pnpm check, then assign three items, watch two as the patient, and
  confirm the clinician sees the third as outstanding.
```

### C-09 — Offline logging and sync

```
TASK C-09 — The hardest task in this document. Do it after C-02 to C-08
are stable.

A patient at home with intermittent signal is the normal case, not the
edge case. Vitals, drains, symptoms and task completion must record
without a connection and synchronise when one returns.

Do:
1. A local queue in IndexedDB for pending entries. Note that this is the
   one permitted exception to the no-client-storage rule, and it is an
   outbox, not a data store — entries leave it once accepted by the
   server.
2. Every entry carries a client-generated identifier and
   deviceRecordedAt. The server uses the identifier for idempotency:
   the same entry submitted twice creates one record.
3. Automatic sync on reconnection, and on application open.
4. Clear interface state: this entry is saved on your phone and will
   send when you have signal. Never a silent failure, never a false
   success.
5. Conflict handling. The common case is a patient logging offline for
   three days while a nurse edits the same record. Resolve by
   deviceRecordedAt for patient entries, and surface anything genuinely
   ambiguous to the clinician rather than guessing.
6. Reading recent data works offline from cache. Older data requires a
   connection and says so.
7. Never cache clinical data to disk in plain form beyond the outbox.
   This is a phone that gets lost.

Verify:
  pnpm check, then: enable airplane mode, record two days of vitals and
  drains, reconnect, and confirm everything arrives exactly once with
  the correct original timestamps. Submit the same queue twice and
  confirm no duplicates.
```

---

## 6. Stage D — The two new workspaces

### D-01 — Physiotherapy workspace

```
TASK D-01 — A workspace for the physiotherapist, scoped by referral.

New models:

  TherapyAssessment
    tenantId, patientId, assessedByMembershipId, assessedAt,
    mobilityScore, painScore, respiratoryFunction, independenceLevel,
    surgicalRestrictions (text), baselineNotes, goals (text)

  ExerciseDefinition
    tenantId, name, description, instruction, demonstrationDocumentId
    (nullable), defaultRepetitions, defaultSets, defaultDurationSeconds,
    precautions, category, isActive
    — a practice-owned library, not a fixed list

  TherapySession
    tenantId, patientId, conductedByMembershipId, sessionDate,
    attendanceStatus, painBefore, painAfter, progressNotes,
    goalsMet (text), nextSessionDate

Screens:
- Referred patient list. Nothing else is visible.
- Assessment: mobility, pain, respiratory function, independence,
  surgical restrictions set by the surgeon.
- Exercise library management.
- Plan assignment by recovery phase, creating CarePlanItem rows of type
  EXERCISE so they flow into the patient's Daily Action Centre.
- Progression: a goal advances as the patient meets it.
- Spirometry and step targets, recorded as observations.
- Session notes with progress against goals.
- Compliance view: who is doing their exercises and who is not.
  Sustained non-adherence after major HPB surgery is clinically
  meaningful and must surface to the surgeon, not sit quietly in a
  portal.

Verify:
  pnpm check, then: refer a patient, assign three exercises, and confirm
  they appear in that patient's Daily Action Centre with their
  demonstration content attached.
```

### D-02 — Nutrition workspace

```
TASK D-02 — A workspace for the clinical dietitian, scoped by referral.

Nutrition after HPB surgery is a clinical intervention, not general
dietary advice. Pancreatic enzyme replacement, protein targets and the
staged post-Whipple diet are the substance of it.

New models:

  NutritionAssessment
    tenantId, patientId, assessedByMembershipId, assessedAt,
    weightKg, heightCm, bmi, weightChangeSinceSurgeryKg, appetiteScore,
    intakeNotes, giSymptoms (text), enzymeRequirement, notes

  NutritionPlan
    tenantId, patientId, createdByMembershipId, startDate, endDate,
    caloricTargetKcal, proteinTargetGrams, fluidTargetMl,
    phase (tenant-defined, for example "Post-Whipple week 1"),
    foodsToAvoid (text), notes

  NutritionPlanItem
    planId, itemType (MEAL, SNACK, SUPPLEMENT, ENZYME), name,
    instruction, timeOfDay, quantity, unit, withMeal (boolean),
    displayOrder

Screens:
- Referred patient list only.
- Assessment as above.
- Plan builder: caloric and protein targets, meal structure by phase,
  enzyme dosing tied to meals, supplements, foods to avoid written for
  the patient rather than for a clinician.
- Weight trend with an alert threshold, feeding E-01.
- Everything assigned creates CarePlanItem rows of type MEAL,
  SUPPLEMENT or MEDICATION so it reaches the Daily Action Centre.

Rules:
- Enzyme items generate tasks alongside meal tasks, not at clock times.
- Steatorrhoea logged in C-06 signals inadequate enzyme dosing and
  should be visible on this workspace.

Verify:
  pnpm check, then: refer a patient, build a plan with three meals and
  an enzyme, and confirm the enzyme task appears beside each meal in the
  patient's list.
```

### D-03 — Referral flow

```
TASK D-03 — The surgeon refers; access opens; the episode closes.

New model:

  Referral
    tenantId, patientId, referredByMembershipId,
    referredToMembershipId (nullable) or referredToRole,
    discipline (PHYSIOTHERAPY, NUTRITION, OTHER), reason, goal,
    urgency, status (PENDING, ACCEPTED, IN_PROGRESS, COMPLETED,
    DECLINED), createdAt, acceptedAt, completedAt, expiresAt,
    outcomeNotes

Do:
1. Referral action from the consultation workspace and from the patient
   record.
2. Creating a referral creates the matching PatientAccess grant from
   B-02, with accessReason set and referralId linked.
3. Completing or declining a referral ends the access grant.
4. Referral inbox for each discipline: pending, in progress, completed.
5. The surgeon sees referral status and outcome on the patient record.
6. A referral has an expiry. Access does not persist indefinitely
   because someone forgot to close an episode.

Verify:
  pnpm check, then: refer a patient to physiotherapy, confirm the
  physiotherapist gains access, complete the referral, and confirm
  access ends immediately.
```

---

## 7. Stage E — Alerting

### E-01 — Alert rules and evaluation

```
TASK E-01 — Thresholds defined by the clinical team, evaluated as data
arrives.

The application's job is to capture reliably and escalate what the
surgeons tell it to escalate. It does not decide clinical significance.

New models:

  AlertRule
    tenantId, name, description, patientCategory (nullable — a rule may
    apply to a category or to all), metricType (OBSERVATION, DRAIN,
    SYMPTOM, TASK_ADHERENCE, WEIGHT_CHANGE), metricCode,
    comparator (GT, GTE, LT, LTE, EQ, CHANGE_BY, CHANGE_TO, MISSED_COUNT),
    thresholdValue, thresholdSecondary (nullable, for ranges),
    windowHours (nullable, for change and adherence rules),
    severity (INFO, WARNING, CRITICAL),
    isActive, createdByMembershipId

  PatientAlertRule
    Overrides a rule for one patient, or disables it. Because the same
    threshold is not right for every patient.

  AlertEvent
    tenantId, patientId, ruleId, triggeredAt, metricValue,
    sourceRecordType, sourceRecordId, severity,
    status (OPEN, ACKNOWLEDGED, RESOLVED, EXPIRED),
    acknowledgedByMembershipId, acknowledgedAt, resolutionNotes

Rules to seed as examples, all editable:
  drain amylase above a threshold
  drain colour changed to DARK_BROWN, GREEN or MILKY
  temperature above a threshold
  oxygen saturation below a threshold
  weight loss beyond a percentage in a window
  a number of missed medication doses in a window

Evaluation:
- Runs when a record is created, not on a schedule, so an alert fires
  the moment the patient submits.
- For offline entries, evaluation runs on sync, and the alert records
  both the device time and the arrival time.
- Deduplicate: the same rule firing repeatedly on the same condition
  produces one open alert, not fifty.

Verify:
  pnpm check, then: set a drain amylase threshold, submit a value above
  it, and confirm one alert is created with the correct severity and
  source record.
```

### E-02 — Escalation chain

```
TASK E-02 — Push, then SMS, then a call, with acknowledgement recorded.

Use the existing Notification model, NotificationChannel enum,
DeviceRegistration and apps/worker. Do not build a parallel notification
system.

New models:

  AlertRota
    tenantId, dayOfWeek, startMinute, endMinute, severity,
    primaryMembershipId, escalationMembershipId
    — who receives an alert at a given hour, and who it escalates to

  AlertEscalation
    alertEventId, step (1, 2, 3), channel, targetMembershipId,
    sentAt, deliveredAt, acknowledgedAt, failedAt, failureReason

Escalation:
1. Push notification to the primary responder immediately.
2. If unacknowledged after a configurable interval, SMS.
3. If still unacknowledged after a further interval, a call, or an SMS
   to the escalation target where a call gateway is not available.
4. Intervals are tenant-configurable per severity. CRITICAL escalates
   faster than WARNING.
5. Acknowledgement is explicit — opening a notification is not
   acknowledging. The responder confirms, and that is recorded with the
   person and the time.
6. Every step recorded, so if a patient deteriorates the record of who
   was told and when exists.

Rules:
- Notifications carry no clinical detail. "A patient needs your
  attention" and a link, never the value or the diagnosis.
- Escalation must be reliable: retries with backoff, a dead-letter queue,
  and monitoring. Once you promise escalation to a phone call, missing
  one matters.
- A resolved alert stops escalating immediately.

Verify:
  pnpm check, then: trigger a CRITICAL alert, leave it unacknowledged,
  and confirm each escalation step fires at the configured interval and
  is recorded. Acknowledge mid-chain and confirm escalation stops.
```

### E-03 — Clinical alert console

```
TASK E-03 — Where the team sees and manages alerts.

Screens:
- Open alerts, newest and most severe first, showing patient, rule,
  value, when it fired, and how long it has been open.
- Alert detail: the triggering record in context, the patient's recent
  trend for that metric, and their care plan.
- Acknowledge with an optional note. Resolve with a required note.
- Alert history per patient, on the patient record.
- Rule configuration for the practice, and per-patient overrides.
- Rota configuration.
- An alert volume view, so the team can see whether thresholds are
  producing useful signal or noise.

That last screen matters more than it appears. Alert fatigue is the real
failure mode — if thresholds are set too sensitively the team stops
reading them, and the feature becomes worse than useless. Make the
tuning easy and visible.

Verify:
  pnpm check, then: trigger three alerts of different severities,
  acknowledge one, resolve one, and confirm the console and the patient
  record both reflect the correct state.
```

---

## 8. Stage F — Production

### F-01 — Performance and query audit

```
TASK F-01 — Make it fast enough for a real clinic and a real phone.

Do:
1. Log every query in development. Load each list screen and count
   queries. Any screen issuing one query per row has an N+1 and must be
   fixed with an include or a join.
2. Add indexes for every foreign key and every column used in a filter
   or a sort. Pay particular attention to the new tables: PatientTask,
   DrainLog, ClinicalObservation, AlertEvent.
3. Paginate every list. No endpoint returns an unbounded set.
4. Seed a realistic dataset — 5,000 patients, 20,000 appointments,
   200,000 observations, 50,000 drain logs — and measure.
5. Targets: list screens under 500ms, detail screens under 300ms, the
   patient's daily task list under 200ms, trend graphs under 400ms.
6. Measure the patient application on a throttled connection and a
   low-end device profile. It is the screen that matters most and the
   device that is slowest.

Verify:
  Paste before and after query counts and timings per screen.
```

### F-02 — Security and isolation audit

```
TASK F-02 — Prove the boundaries hold.

Cover:
- Encryption at rest for the database and object storage; TLS
  everywhere.
- Secrets in environment variables or a manager, none in the repository.
- Rate limiting on authentication, upload and observation endpoints.
- CSRF protection, security headers, content security policy.
- Validation on every endpoint using the shared schemas.
- Dependency audit.

Mandatory tests, each documented:
1. Attempt to read another tenant's patient, observation, drain log,
   document and alert by identifier manipulation, at every endpoint.
   Every attempt must fail closed and be logged.
2. Attempt to read a patient the caller has no referral or assignment
   for. Refused.
3. Attempt to use an expired referral grant. Refused.
4. Attempt to open a document without a valid short-lived token.
   Refused.
5. Attempt to acknowledge an alert for another tenant. Refused.
6. Attempt to sign a note as an author whose configuration requires
   countersignature. Refused.

Verify:
  Record results in docs/security/HPBSP_REVIEW.md with the response
  code and the audit entry for each attempt.
```

### F-03 — Test suite

```
TASK F-03 — Cover what breaks silently.

Unit: care plan task generation, alert rule evaluation, escalation
timing, offline conflict resolution, permission resolution, fee
calculation, slot generation.

Integration: referral grants and expires access; care plan changes
affect future tasks only; observation confirmed by clinician;
drain log with photograph; alert triggers and escalates; offline queue
syncs idempotently.

End to end: the full journey — register, book, pay, consult, refer to
physiotherapy and nutrition, patient logs vitals and drains, alert
fires, clinician acknowledges, patient sees released summary.

Requirements:
- Negative permission cases for every role, including the three new
  ones.
- A multi-tenant test proving no data crosses between two seeded
  tenants.
- Deterministic. No reliance on wall-clock time.

Verify:
  pnpm test and pnpm test:e2e green. Paste the test counts.
```

### F-04 — Installable web application

```
TASK F-04 — Make the product feel like an app without an app store.

Do:
1. Web manifest: name, short name, icons at every required size, theme
   colour, standalone display, portrait orientation.
2. Service worker: cache the application shell and static assets, show
   a clear offline state, and never cache clinical data beyond the
   C-09 outbox.
3. Add-to-home-screen prompt, shown after the patient's first
   successful use rather than on arrival.
4. Push notification support where the browser allows it, falling back
   to SMS through the existing notification worker where it does not.
5. Every patient screen works at 360px, with safe-area handling.
6. Camera capture and file upload work from a mobile browser.
7. A short illustrated guide, in English and Urdu, showing a patient
   how to add the application to their home screen. Staff will send
   this over WhatsApp.

Verify:
  pnpm build, then run Lighthouse and report installability,
  performance and accessibility scores. Install to the home screen on a
  physical Android device and complete a full day of tasks.
```

### F-05 — Deployment, backup and restore

```
TASK F-05 — Get it running somewhere real.

Do:
1. Environments: development, staging, production.
2. CI running pnpm check, tests and build on every pull request.
3. Automated migrations on deploy, with a rollback plan.
4. The worker process running reliably, with restart on failure.
5. Object storage configured, private, encrypted at rest.
6. Domain and certificates for the practice portal.
7. Automated encrypted database backups, and object storage backup.
8. A restore drill: restore into a scratch environment and verify the
   data. An untested backup is not a backup.

Verify:
  A successful staging deploy, a completed restore drill, and a
  documented rollback. Paste the restore verification output.
```

### F-06 — Observability and support

```
TASK F-06 — Know when something breaks before the surgeon tells you.

Do:
1. Structured logging with correlation identifiers.
2. Error tracking, excluding patient identifiable data.
3. Uptime and database performance monitoring.
4. Alerts to you for: failed notifications, failed escalations, sync
   failures, authorization denial spikes, worker stalls, and any
   CRITICAL clinical alert that goes unacknowledged past its final
   escalation step.
5. A support runbook: what to check first for the ten most likely
   failures.
6. A status page or equivalent the practice can check.

Requirement: logs must never contain patient identifiable data,
observation values or document contents. Log identifiers, not values.

Verify:
  Trigger each alert condition in staging and confirm it reaches you.
```

### F-07 — Pilot readiness

```
TASK F-07 — Confirm it is safe to put in front of patients.

Checklist, each item verified and documented:
- pnpm check:full passes with zero errors
- All tests green
- No client-side persistence outside the two allowed keys and the
  offline outbox
- F-02 security review complete with no open high findings
- Restore drill passed
- Audit logging verified append-only
- Tenant isolation test passed
- Consent text finalised and approved by the practice
- The emergency-services disclaimer approved by the surgeon and shown
  unavoidably at first use
- Alert thresholds set by the clinical team, not by defaults
- Rota configured, with a named person for every hour
- Education content loaded
- Care plan templates created for the practice's patient categories
- Practice team trained, with a written runbook
- A rollback plan if the pilot must be halted

Then start with a small cohort of consenting post-operative patients,
not the full list. Review adherence weekly for the first month and drop
whatever nobody uses.

Produce docs/release/hpbsp-pilot-readiness.md with evidence for each
item, and list anything still unfinished even if outside this list.

Verify:
  Paste the output of pnpm check:full, pnpm test and pnpm test:e2e.
```

---

## 9. Order and reasoning

**A-01 first, without exception.** Every task in Stage C writes clinical measurements for a patient at home with no encounter open. Until `encounterId` is nullable, none of it can be stored. It is one migration and it unblocks the entire monitoring layer.

**Stage B before Stage C.** The physiotherapist and nutritionist need somewhere to write, and the caregiver needs to exist before the patient application is built around the assumption that someone else may be using it.

**C-01 before the rest of Stage C.** The care plan engine is what every other monitoring feature attaches to. Building the drain tracker before the task engine means building the drain tracker twice.

**C-09 last within Stage C.** Offline sync is the hardest task in this document and it touches every screen that came before it. Doing it while those screens are still changing wastes the effort.

**Stage F is not optional polish.** F-02 in particular — a system holding post-operative records for identifiable patients, with a permission model that fails open, is not deliverable regardless of how complete the features are.

**On the two features that carry the most risk.** The drain tracker is where the clinical value is, and the alerting chain is where the obligation is. Once the practice is told an alert escalates to a phone call, a missed escalation matters in a way that a missing feature does not. Build E-02 with retries, a dead-letter queue and monitoring, and test the failure paths rather than only the happy one.
