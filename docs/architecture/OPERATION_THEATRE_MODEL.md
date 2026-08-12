# WonFlow Operation Theatre and Surgical Care Model

## Document Status

```text
Task: WF-038
Status: Approved architecture baseline
Scope: Surgical requests, theatre scheduling, anaesthesia, intraoperative care and recovery
```

## Core Distinction

WonFlow separates:

```text
Surgical case request
= Clinical request for an operation or invasive procedure

Surgical case
= Confirmed operational record for the planned surgery

Surgical procedure
= One clinical procedure planned or performed

Theatre reservation
= Protected operating-room time

Resource reservation
= Equipment, staff and support resources

Preoperative assessment
= Patient readiness and risk review

Anaesthesia case
= Anaesthesia planning and delivery

Procedure note
= Clinical record of the operation performed

Recovery stay
= Post-anaesthesia monitoring and disposition
```

## Complete Surgical Journey

```text
Procedure requested
→ Clinical review
→ Authorization and financial review
→ Preoperative assessment
→ Anaesthesia assessment
→ Consent
→ Surgical site verification
→ Theatre and resources scheduled
→ Surgical team confirmed
→ Patient arrives
→ Preoperative checks
→ Sign-in
→ Patient enters theatre
→ Anaesthesia induction
→ Time-out
→ Procedure begins
→ Intraoperative documentation
→ Procedure completed
→ Sign-out
→ Patient transferred to recovery
→ Recovery monitoring
→ Ward, ICU, day-care or home
→ Procedure note signed
```

## Supported Surgical Cases

WonFlow supports:

- Elective surgery
- Urgent surgery
- Emergency surgery
- Immediate life-saving surgery
- Inpatient surgery
- Day surgery
- Outpatient procedures
- Diagnostic procedures
- Therapeutic procedures
- Interventional procedures
- Minor procedures
- Cross-branch surgical care

## Surgical Case Identity

Each request receives:

```text
SUR-REQ-2026-000481
```

The confirmed surgical case receives:

```text
SUR-2026-000481
```

These remain separate from:

- Patient MR number
- Encounter number
- Admission number
- Theatre reservation
- Anaesthesia case number
- Recovery number
- Procedure-note number
- Invoice number

## Surgical Request

A surgical request may contain:

- Clinical indication
- Provisional diagnosis
- Diagnosis codes
- Requested procedures
- Priority
- Preferred surgeon
- Preferred date
- Estimated duration
- Anaesthesia requirement
- Implant requirement
- Blood-product requirement
- Specimen expectation
- Isolation
- Special equipment
- Financial clearance
- Insurance authorization
- Supporting reports

## Surgical Priority

Priority levels include:

```text
Routine
Priority
Urgent
Emergency
Immediate
```

Clinical priority may override ordinary scheduling order.

Priority changes must record:

- Previous priority
- New priority
- Clinical reason
- Authorized practitioner
- Date and time

## Elective Surgery

```text
Surgical request approved
→ Preoperative investigations completed
→ Insurance authorization confirmed
→ Patient medically cleared
→ Theatre slot reserved
→ Team and equipment confirmed
→ Patient receives preparation instructions
```

## Emergency Surgery

```text
Emergency condition identified
→ Surgeon and anaesthesiologist notified
→ Emergency theatre identified
→ Essential safety checks completed
→ Procedure begins
→ Missing administrative work completed later
```

Emergency treatment must not be blocked by optional financial or administrative fields.

Any abbreviated emergency checklist must remain auditable.

## Theatre Structure

```text
Organization
└── Branch
    └── Surgical Department
        └── Theatre Suite
            └── Operating Theatre Room
                ├── Equipment
                ├── Instrument Sets
                └── Assigned Team
```

## Theatre Suites

Theatre suites may be configured for:

