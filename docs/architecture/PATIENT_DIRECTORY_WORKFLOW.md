# WonFlow Patient Directory Workflow

## Document Status

Task: WF-060  
Portal: Hospital Operations  
Workflow: Patient Directory and Search  
Status: Frontend demonstration baseline  
Data: Fictional browser-local patient registrations

## Purpose

The Patient Directory allows hospital staff to locate an existing patient
before creating appointments, bills, encounters or services.

## Search Fields

The unified patient search supports:

- Patient name
- MR number
- CNIC or B-Form
- Father or guardian name
- Primary mobile number
- Alternate mobile number
- Email address

## Filters

Staff may filter patients by:

- Registration branch
- Gender
- Minimum age
- Maximum age

## Sorting

The directory supports:

- Recently registered
- Patient name
- MR number
- Youngest first
- Oldest first

## Patient Summary

The selected-patient summary displays:

- Patient name
- MR number
- Father or guardian name
- CNIC or B-Form
- Gender
- Age
- Mobile number
- Registration branch
- Patient category
- Registration date

## Connected Actions

From the directory, staff may:

- Open a patient summary
- Create a patient bill
- Register another patient
- Return to Hospital Operations

## Data Flow

Browser-local patient registrations  
→ Patient directory reader  
→ Search and filters  
→ Selected patient  
→ Billing or another workflow

## Production Boundary

Production patient search requires:

- Backend search indexes
- Organization isolation
- Branch authorization
- Role permission
- Duplicate detection
- Audit logging
- Secure patient detail access
- Pagination
- Encrypted sensitive information

## Safety Rules

1. Search results remain organization-specific.
2. CNIC access requires authorized hospital staff.
3. Search filters do not modify patient records.
4. A selected patient must retain the correct unique identifier.
5. Billing links pass the patient ID, not merely the patient name.
6. Gender and age remain visible.
7. Father or guardian name remains searchable.
8. CNIC or B-Form remains searchable.
9. Browser-local records are demonstration-only.
10. Production search requires backend authorization.
11. Patient data must not be exposed across organizations.
12. Every production patient access must be auditable.