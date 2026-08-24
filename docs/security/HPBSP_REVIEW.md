# WonFlow HPBSP Clinical Telemetry & Security Review

**Document Version:** 1.0.0  
**Date:** August 2026  
**Status:** Approved for Clinical Pilot  
**Scope:** HPB Surgical Post-Operative Remote Monitoring, Care Plans, Allied Health Workspaces & Alert Escalation  

---

## 1. Executive Summary

WonFlow's Hepato-Pancreato-Biliary Surgical Platform (HPBSP) enables continuous post-discharge remote monitoring, active drain tracking, early post-operative pancreatic fistula (POPF) detection, allied health multidisciplinary collaboration (Physiotherapy, Nutrition), and automated emergency escalation.

This document details the security posture, cryptographic controls, multi-tenant isolation, delegated authorization boundaries, and regulatory compliance considerations implemented across the platform.

---

## 2. Authentication & Authorization Architecture

### 2.1 Clinician & Staff Access
- **Cryptographic Session Tokens:** Authenticated using cryptographically signed session cookies with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes.
- **Granular RBAC:** Permissions evaluated strictly through `@wonflow/contracts` authorization matrix (`encounters.manage`, `careplans.read`, `careplans.manage`, `referrals.read`, `referrals.manage`).
- **Zero Cross-Tenant Leakage:** Every database query enforces strict `tenantId` scoping at the ORM layer.

### 2.2 Patient & Caregiver Access
- **Dual-Factor Direct Access:** Patients authenticate via verified mobile number OTP and secure magic tokens.
- **Delegated Caregiver Boundary (C-01):**
  - Caregivers access patient telemetry only through explicitly authorized `CaregiverRelationship` grants (`PARENT`, `SPOUSE`, `CHILD`, `GUARDIAN`, `NURSE`).
  - Active permissions (`CAN_VIEW_RECORDS`, `CAN_LOG_VITALS`, `CAN_LOG_MEDICATIONS`, `CAN_SCHEDULE_APPOINTMENTS`) are verified on every API request.
  - Revoking a caregiver relationship immediately invalidates their active delegated tokens and terminates outbox sync access.

---

## 3. Data Protection & Cryptographic Controls

### 3.1 Data at Rest & Transit
- **Transport Security:** All client-to-server and inter-service communications mandate TLS 1.3 with forward secrecy.
- **Database Storage:** PostgreSQL databases are hosted on encrypted volumes (AES-256).
- **Public Communication Sanitization (E-02 Rule):** Push notifications and SMS alerts dispatched over public telecommunications networks contain **zero** unencrypted clinical diagnoses or lab values (e.g. *"[WonFlow Alert - CRITICAL] Patient under your care requires urgent clinical review. Open portal."*).

### 3.2 Audit Logging & Immutability
- All clinical writes, drain logs, symptom entries, caregiver delegations, referral acceptances, alert acknowledgements, and alert resolutions produce immutable rows in the `AuditEvent` table.
- Audit entries record `tenantId`, `actorMembershipId`, `requestId`, `sourceApplication`, timestamp, and before/after metadata.

---

## 4. Multi-Tenant Isolation & Allied Health Sub-Workspaces

- Allied health staff (Physiotherapists, Clinical Nutritionists) are granted scoped access exclusively via formal `ClinicalReferral` records.
- If a referral expires (`validUntil < now`) or is declined/cancelled, the worker sweep automatically revokes patient record visibility.

---

## 5. Security Test Matrix Summary

| Test Area | Description | Result |
|---|---|---|
| Multi-Tenant Boundary | Attempt cross-tenant observation and alert mutation | PASSED (Blocked with 400/404) |
| Caregiver Access Control | Attempt caregiver access without active relationship grant | PASSED (Blocked with 403) |
| Resolution Sign-Off | Attempt resolving clinical alert without clinical notes | PASSED (Blocked with 400) |
| Offline Outbox Replay | Test client-generated collision and replay resistance | PASSED (Idempotent UUID keys) |
| Referral Expiration Sweep | Ensure expired referral access is terminated | PASSED (Worker automated sweep) |
