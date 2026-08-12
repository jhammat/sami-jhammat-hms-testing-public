# WonFlow User Personas

## Document Status

```text
Status: Approved architecture baseline
Task: WF-018
Scope: Complete WonFlow platform
```

## Purpose

This document defines the primary user personas that will interact with
WonFlow.

A persona represents a distinct working experience and user need.

A role represents a configurable permission assignment.

One person may hold multiple roles, and small hospitals may combine several
roles into one staff account.

Example:

```text
A small-clinic employee may be:
Receptionist
+ Appointment Agent
+ Cashier
```

The interface will adapt to the user's roles, permissions, branch assignments,
department assignments and enabled modules.

## Core Access Principles

1. Users see only the organizations they are assigned to.
2. Users see only authorized branches and departments.
3. Clinical access requires a valid care or operational relationship.
4. Financial access does not automatically provide clinical access.
5. Management access does not automatically provide detailed clinical access.
6. Patient users may access only their own approved records or linked family records.
7. Every sensitive action must be auditable.
8. Hiding a button in the frontend is not sufficient authorization.
9. Production authorization must also be enforced by the backend.
10. One user account may contain multiple approved role assignments.

## Portal Families

| Portal | Primary Users |
|---|---|
| Platform Administration | WonFlow platform administrators and support teams |
| Organization Administration | Hospital owners, organization admins, branch admins and department heads |
| Hospital Operations | Reception, appointments, queues, billing, admissions and medical-record staff |
| Doctor Workspace | Doctors, consultants and authorized clinical users |
| Nursing and Care Workspace | Nurses, nursing supervisors and care coordinators |
| Diagnostics Workspace | Laboratory and radiology teams |
| Pharmacy and Inventory | Pharmacy, inventory and procurement teams |
| Management Portal | Hospital executives, finance, operations and reporting users |
| Patient Access | Patients, guardians, caregivers and family-account users |

## Final Persona Catalogue

