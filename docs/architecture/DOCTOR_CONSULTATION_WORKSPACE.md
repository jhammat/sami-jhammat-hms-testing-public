# WonFlow Doctor Consultation Workspace

## Document Status

Task: WF-064  
Portal: Doctor Workspace  
Workflow: Patient Queue and Encounter Creation  
Status: Frontend demonstration baseline  
Data: Fictional browser-local clinical encounters

## Purpose

The Doctor Consultation Workspace connects the live reception queue to the
clinical encounter.

## Workflow

Reception check-in  
→ Queue token  
→ Room assignment  
→ Patient called  
→ Doctor starts consultation  
→ Clinical encounter created  
→ Patient summary opened

## Doctor Queue

The workspace displays queue records assigned to the selected practitioner.

Doctor queue filters include:

- Practitioner
- Hospital branch
- Business date
- Patient search

Search supports:

- Patient name
- MR number
- CNIC or B-Form
- Queue token
- Appointment number
- Consultation room
- Service
- Reason for visit

## Patient Queue States

The doctor sees:

- Waiting
- Called
- Serving
- Skipped

Completed and cancelled queue entries are excluded from the active queue.

## Consultation Start Rules

A consultation can begin when:

1. A queue entry exists.
2. A connected appointment exists.
3. A consultation room is assigned.
4. The patient has been called.
5. The queue entry is not completed or cancelled.

Starting consultation changes the queue state to:

```text
serving