# WonFlow Inpatient Nursing Model

## Document Status

```text
Task: WF-037
Status: Approved architecture baseline
Scope: Nursing assessments, observations, care plans, shifts and medication administration
```

## Core Distinction

WonFlow separates:

```text
Nursing assessment
= Structured evaluation of the patient

Assessment finding
= One finding identified during assessment

Nursing observation
= A measured or observed clinical value

Risk assessment
= Evaluation of a specific patient risk

Care plan
= Nursing problems, goals and planned interventions

Nursing task
= Work that must be performed

Medication schedule
= Planned administration opportunity

Medication administration record
= What was actually prepared and administered

Medication exception
= Why a dose was late, held, omitted or refused
```

## Complete Nursing Journey

```text
Patient admitted
→ Nurse receives patient
→ Initial assessment completed
→ Baseline observations recorded
→ Clinical risks identified
→ Care plan created
→ Goals and interventions defined
→ Nursing tasks scheduled
→ Medicines scheduled in MAR
→ Patient monitored during shift
→ Abnormal findings escalated
→ Shift handover completed
→ Care plan reviewed
→ Discharge nursing clearance completed
```

## Initial Nursing Assessment

The initial nursing assessment may review:

- General condition
- Airway
- Breathing
- Circulation
- Neurological condition
- Pain
- Mobility
- Fall risk
- Skin integrity
- Pressure-injury risk
- Nutrition
- Hydration
- Elimination
- Sleep
- Communication
- Cognition
- Mental health
- Infection risk
- Medication safety
- Social support
- Self-care ability

## Assessment Templates

Assessment templates may vary by:

- General ward
- ICU
- HDU
- Paediatric ward
- Maternity
- Surgical ward
- Medical ward
- Mental-health unit
- Post-operative care
- Emergency observation

Templates remain versioned.

Historical assessments retain the template version originally used.

## Assessment Status

Typical lifecycle:

```text
Draft
→ In Progress
→ Completed
→ Reviewed
```

After completion, corrections use amendments rather than silently replacing
the original assessment.

## Immediate Clinical Action

When an assessment identifies a critical problem:

```text
Critical finding identified
→ Immediate action recorded
→ Responsible clinician notified
→ Escalation task created
→ Response documented
```

Examples include:

- Severe breathing difficulty
- Sudden unconsciousness
- Critical blood pressure
- Major bleeding
- High deterioration score
- Suspected sepsis
- Acute medication reaction

## Nursing Observations

Nursing observations may include:

- Heart rate
- Blood pressure
- Respiratory rate
- Oxygen saturation
- Temperature
- Pain score
- Blood glucose
- Consciousness level
- Urine output
- Drain output
- Fluid intake
- Weight
- Wound appearance
- Skin condition
- Neurological observations
- Early warning score

## Observation Integrity

Every observation records:

- Patient
- Admission
- Ward and bed
- Observation code
- Value
- Unit
- Time
- Nurse
- Method
- Position
- Reference range
- Abnormal flag
- Critical flag

Incorrect observations must not be silently overwritten.

```text
Original observation preserved
→ Corrected observation created
→ Correction reason recorded
→ User and time recorded
```

## Early Warning Scores

WonFlow may calculate configurable early warning scores.

The score may use:

- Respiratory rate
- Oxygen saturation
- Oxygen support
- Temperature
- Blood pressure
- Heart rate
- Consciousness level
- Other configured observations

A score records:

- Scoring system
- Version
- Observations used
- Total score
- Risk level
- Recommended action
- Escalation requirement
- Acknowledgement

## Deterioration Escalation

Example:

```text
New observations entered
→ Early warning score calculated
→ High-risk threshold crossed
→ Nurse alerted
→ Doctor or rapid-response team notified
→ Clinical task created
→ Acknowledgement recorded
```

The system supports clinical escalation but does not replace professional
judgment.

## Risk Assessments

Supported risks include:

- Falls
- Pressure injury
- Malnutrition
- Aspiration
- Self-harm
- Violence
- Infection
- Venous thromboembolism
- Clinical deterioration
- Medication error
- Wandering
- Seizure
- Bleeding

Each risk assessment may include:

- Scoring tool
- Score
- Risk level
- Risk factors
- Protective factors
- Prevention measures
- Review date
- Resolution

## Nursing Care Plan

A nursing care plan connects:

```text
Patient problem
→ Nursing goal
→ Nursing interventions
→ Nursing tasks
→ Evaluation
```

Example:

```text
Problem:
High fall risk

Goal:
Patient remains free from falls during admission

Interventions:
- Bed in lowest position
- Call bell within reach
- Assisted mobility
- Fall-risk signage
- Hourly safety round
```

## Care Goals

Goals may be:

- Planned
- In progress
- Achieved
- Partially achieved
- Not achieved
- No longer applicable
- Cancelled

A goal should contain a measurable or clearly observable outcome when possible.

## Nursing Interventions

Interventions may include:

- Monitoring
- Repositioning
- Mobility support
- Fall prevention
- Pressure care
- Wound care
- Infection control
- Nutrition support
- Hydration support
- Elimination care
- Oxygen support
- Airway care
- Patient education
- Emotional support
- Medication support
- Device care
- Safety observation

## Nursing Tasks

Interventions may generate recurring tasks.

Example:

```text
Intervention:
Reposition patient every two hours

Generated tasks:
08:00 reposition
10:00 reposition
12:00 reposition
14:00 reposition
```

Each task records:

- Due time
- Priority
- Assigned nurse
- Status
- Completion time
- Completion note
- Reason when not performed
- Escalation when overdue

## Overdue Tasks

An overdue task should remain visible until:

- Completed
- Reassigned
- Cancelled with reason
- Marked not performed
- Escalated

Overdue tasks must not disappear during shift change.

## Nursing Shifts

Nursing shift assignments may include:

- Morning
- Evening
- Night
- Extended
- On-call
- Custom shift

The assignment may define:

- Ward
- Rooms
- Beds
- Patients
- Team lead
- Start and end time
- Check-in and check-out
- Handover

## Shift Handover

Shift handover may include:

- Ward condition
- Staffing
- Bed status
- Critical patients
- Deteriorating patients
- Isolation patients
- Overdue tasks
- Pending medicines
- Pending observations
- Equipment issues
- Safety concerns

## Patient-Specific Handover

Each patient handover may use:

```text
Situation
Background
Assessment
Recommendation
```

It may also include:

- Active risks
- Care plans
- Pending tasks
- Pending medicines
- Pending laboratory tests
- Pending radiology studies
- Required escalation

The incoming nurse acknowledges the handover.

## Electronic Medication Administration Record

The medication administration record is separate from the medication order.

```text
Medication order
→ Administration schedule generated
→ Dose becomes due
→ Nurse performs safety checks
→ Medicine prepared
→ Medicine administered
→ Administration documented
→ Patient response monitored
```

## Medication Schedule

A schedule defines:

- Medicine
- Dose
- Route
- Planned time
- Due time
- Early window
- Late window
- As-needed status
- Hold parameters
- Independent-check requirement
- Witness requirement

## Medication Administration Rights

WonFlow supports safety checks for:

- Right patient
- Right medicine
- Right dose
- Right route
- Right time
- Right indication
- Right documentation
- Right response
- Allergy status
- Expiry
- Batch
- Clinical parameters
- Patient education

The software supports these checks but does not independently prove that the
physical medicine or patient is correct.

## Patient Identification

Before administration, staff confirm the patient using hospital policy.

Possible methods include:

- Name
- Date of birth
- MR number
- Wristband
- Bedside confirmation
- Guardian confirmation
- Electronic wristband scanning where deployed

Bed number alone is not a sufficient patient identifier.

## Allergy Review

Before administration, the nurse reviews:

- Recorded allergies
- Previous reactions
- Medication order
- Recent clinical alerts
- Relevant pharmacist warnings

