# WonFlow Billing Counter Workflow

## Document Status

Task: WF-059  
Portal: Hospital Operations  
Workflow: Billing and Payment  
Status: Frontend demonstration baseline  
Currency: PKR  
Data: Fictional browser-local invoices

## Purpose

The Billing Counter creates a patient invoice from selected hospital services.

Hospital staff may:

- Select a registered patient
- Select the billing branch
- Assign an optional practitioner
- Search the service catalogue
- Add multiple services
- Add custom services
- Change quantities
- Adjust unit prices
- Apply item-level discounts
- Apply invoice-level discounts
- Record insurance or corporate contributions
- Receive full or partial payment
- Save an unpaid invoice
- Generate an invoice number
- Print the patient bill

## Workflow

Patient identity
→ Hospital services
→ Charges
→ Discounts
→ Insurance contribution
→ Patient payable
→ Payment
→ Invoice

## Save-First Principle

A patient identity must exist before billing.

Billing does not automatically create:

- Appointment
- Encounter
- Consultation
- Laboratory result
- Radiology result
- Prescription
- Admission

Those workflows remain separate.

## Financial Representation

All stored monetary values use:

Integer minor units
+
Explicit PKR currency

The interface displays values in PKR.

## Payment Status

The invoice supports:

- Unpaid
- Partially paid
- Paid

## Current Persistence

Current frontend invoices are stored in browser local storage.

Production billing requires:

- Authorized cashier access
- Cashier session
- Number-sequence control
- Database transaction
- Payment ledger
- Discount authorization
- Refund workflow
- Audit log
- Receipt reprinting controls
- Financial reconciliation

## Safety Rules

1. A patient must be selected.
2. A billing branch must be selected.
3. At least one service is required.
4. Negative quantities and prices are prohibited.
5. Discounts cannot exceed applicable charges.
6. Insurance contribution cannot exceed the net amount.
7. Paid value cannot exceed patient payable.
8. Unpaid invoices may be saved.
9. Partial payment remains visible.
10. Browser-local invoices are demonstration-only.
11. Production discounts require permission enforcement.
12. Production payments require audited backend transactions.