- General surgery
- Orthopaedics
- Cardiac surgery
- Neurosurgery
- Obstetrics
- Paediatric surgery
- Ophthalmology
- ENT
- Urology
- Dentistry
- Endoscopy
- Interventional procedures
- Minor procedures
- Hybrid surgery

## Theatre Operational Status

A theatre room may be:

```text
Available
Reserved
Occupied
Cleaning
Decontamination
Maintenance
Blocked
Out of Service
```

A room must not be scheduled while it is incompatible or unavailable.

## Scheduling Blocks

Theatre schedules may contain:

- Elective lists
- Emergency capacity
- Specialty blocks
- Surgeon blocks
- Reserved capacity
- Cleaning blocks
- Maintenance blocks

Example:

```text
Monday 08:00–14:00
Orthopaedic elective list
Theatre 2
```

## Theatre Reservation

A reservation protects:

- Theatre suite
- Theatre room
- Date and time
- Setup time
- Procedure time
- Cleaning time
- Surgical case
- Priority

The backend will use atomic reservations and idempotency keys.

Two surgical cases must not receive the same final theatre capacity.

## Reservation Lifecycle

```text
Requested
→ Held
→ Confirmed
→ Committed
→ Released
```

Possible alternative outcomes:

```text
Expired
Cancelled
Rejected
```

Temporary holds must expire automatically when booking is not completed.

## Resource Reservations

A surgical case may require:

- Anaesthesia machine
- Ventilator
- Operating table
- Surgical lights
- Imaging equipment
- Endoscopy equipment
- Microscope
- Robotic system
- Electrosurgical unit
- Patient monitors
- Infusion pumps
- Blood warmer
- Recovery bed
- Instrument sets
- Special staff

A theatre reservation alone does not guarantee that all required resources are available.

## Equipment Safety

Before use, equipment may require:

- Operational status confirmation
- Cleaning
- Sterilization
- Calibration
- Maintenance validation
- Accessory availability
- Power and gas checks

Quarantined or out-of-service equipment must not be assigned normally.

## Surgical Team

The surgical team may include:

- Primary surgeon
- Assistant surgeon
- Consulting surgeon
- Anaesthesiologist
- Anaesthesia assistant
- Scrub nurse
- Circulating nurse
- Theatre technician
- Radiographer
- Perfusionist
- Paediatrician
- Neonatologist
- Pathologist
- Authorized observer

Each team assignment records:

- Role
- Person
- Confirmation
- Check-in
- Replacement
- Completion

## Team Replacement

When a team member becomes unavailable:

```text
Unavailability recorded
→ Replacement identified
→ Qualifications checked
→ Assignment updated
→ Affected team notified
```

The original assignment remains preserved.

## Preoperative Assessment

The assessment may review:

- Medical history
- Surgical history
- Medicines
- Allergies
- Fasting
- Laboratory results
- Imaging
- Anticoagulation
- Infection risk
- Thrombosis risk
- Pregnancy
- Blood availability
- Special preparation
- Expected postoperative care

## Preoperative Clearance

Possible outcomes:

```text
Cleared
Conditionally Cleared
Not Cleared
Additional Information Required
```

Conditional clearance must show the exact requirements.

Example:

```text
Conditionally cleared:
Repeat potassium result required before theatre transfer.
```

## Fasting Verification

Fasting documentation may record:

- Last solid food
- Last clear fluid
- Required fasting duration
- Actual fasting duration
- Exception
- Emergency risk–benefit decision

The planned operation must not silently proceed when required fasting criteria are not met.

## Surgical Consent

Consent may be required for:

- Procedure
- Anaesthesia
- Blood products
- Implant
- Photography
- Research
- Other organization-defined activities

Consent records:

- Patient or authorized representative
- Language
- Translator
- Capacity
- Risks
- Benefits
- Alternatives
- Questions
- Practitioner
- Witness
- Date and time

## Emergency Consent

Emergency treatment may proceed through an authorized emergency pathway when the patient cannot consent and delay would create serious harm.

