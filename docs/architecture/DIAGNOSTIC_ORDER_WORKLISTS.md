# WonFlow Diagnostic Order Worklists

## Document Status

Task: WF-066  
Portals: Doctor Workspace and Hospital Operations  
Departments: Laboratory and Radiology  
Status: Frontend demonstration baseline  
Data: Fictional browser-local diagnostic orders

## Purpose

Diagnostic worklists connect doctor-created clinical orders to the Laboratory
and Radiology departments.

## Workflow

Clinical consultation  
→ Clinical order  
→ Consultation completion  
→ Department dispatch  
→ Order acceptance  
→ Specimen collection or imaging schedule  
→ Processing  
→ Result entry  
→ Result finalization

## Supported Orders

This task dispatches:

- Laboratory orders
- Radiology orders

Procedure and referral orders will be implemented separately.

## Order Identity

Every diagnostic order stores:

- Diagnostic-order identifier
- Human-readable order number
- Accession number
- Source clinical-order identifier
- Clinical-documentation identifier
- Encounter identifier
- Patient identifier
- Practitioner identifier
- Branch identifier
- Order type
- Order name
- Priority
- Instructions
- Status
- Timestamps

Examples:

```text
LAB-YYYYMMDD-XXXX
RAD-YYYYMMDD-XXXX
LACC-YYYYMMDD-XXXXX
RACC-YYYYMMDD-XXXXX