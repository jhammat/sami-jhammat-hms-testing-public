# WonFlow Clinical Consultation Documentation

## Document Status

Task: WF-065  
Portal: Doctor Workspace  
Workflow: Complete Clinical Documentation  
Status: Frontend demonstration baseline  
Data: Fictional browser-local clinical documentation

## Purpose

The clinical-documentation workflow records the complete doctor consultation
connected to an existing patient encounter.

## Workflow

Clinical encounter  
→ Chief complaint  
→ Present illness  
→ Medical history  
→ Allergies and medicines  
→ Vital signs  
→ Physical examination  
→ Diagnosis  
→ Clinical orders  
→ Prescription  
→ Advice and follow-up  
→ Consultation completion

## Required Completion Fields

The consultation cannot be completed without:

- Chief complaint
- History of present illness
- Explicit allergy status
- Explicit current-medication status
- Valid vital-sign input ranges
- At least one diagnosis
- Follow-up plan or explicit no-follow-up statement

## Allergy Safety

Allergy status supports:

- Unknown
- No known allergies confirmed
- Documented allergies

Unknown allergy information must not be represented as a confirmed absence.

When documented allergies are selected, at least one allergy record is required.

## Current-Medication Safety

Current-medication status supports:

- Unknown
- Patient reports no current medication
- Documented current medication

When documented medication is selected, at least one medicine record is required.

## Vital Signs

Supported vital signs include:

- Temperature
- Pulse
- Respiratory rate
- Systolic blood pressure
- Diastolic blood pressure
- Oxygen saturation
- Weight
- Height
- Pain score

Missing values remain unknown.

The frontend performs basic input-range validation. Clinical interpretation
remains the responsibility of authorized healthcare professionals.

## Physical Examination

System-based examination supports:

- General appearance
- Cardiovascular
- Respiratory
- Abdomen
- Neurological
- Musculoskeletal
- ENT
- Skin
- Other findings

## Diagnoses

Each diagnosis may include:

- Diagnosis description
- Optional ICD code
- Provisional, differential or confirmed type
- Supporting notes

At least one diagnosis is required before completion.

## Clinical Orders

The consultation may create demonstration orders for:

- Laboratory
- Radiology
- Procedure
- Referral

Orders contain:

- Order type
- Order name
- Routine or urgent priority
- Clinical indication or instructions

The full departmental order-processing workflows remain separate.

## Prescription

Each medicine may contain:

- Medicine name
- Strength
- Dosage
- Route
- Frequency
- Duration
- Quantity
- Instructions

Prescription records created in this task are encounter documentation.

The separate pharmacy dispensing workflow will validate inventory, batch,
expiry, substitutions and actual dispensed quantities.

## Consultation Completion

Completing the consultation synchronizes:

```text
Clinical documentation → Completed
Clinical encounter → Completed
Queue entry → Completed
Appointment → Completed