A critical allergy conflict must stop normal administration until reviewed.

## Clinical Hold Parameters

Examples:

```text
Hold medicine when systolic blood pressure is below 90.

Hold insulin when blood glucose is below the prescribed threshold.

Hold selected medicine before procedure.
```

The nurse records the observed parameter and reason.

## Medication Administration Statuses

Possible outcomes include:

```text
Administered
Partially Administered
Held
Omitted
Refused
Cancelled
Entered in Error
```

These statuses must remain distinct.

## Held Medicine

A held medicine is temporarily not administered due to a clinical or
operational reason.

Examples:

- Blood pressure below limit
- Patient nil by mouth
- Procedure planned
- Doctor instruction
- Allergy concern
- Patient condition changed

The dose may be reviewed and administered later according to a new decision.

## Omitted Medicine

An omitted dose was not administered.

Possible reasons include:

- Medicine unavailable
- Patient unavailable
- Dose missed
- Route unavailable
- Administration error
- Clinical review not completed

Omission may require prescriber notification.

## Patient Refusal

When a patient refuses:

- The reason is recorded when provided
- The patient receives appropriate explanation
- Essential risks are communicated
- The prescriber is notified when required
- The refusal remains auditable

Refusal is not the same as omission.

## Late Administration

A dose outside the configured administration window is recorded as late.

The system records:

- Scheduled time
- Actual time
- Delay duration
- Reason
- Clinical review when necessary

The system must not silently change the scheduled time to hide the delay.

## Partial Administration

Example:

```text
Ordered:
10 mg

Prepared:
10 mg

Administered:
5 mg

Reason:
Patient developed intolerance during administration
```

The remaining amount and reason are documented.

## Independent Double Check

A second authorized user may be required for:

- Controlled medicines
- High-alert medicines
- Insulin
- Anticoagulants
- Paediatric doses
- Chemotherapy
- Organization-defined medicines

The witness confirms:

- Patient
- Medicine
- Dose
- Route
- Batch
- Expiry

## Controlled Medication Wastage

When part of a controlled medicine is not administered:

```text
Prepared quantity
− Administered quantity
= Wasted quantity
```

The wastage record includes:

- Quantity
- Reason
- Nurse
- Witness
- Disposal method
- Date and time

## Medication Batch Information

Administration may record:

- Inventory batch
- Batch number
- Expiry
- Pharmacy supply record

This supports product recalls and medication traceability.

## Infusions

Infusion records may include:

- Medicine
- Diluent
- Total volume
- Concentration
- Planned rate
- Current rate
- Duration
- Administration site
- Vascular-access device
- Start
- Pause
- Resume
- Rate changes
- Completion
- Stop reason
- Adverse event

## Infusion Rate Changes

Every rate change records:

- Previous rate
- New rate
- Unit
- Reason
- Nurse
- Authorizing practitioner where required
- Date and time

The previous value remains preserved.

## Patient-Controlled Medication

Patient-controlled administration may require:

- Authorized prescription
- Device configuration
- Lockout interval
- Maximum dose
- Monitoring
- Patient education
- Usage history
- Adverse-event monitoring

Detailed device integration can be expanded later.

## Patient Response

Selected medicines require reassessment.

Examples:

- Pain medicine followed by pain reassessment
- Antihypertensive followed by blood-pressure check
- Insulin followed by glucose monitoring
- Sedative followed by sedation score
- Bronchodilator followed by respiratory assessment

The response is linked to the administration record.

## Adverse Reactions

When an adverse reaction is observed:

```text
Reaction identified
→ Medicine stopped when appropriate
→ Immediate clinical response
→ Prescriber notified
→ Allergy or adverse-reaction record reviewed
→ Incident documented
→ Patient monitored
```

## Patient’s Own Medicine

A patient’s own medicine may be used only through controlled policy.

The workflow may require:

- Medicine identity verification
- Original packaging
- Expiry check
- Pharmacy review
- Prescriber approval
- Storage plan
- Administration documentation

