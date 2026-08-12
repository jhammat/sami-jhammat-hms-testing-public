# WonFlow Doctor Workspace Dashboard

## Document Status

```text
Task: WF-053
Portal: Doctor Workspace
Status: Approved frontend dashboard baseline
Data: Deterministic fictional demonstration data
```

## Purpose

The Doctor Workspace provides a focused clinical view for one selected
practitioner.

```text
Doctor identity
→ Today’s schedule
→ Current queue
→ Active inpatient cases
→ Clinical actions
```

## Dashboard Capabilities

The workspace displays:

- Selected practitioner
- Operational status
- Specialty and employee number
- Next scheduled patient
- Today’s appointments
- Completed consultations
- Current queue
- Unique patients
- Active inpatient responsibilities
- Full appointment schedule
- Patient names and MR numbers
- Queue tokens and positions
- Inpatient ward and bed placement

## Practitioner Selection

The demonstration workspace allows switching between fictional practitioners.

Changing the practitioner reloads:

- Appointment schedule
- Current queue
- Inpatient cases
- Summary metrics
- Next-patient context

## Patient Lookups

The doctor projection includes patient lookup records so clinical screens can
resolve:

- Patient display name
- MR number
- Appointment ownership
- Queue ownership
- Admission ownership

## Data Flow

```text
Application provider
→ Hospital service
→ Practitioner directory
→ Doctor dashboard loader
→ Doctor dashboard projection
→ Doctor workspace
```

## Clinical Separation

The dashboard provides operational and clinical-navigation context.

It does not yet perform:

- Consultation documentation
- Diagnosis entry
- Prescription submission
- Laboratory ordering
- Radiology ordering
- Procedure authorization
- Clinical decision support

These workflows will be implemented in dedicated tasks.

## Status Presentation

Written labels accompany every status color.

Examples:

```text
Emerald
= Available or completed

Blue
= Checked in or admitted

Violet
= Consultation, procedure or transfer activity

Amber
= Waiting or pending

Rose
= Cancelled, no-show or exceptional condition
```

## Safety Rules

1. A practitioner identity must be selected.
2. Patient names are resolved from the approved projection.
3. Doctor appointments remain practitioner-specific.
4. Queue entries remain practitioner-specific.
5. Inpatient cases remain practitioner-specific.
6. Fictional records remain clearly identified.
7. Dashboard actions do not replace authorization.
8. Clinical documentation requires dedicated controlled workflows.
9. Status information always includes text.
10. Loading and confirmed data remain visually distinct.
11. A refresh retains useful previous data where possible.
12. Production access requires backend permission enforcement.

## Locked Decisions

1. The Doctor Workspace uses one selected practitioner.
2. Practitioner switching is supported during the frontend demonstration.
3. The doctor projection exposes patient lookup records.
4. The workspace includes five compact KPI cards.
5. The next patient receives prominent visibility.
6. Today’s schedule remains separate from the live queue.
7. Inpatient responsibilities remain a separate clinical panel.
8. The shared async-data foundation handles loading and errors.
9. The workspace remains inside the common WonFlow shell.
10. Consultation workflows will be implemented separately.

## Acceptance Checklist

- [x] Doctor projection exposes patient records
- [x] Doctor loader fetches patient lookups
- [x] Practitioner directory connected
- [x] Practitioner selector created
- [x] Doctor identity hero created
- [x] Operational status displayed
- [x] Next-patient context created
- [x] Today’s-appointments KPI created
- [x] Completed-consultations KPI created
- [x] Current-queue KPI created
- [x] Unique-patients KPI created
- [x] Active-inpatients KPI created
- [x] Clinical quick navigation created
- [x] Appointment schedule created
- [x] Current queue created
- [x] Inpatient cases created
- [x] Patient names and MR numbers connected
- [x] Loading, empty and error states connected
- [x] Refresh behaviour connected
- [x] Responsive layout created