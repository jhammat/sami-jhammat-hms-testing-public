# WonFlow Appointment Directory Workflow

## Document Status

Task: WF-062  
Portal: Hospital Operations  
Workflow: Appointment Directory  
Status: Frontend demonstration baseline  
Data: Fictional browser-local appointments

## Purpose

The Appointment Directory allows hospital staff to manage appointments after
they have been booked.

## Capabilities

Staff may:

- Search appointments
- Filter by branch
- Filter by practitioner
- Filter by status
- Filter by date
- Sort appointment records
- Use list view
- Use monthly calendar view
- Check in a patient
- Mark an appointment completed
- Reschedule an appointment
- Cancel an appointment
- Continue to patient billing

## Search Fields

Search supports:

- Patient name
- MR number
- CNIC or B-Form
- Mobile number
- Appointment number
- Service name
- Service code
- Doctor name
- Doctor specialty
- Hospital branch
- Reason for visit

## Appointment Status

The current statuses are:

- Booked
- Checked in
- Completed
- Cancelled
- No show

## Rescheduling

Rescheduling retains:

- Patient identity
- Branch
- Practitioner
- Service
- Duration
- Fee
- Appointment number

It changes:

- Appointment date
- Slot start
- Slot end
- Scheduled timestamps

The selected time is validated against other appointments for the same doctor.

## Calendar View

The monthly calendar displays appointment counts for each date.

Selecting a calendar date applies that date to the appointment-directory filter.

## Check-In Boundary

The current check-in action changes the appointment status to checked in.

A complete queue token and patient-flow workflow will be implemented separately.

## Production Boundary

Production appointment management requires:

- Backend transactions
- Schedule locking
- Conflict prevention
- Role authorization
- Cancellation reasons
- Rescheduling history
- Check-in timestamps
- Notification handling
- Queue creation
- Audit logging
- Organization and branch isolation

## Safety Rules

1. Appointment changes retain the patient unique ID.
2. Appointment changes retain practitioner identity.
3. Appointment changes retain branch context.
4. Cancelled appointments cannot be checked in.
5. Completed appointments cannot be rescheduled.
6. Reserved doctor slots remain unavailable.
7. Search and filters do not modify records.
8. Billing remains separate from appointment booking.
9. Check-in does not yet create an authoritative clinical encounter.
10. Browser-local records are demonstration-only.
11. Production changes require backend authorization.
12. Every production change must be auditable.