# WonFlow Reception Check-In and Live Queue

## Document Status

Task: WF-063  
Portal: Hospital Operations  
Workflow: Reception and Queue Management  
Status: Frontend demonstration baseline  
Data: Fictional browser-local queue records

## Purpose

The Reception Queue connects booked appointments to the hospital's live patient
flow.

## Workflow

Booked appointment  
→ Reception check-in  
→ Queue token  
→ Priority assignment  
→ Doctor and room assignment  
→ Patient called  
→ Consultation started  
→ Queue completed

## Queue Identity

Every check-in creates:

- Queue-entry identifier
- Branch-specific queue sequence
- Human-readable queue token
- Business date
- Patient identifier
- Appointment identifier
- Practitioner identifier
- Service name
- Check-in timestamp

Example token:

```text
Q-001