The reason and authorizing clinical decision must be documented.

## Site and Laterality Verification

Before surgery, WonFlow compares:

```text
Schedule
Consent
Clinical record
Patient confirmation
Imaging
Site marking
```

The following must agree:

- Patient
- Procedure
- Body site
- Laterality

A conflict blocks normal progression until resolved.

## Surgical Site Marking

Site marking may record:

- Whether marking is required
- Marked site
- Laterality
- Marking practitioner
- Date and time
- Patient confirmation

Site marking is not required for every procedure, but the reason must be clear.

## Surgical Safety Checklist

The checklist contains three controlled phases:

```text
Sign-In
Time-Out
Sign-Out
```

## Sign-In

Sign-in normally occurs before anaesthesia.

It may confirm:

- Patient identity
- Procedure
- Site
- Consent
- Allergies
- Airway risk
- Aspiration risk
- Blood-loss risk
- Equipment checks
- Monitoring
- Blood availability

## Time-Out

Time-out normally occurs before incision.

It may confirm:

- Team introductions
- Patient
- Procedure
- Site and laterality
- Antibiotic prophylaxis
- Critical surgical steps
- Anaesthesia concerns
- Nursing concerns
- Imaging availability
- Equipment and implants
- Specimen requirements

A failed required time-out item blocks normal procedure start.

## Sign-Out

Sign-out normally occurs before the patient leaves theatre.

It may confirm:

- Procedure performed
- Instrument and swab counts
- Specimens
- Implant documentation
- Equipment issues
- Postoperative plan
- Recovery destination
- Complications

## Checklist Overrides

An override requires:

- Authorized user
- Clinical reason
- Date and time
- Related checklist item
- Audit record

An override must not silently mark a failed item as normal.

## Anaesthesia Assessment

The anaesthesiologist may assess:

- Anaesthesia risk classification
- Airway
- Previous anaesthesia problems
- Aspiration
- Nausea risk
- Cardiac condition
- Respiratory condition
- Kidney function
- Medicines
- Allergies
- Fasting
- Postoperative destination

## Anaesthesia Plan

The plan may include:

- Anaesthesia type
- Airway method
- Induction
- Maintenance
- Emergence
- Analgesia
- Antiemetic
- Fluids
- Blood products
- Regional block
- Invasive monitoring
- Postoperative destination

## Anaesthesia Types

WonFlow supports:

- General anaesthesia
- Regional anaesthesia
- Spinal anaesthesia
- Epidural anaesthesia
- Local anaesthesia
- Sedation
- Monitored anaesthesia care
- Combined techniques
- No anaesthesia
- Other configured methods

## Anaesthesia Case

Example:

```text
ANE-2026-000481
```

The anaesthesia case records:

- Plan
- Anaesthesiologist
- Anaesthesia assistant
- Airway
- Induction
- Maintenance
- Emergence
- Transfer to recovery
- Difficult airway
- Adverse events

## Anaesthesia Observations

Observations may include:

- Heart rate
- Blood pressure
- Oxygen saturation
- Respiratory rate
- End-tidal carbon dioxide
- Airway pressure
- Temperature
- Anaesthetic concentration
- Neuromuscular monitoring
- Urine output
- Blood loss
- Other configured measurements

Automatically imported values identify the monitoring device.

## Anaesthesia Medicines

Medication administration records:

- Medicine
- Dose
- Route
- Time
- Infusion rate
- Anaesthesia case
- Practitioner
- Batch when relevant
- Indication
- Patient response

## Intraoperative Timeline

WonFlow maintains a chronological surgical timeline.

Example:

```text
08:10 Patient entered theatre
08:18 Anaesthesia started
08:29 Airway secured
08:35 Time-out completed
08:38 Incision
09:25 Specimen collected
10:10 Procedure completed
10:20 Patient transferred to recovery
```

## Procedure Conversion

