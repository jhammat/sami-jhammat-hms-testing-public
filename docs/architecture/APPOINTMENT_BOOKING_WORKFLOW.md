# WonFlow Appointment Booking Workflow

## Document Status

Task: WF-061  
Portal: Hospital Operations  
Workflow: Appointment Booking  
Status: Frontend demonstration baseline  
Data: Fictional browser-local appointments

## Purpose

The appointment workflow connects a registered patient to a hospital branch,
department, service, practitioner, date and available consultation time.

## Workflow

Patient
→ Branch
→ Department
→ Service
→ Doctor
→ Date
→ Available time
→ Appointment confirmation

## Core Fields

The workflow captures:

- Patient
- Hospital branch
- Department
- Appointment service
- Practitioner
- Appointment date
- Available time slot
- Booking source
- Priority
- Reason for visit
- Appointment notes

## Doctor Availability

Available time slots are generated using:

- Selected practitioner
- Selected appointment date
- Service duration
- Working hours
- Lunch break
- Existing locally reserved appointments

Already reserved times are disabled.

## Working Hours

The demonstration schedule uses:

- Monday to Friday: 9:00 AM to 5:00 PM
- Saturday: 9:00 AM to 3:00 PM
- Sunday: 10:00 AM to 2:00 PM
- Weekday lunch break: 1:00 PM to 2:00 PM

Production schedules will come from configurable doctor-availability records.

## Appointment Identity

Successful booking generates:

APT-YYYYMMDD-XXXX

Production appointment numbers will be created by backend-controlled sequences.

## Financial Boundary

The appointment displays its consultation fee but does not automatically record
payment.

Billing remains a separate workflow.

## Current Persistence

The frontend demonstration stores appointments in browser local storage.

Production appointment booking requires:

- Authorized staff access
- Doctor schedule configuration
- Branch and department validation
- Transaction-safe slot reservation
- Conflict prevention
- Backend validation
- Audit logging
- Appointment notifications
- Cancellation and rescheduling controls

## Safety Rules

1. A registered patient is required.
2. A hospital branch is required.
3. A service and doctor are required.
4. A valid date and available time are required.
5. Reserved time slots cannot be selected.
6. Booking and billing remain separate.
7. The patient unique ID is retained.
8. Doctor identity is retained.
9. Branch context is retained.
10. Browser-local bookings are demonstration-only.
11. Production booking requires backend conflict prevention.
12. Production access requires authorization and audit logging.