## Verbal Emergency Orders

Emergency verbal orders may be supported when legally and operationally
permitted.

They require:

- Ordering practitioner identity
- Receiving nurse
- Read-back confirmation
- Time
- Urgency
- Later electronic confirmation
- Complete audit history

## Interface Principles

The nursing workspace should provide:

- Clean white foundation
- Blue and purple navigation
- Soft ward-specific tints
- Green completed tasks
- Amber due and pending tasks
- Red overdue and critical tasks
- Clear patient safety banner
- Compact observation chart
- Visible medication due times
- Large, safe medication action buttons
- Strong distinction between administered, held, omitted and refused
- Minimal unnecessary scrolling
- Keyboard and touch-friendly controls

Medication screens must prioritize safety over visual decoration.

## Safety Rules

1. Nursing assessments remain separate from clinical observations.
2. Corrections preserve original observations.
3. Critical findings require controlled escalation.
4. Risk assessments link to prevention plans.
5. Care plans contain goals and interventions.
6. Recurring interventions may generate tasks.
7. Overdue tasks remain visible across shifts.
8. Shift handovers require acknowledgement.
9. Medication orders and administrations remain separate.
10. Each scheduled dose has its own administration outcome.
11. Patient identification occurs before administration.
12. Allergy and medication-order checks occur before normal administration.
13. Held, omitted and refused doses remain separate.
14. Late administrations preserve scheduled and actual times.
15. High-risk medicines may require independent checking.
16. Controlled-medication wastage requires documentation.
17. Infusion rate changes preserve full history.
18. Medication responses and adverse reactions are documented.
19. Complete nursing activity remains auditable.

## Audit Requirements

WonFlow preserves:

- Nursing assessment
- Assessment completion and amendment
- Observation entry
- Observation correction
- Risk assessment
- Care-plan creation
- Goal changes
- Intervention activity
- Nursing-task assignment
- Task completion
- Overdue-task escalation
- Shift assignment
- Shift handover
- Medication schedule
- Medication safety checks
- Administration
- Hold
- Omission
- Refusal
- Partial administration
- Witness verification
- Infusion start, pause and rate change
- Medication wastage
- Patient response
- User or system actor
- Date and time

## Locked Decisions

1. Nursing assessment, observations and care plans remain separate.
2. Risk assessments may generate prevention care plans.
3. Nursing interventions may generate recurring tasks.
4. Overdue tasks persist through shift changes.
5. Shift handovers include patient-specific information.
6. Incoming staff acknowledge handovers.
7. Medication orders and MAR records remain separate.
8. One schedule represents one planned administration opportunity.
9. Every administration records the actual dose and time.
10. Administration safety checks are explicitly stored.
11. Held, omitted and refused doses are distinct.
12. Independent double checks are supported.
13. Medication batch traceability is supported.
14. Controlled-medication wastage is auditable.
15. Infusion management and rate changes are supported.
16. Patient response and adverse reactions are linked to administration.
17. Nursing interfaces follow the premium colourful WonFlow design system.
18. Complete nursing history is preserved.

## Acceptance Checklist

- [x] Nursing assessment templates defined
- [x] Nursing assessments defined
- [x] Assessment findings defined
- [x] Nursing observations defined
- [x] Observation corrections supported
- [x] Early warning scores defined
- [x] Clinical escalation supported
- [x] Nursing risk assessments defined
- [x] Care plans defined
- [x] Nursing goals defined
- [x] Nursing interventions defined
- [x] Nursing tasks defined
- [x] Recurring and overdue tasks supported
- [x] Nursing shifts defined
- [x] Shift handover defined
- [x] Patient-specific handover defined
- [x] Medication schedules defined
- [x] Administration safety checks defined
- [x] Medication administration records defined
- [x] Held, omitted and refused doses distinguished
- [x] Witness verification defined
- [x] Controlled-medication wastage defined
- [x] Infusions and rate changes defined
- [x] Patient-response monitoring defined
- [x] Complete audit history defined