Sometimes the planned procedure changes.

Example:

```text
Planned:
Laparoscopic procedure

Converted to:
Open procedure
```

The record preserves:

- Original procedure
- New procedure
- Time
- Reason
- Surgeon
- Additional consent considerations
- Resource impact

## Unexpected Findings

Unexpected findings must be documented separately from the original plan.

They may affect:

- Procedure
- Specimen collection
- Implant choice
- Patient prognosis
- Postoperative plan
- Family communication

## Surgical Implants

Implant records may include:

- Implant code
- Manufacturer
- Model
- Size
- Serial number
- Lot number
- Unique device identifier
- Batch
- Expiry
- Body site
- Laterality
- Implanting surgeon
- Date and time

This supports:

- Patient safety
- Product recalls
- Billing
- Inventory traceability
- Future removal or revision

## Implant Wastage

Opened but unused implants remain recorded with:

- Item
- Batch
- Reason
- User
- Time
- Inventory consequence
- Financial consequence

## Consumable Usage

Surgical consumables may include:

- Sutures
- Staplers
- Drapes
- Catheters
- Disposable instruments
- Dressings
- Haemostatic products
- Other configured items

Actual quantities used may create billing and inventory transactions.

## Surgical Specimens

A surgical specimen receives a unique number such as:

```text
SUR-SPC-2026-000481
```

The record may include:

- Specimen type
- Body site
- Laterality
- Description
- Container
- Preservative
- Label
- Barcode
- Collector
- Verification
- Destination
- Laboratory order

## Specimen Verification

Before dispatch, staff confirm:

- Patient
- Surgical case
- Specimen type
- Body site
- Laterality
- Container
- Label
- Destination

A rejected or lost specimen requires controlled escalation.

## Surgical Counts

The team may confirm counts for:

- Instruments
- Swabs
- Needles
- Blades
- Other accountable items

A count discrepancy must be resolved or escalated before normal completion.

## Surgical Procedure Note

The procedure note may include:

- Preoperative diagnosis
- Postoperative diagnosis
- Procedures performed
- Surgeons
- Anaesthesia
- Findings
- Technique
- Blood loss
- Fluids
- Blood products
- Implants
- Specimens
- Drains
- Closure
- Counts
- Complications
- Patient condition
- Postoperative instructions

Example:

```text
SUR-NOTE-2026-000481
```

## Signed Procedure Notes

A signed procedure note must not be silently edited.

Changes use:

- Addendum
- Amendment
- Correction
- Replacement according to policy

The original signed version remains preserved.

## Transfer to Recovery

Before transfer, the team confirms:

- Airway
- Breathing
- Circulation
- Consciousness
- Pain plan
- Nausea plan
- Surgical site
- Drains
- Blood loss
- Fluids
- Complications
- Required monitoring
- Destination

## Recovery Identity

Each recovery stay may receive:

```text
PACU-2026-000481
```

## Recovery Monitoring

Recovery assessments may include:

- Consciousness
- Airway
- Breathing
- Circulation
- Oxygen saturation
- Pain
- Nausea
- Sedation
- Temperature
- Bleeding
- Surgical site
- Recovery score
- Clinical deterioration

## Recovery Deterioration

```text
Critical recovery finding
→ Immediate intervention
→ Anaesthesiologist or surgeon notified
→ Escalation recorded
→ ICU or HDU transfer considered
```

## Recovery Discharge Criteria

Discharge readiness may require:

- Stable airway
- Stable breathing
- Stable circulation
- Acceptable consciousness
- Controlled pain
- Controlled nausea
- Controlled bleeding
- Acceptable recovery score
- Appropriate mobility
- Escort for day surgery
- Suitable destination

## Recovery Disposition

Possible destinations include:

- Ward
- HDU
- ICU
- Day-care unit
- Home
- Another branch
- External hospital
- Mortuary
- Other configured destination