| ID | Persona | Role Variants | Primary Portal | Access Scope | Main Responsibilities |
|---|---|---|---|---|---|
| PLT-01 | Platform Super Admin | Platform owner, platform administrator | Platform Administration | Entire WonFlow platform | Create organizations, manage plans, assign modules, manage platform administrators, review system health and global audit activity |
| PLT-02 | Platform Support and Security | Support admin, security admin, platform auditor | Platform Administration | Approved organizations and support sessions | Diagnose incidents, review security activity, provide controlled support and inspect platform health |
| ORG-01 | Organization Owner and Executive Sponsor | Hospital owner, board representative, executive sponsor | Organization Administration and Management | Entire hospital organization | Approve organizational policies, modules, subscription, high-level access and rollout decisions |
| ORG-02 | Organization Administrator | Hospital system administrator, organization administrator | Organization Administration | Entire assigned organization | Configure branches, departments, users, roles, services, workflows, branding and organization policies |
| ORG-03 | Branch Administrator | Branch manager, branch administrator | Organization Administration | Assigned branches | Configure branch facilities, staff assignments, local services, rooms, counters and operational settings |
| ORG-04 | Department Head | Head of department, specialty lead | Organization Administration and Department Workspace | Assigned departments | Manage department staff, schedules, services, rooms, performance and operational policies |
| ORG-05 | Workforce and System Administrator | HR administrator, workforce administrator, hospital IT administrator | Organization Administration | Authorized administrative scope | Manage employee records, assignments, credentials, user accounts, technical settings and access requests |
| OPS-01 | Reception and Registration Staff | Receptionist, registration officer, front-desk operator | Hospital Operations | Assigned branches and service points | Search and register patients, update demographics, check patients in and direct patient flow |
| OPS-02 | Appointment and Call-Centre Staff | Appointment agent, booking officer, call-centre agent | Hospital Operations | Assigned branches, departments and booking services | Find doctors, view availability, book, reschedule and cancel appointments |
| OPS-03 | Queue and Patient-Flow Coordinator | Queue operator, patient-flow coordinator, floor coordinator | Hospital Operations | Assigned waiting areas and departments | Generate tokens, call patients, transfer queues, manage delays and update operational location |
| OPS-04 | Cashier and Insurance Staff | Cashier, billing officer, insurance officer, claims officer | Hospital Operations and Finance | Authorized financial scope | Generate invoices, collect payments, verify coverage, manage claims and issue receipts |
| OPS-05 | Medical Records Staff | Medical record officer, document controller | Hospital Operations | Authorized patient-record scope | Manage documents, identity verification, duplicate review, record corrections and controlled patient merges |
| CLN-01 | Doctor and Consultant | Consultant, specialist, surgeon, dentist, resident, medical officer | Doctor Workspace | Assigned and authorized patients | Review patients, conduct consultations, diagnose, prescribe, order services, acknowledge results and plan follow-ups |
| CLN-02 | Nurse and Nursing Supervisor | Staff nurse, charge nurse, nursing supervisor | Nursing and Care Workspace | Assigned patients, wards and departments | Record observations, manage nursing tasks, administer medicines, support consultations and monitor inpatient care |
| CLN-03 | Care Coordinator | Case manager, referral coordinator, care coordinator | Nursing and Care Workspace | Assigned care episodes | Coordinate referrals, follow-ups, care teams, patient instructions and continuity across departments or branches |
| DX-01 | Laboratory Team | Lab technician, phlebotomist, lab supervisor, pathologist | Diagnostics Workspace | Assigned laboratory locations and orders | Collect samples, process tests, enter results, verify reports and escalate critical findings |
| DX-02 | Radiology Team | Radiology technician, imaging coordinator, radiologist | Diagnostics Workspace | Assigned imaging locations and studies | Schedule imaging, perform studies, write reports, verify results and escalate critical findings |
| PHM-01 | Pharmacy Team | Pharmacist, pharmacy technician, dispensing officer | Pharmacy and Inventory | Assigned pharmacies and prescriptions | Review prescriptions, check availability, request substitutions, dispense medicines and counsel patients |
| INV-01 | Inventory and Procurement Staff | Inventory officer, storekeeper, procurement officer | Pharmacy and Inventory | Assigned stores and inventory locations | Manage stock, purchasing, receiving, transfers, expiry, batches and replenishment |
| IPD-01 | Ward and Admission Staff | Admission officer, ward clerk, bed manager | Hospital Operations and Inpatient Workspace | Assigned branches and wards | Admit patients, assign beds, transfer patients, coordinate discharge and maintain inpatient status |
| PROC-01 | Procedure and Operation-Theatre Staff | OT coordinator, procedure coordinator, theatre scheduler | Procedure Workspace | Assigned theatres and procedure units | Schedule procedures, coordinate teams, verify resources and manage procedure statuses |
| MGT-01 | Executive and Operations Management | Hospital executive, branch director, operations manager | Management Portal | Approved organization and branch summaries | Review operational performance, patient flow, waiting time, utilization and service quality |
| MGT-02 | Finance and Reporting Management | Finance manager, revenue manager, reporting analyst | Management Portal | Approved financial and analytical scope | Review revenue, collections, receivables, discounts, refunds, insurance and scheduled reports |
| GOV-01 | Quality, Compliance and Audit Staff | Quality officer, compliance officer, internal auditor | Management and Audit Portal | Approved audit and quality scope | Review access, incidents, workflow compliance, turnaround times, corrections and audit evidence |
| PAT-01 | Patient | Adult patient, dependent patient with managed access | Patient Access | Own approved record | Find doctors, book appointments, view queues, join consultations, review released reports, prescriptions, bills and messages |
| PAT-02 | Guardian, Caregiver and Family User | Parent, legal guardian, caregiver, family-account manager | Patient Access | Explicitly linked patient profiles | Manage appointments and approved records for dependents or authorized family members |

## Specialty Handling

Specialties are generally not separate system personas.

The following are variants of the Doctor and Consultant persona:

- Cardiologist
- Neurologist
- General physician
- Surgeon
- Dentist
- Paediatrician
- Gynaecologist
- Psychiatrist
- Anaesthetist
- Emergency physician

They may receive specialty-specific screens or tools, but they still inherit the
core doctor experience.

Example:

```text
Dentist
= Doctor persona
+ Dentistry module permission
+ Odontogram capability
+ Dental service catalogue
```

## Small Hospital Role Combination

WonFlow must support combining responsibilities without changing the platform
architecture.

Example:

```text
Small Clinic Administrator
|-- Organization Admin
|-- Branch Admin
|-- Receptionist
|-- Appointment Agent
`-- Cashier
```

The user should receive one account and one unified navigation experience based
on the combined permissions.

## Large Hospital Separation

Large hospitals may separate each responsibility.

Example:

```text
Registration Officer
Appointment Agent
Queue Coordinator
Cashier
Insurance Officer
Medical Records Officer
```