## Day-Surgery Discharge

Day-surgery discharge may require:

- Recovery criteria
- Oral intake where applicable
- Mobility
- Urination where applicable
- Pain control
- Nausea control
- Responsible adult escort
- Written instructions
- Medicines
- Emergency contact information
- Follow-up plan

## Postoperative Handover

The receiving team may receive:

- Procedure performed
- Anaesthesia
- Allergies
- Blood loss
- Fluids
- Medicines
- Implants
- Drains
- Wounds
- Complications
- Monitoring requirements
- Pain plan
- Pending results
- Surgeon instructions

## Surgical Complications

Complications may occur during:

- Preoperative preparation
- Anaesthesia
- Surgery
- Recovery
- Postoperative care

Severity may be:

```text
Minor
Moderate
Major
Life-Threatening
Fatal
```

Every complication records:

- Description
- Severity
- Time
- Immediate action
- Outcome
- Responsible staff
- Incident-report requirement
- Disclosure requirement

## Surgery Cancellation

Cancellation reasons may include:

- Patient unfit
- Patient declined
- Consent unavailable
- Fasting incomplete
- Investigation abnormal
- Surgeon unavailable
- Anaesthesiologist unavailable
- Theatre unavailable
- Equipment unavailable
- Implant unavailable
- Blood unavailable
- Emergency case displacement
- Financial or insurance issue
- Other clinical or operational reason

Cancellation never deletes the surgical record.

## Postponement

Postponement preserves the case for rescheduling.

```text
Case postponed
→ Reason recorded
→ Existing reservations released
→ Patient notified
→ New date searched
→ Resources re-reserved
```

## Emergency Case Displacement

An emergency case may displace an elective case.

WonFlow records:

- Emergency priority
- Affected elective case
- Decision maker
- Released reservations
- Patient notification
- Rescheduling action

## Theatre Cleaning

After surgery:

```text
Theatre occupied
→ Patient leaves
→ Theatre marked cleaning
→ Cleaning completed
→ Decontamination when required
→ Equipment checked
→ Theatre available
```

The room must not become available before the cleaning workflow is completed.

## Infection-Control Cases

Infectious or isolation cases may require:

- Dedicated theatre
- Scheduling position
- Protective equipment
- Decontamination
- Waste controls
- Air-handling requirements
- Restricted movement
- Extended cleaning time

## Cross-Branch Surgery

```text
Request created at Branch A
→ Case accepted at Branch B
→ Theatre and team scheduled at Branch B
→ Patient transferred
→ Surgery performed
→ Recovery and postoperative destination documented
```

The patient retains the same organization-level identity.

## Billing Integration

Surgical billing may use:

- Procedure
- Surgeon fee
- Anaesthesia fee
- Theatre duration
- Recovery duration
- Implant
- Consumables
- Equipment
- Blood products
- Bed
- Medicines
- Laboratory and radiology
- Package rules

Actual usage should normally drive final billable quantities.

## Inventory Integration

Surgery may consume:

- Implants
- Medicines
- Controlled medicines
- Blood products
- Instrument sets
- Disposable consumables
- Sterile packs

Every inventory-linked item retains batch and expiry traceability where applicable.

## Patient Access

Patient Access may show:

- Surgery date
- Branch
- Preparation instructions
- Fasting instructions
- Admission instructions
- Consent status
- Rescheduling or cancellation message
- Postoperative instructions
- Procedure summary where released
- Follow-up appointment

Patient Access must not expose internal theatre scheduling or information about other patients.

## Interface Principles

Operation-theatre interfaces should use:

- Clean white foundation
- Blue and purple navigation
- Soft specialty-specific tints
- Green cleared and completed states
- Amber pending and delayed states
- Red safety blocks and critical events
- Compact theatre schedule
- Clear timeline
- Strong patient-safety banner
- Distinct procedure, anaesthesia and recovery sections
- Minimal unnecessary scrolling
- Touch-friendly theatre controls
- Dark image areas only where clinically useful

The theatre board should look operational and professional, not like a crowded calendar spreadsheet.

## Safety Rules

1. Surgical request and surgical case remain separate.
2. One surgical case may contain multiple procedures.
3. Theatre reservation and resource reservation remain separate.
4. Theatre reservations are atomic.
5. Setup, procedure and cleaning time are included in capacity.
6. Required team roles must be confirmed.
7. Preoperative and anaesthesia clearance remain separately auditable.
8. Consent is recorded per required activity.
9. Procedure, patient, site and laterality are verified.
10. Sign-in, time-out and sign-out remain distinct checklist phases.
11. Failed required checklist items block normal progression.
12. Anaesthesia planning and administration remain separate.
13. Intraoperative events use a chronological timeline.
14. Procedure conversion preserves original and final procedures.
15. Implants retain serial, lot and batch traceability.
16. Specimens retain patient, site and destination traceability.
17. Signed procedure notes cannot be silently edited.
18. Recovery discharge requires explicit readiness assessment.
19. Cancellations and postponements preserve history.
20. Significant surgical activity remains auditable.

## Audit Requirements

WonFlow preserves:

- Surgical request
- Clinical review
- Authorization and financial review
- Preoperative assessment
- Anaesthesia assessment
- Consent
- Site verification
- Theatre reservation
- Resource reservation
- Team confirmation
- Checklist activity
- Anaesthesia events
- Medication administration
- Procedure start and completion
- Procedure conversion
- Implants
- Consumables
- Specimens
- Counts
- Complications
- Recovery assessments
- Recovery disposition
- Procedure-note signature
- Cancellation and postponement
- User or system actor
- Date and time

## Locked Decisions

1. Surgical requests, cases and procedures remain separate.
2. Operating rooms and supporting resources are independently scheduled.
3. Theatre reservations include setup and cleaning time.
4. Atomic reservation prevents double-booking.
5. Emergency cases may displace elective cases through an auditable decision.
6. Preoperative and anaesthesia assessments remain separate.
7. Consent, site verification and safety checklists are explicit records.
8. Anaesthesia observations and medicines are linked to the anaesthesia case.
9. Intraoperative events form a chronological timeline.
10. Implants and consumables support inventory traceability.
11. Surgical specimens support laboratory linkage.
12. Procedure conversion preserves the original plan.
13. Signed procedure notes remain immutable.
14. Recovery is a separate monitored phase.
15. Recovery discharge criteria are explicitly assessed.
16. Cross-branch surgery is supported.
17. Billing uses actual surgical activity and consumption.
18. Surgery interfaces follow the premium colourful WonFlow design system.
19. Complete surgical history is preserved.

## Acceptance Checklist

- [x] Surgical requests defined
- [x] Surgical cases defined
- [x] Multiple procedures supported
- [x] Theatre suites and rooms defined
- [x] Theatre schedule blocks defined
- [x] Atomic theatre reservations defined
- [x] Equipment and resource reservations defined
- [x] Surgical teams defined
- [x] Team replacements supported
- [x] Preoperative assessments defined
- [x] Surgical consent defined
- [x] Site and laterality verification defined
- [x] Sign-in, time-out and sign-out defined
- [x] Anaesthesia assessment and planning defined
- [x] Anaesthesia cases defined
- [x] Anaesthesia observations and medicines defined
- [x] Intraoperative timeline defined
- [x] Procedure conversion supported
- [x] Implant traceability defined
- [x] Consumable usage defined
- [x] Surgical specimens defined
- [x] Procedure notes defined
- [x] Recovery stays and assessments defined
- [x] Recovery disposition defined
- [x] Surgical complications defined
- [x] Cancellation and postponement defined
- [x] Cross-branch surgery supported
- [x] Billing and inventory integration considered
- [x] Complete audit history defined