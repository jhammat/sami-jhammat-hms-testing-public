# WonFlow HPBSP Clinical Pilot Readiness & Runbook

**Release Version:** 1.0.0-pilot  
**Target Deployment:** Post-Operative Pancreatic & Biliary Surgery Pilot Center  
**Date:** August 2026  

---

## 1. Pilot Scope & Clinical Objectives

The WonFlow Hepato-Pancreato-Biliary Surgical Platform (HPBSP) provides remote care coordination across three key stakeholder groups:
1. **Surgical Team (Consultants, Registrars, Surgical Residents):**
   - Remote Care Plan prescribing and milestone tracking.
   - Live drain output tracking and ISGPS POPF early warning triggers (Drain Amylase > 300 U/L).
   - Clinical Alert Console (`/operations/alerts`) with on-call rota escalation.
   - Allied health multidisciplinary referral management.
2. **Allied Health Team (Physiotherapists, Nutritionists):**
   - Mobility scoring, respiratory spirometry rehabilitation, and session attendance tracking (`/operations/physiotherapy`).
   - Post-op ERAS diet advancement, pancreatic enzyme replacement therapy (PERT) titration, and caloric logs (`/operations/nutrition`).
3. **Patients & Caregivers:**
   - Installable PWA mobile interface (`/patient/dashboard`) with offline-first IndexedDB outbox.
   - Daily vitals logging, drain output logging with fluid colour selection, symptom logging (pain, fever, jaundice), and medication checklist.
   - Delegated caregiver access for assisted home care.

---

## 2. Pilot Verification Checklist

- [x] **Database Schema & Migrations:** All 10 migrations applied and verified in PostgreSQL.
- [x] **Contracts & Validation:** Complete DTO type safety and Zod input validation in `@wonflow/contracts`.
- [x] **Offline Outbox Synchronization:** Client IndexedDB queue with automatic batch synchronization and conflict resolution.
- [x] **Bilingual Support:** Urdu and English strings across patient telemetry and installation instructions.
- [x] **Background Worker Sweeps:** Outbox event dispatcher, expired referral revoker, and alert escalation scheduler running on interval.
- [x] **Unit & Integration Tests:** 32 test files, 100+ tests passing 100% green.
- [x] **Lint & Typecheck:** 0 ESLint errors, 0 TypeScript errors across all 9 workspaces.

---

## 3. Operations & Support Runbook

### 3.1 Alert Escalation Incident Response
- **Trigger:** Alert severity `CRITICAL` or `WARNING` triggered by patient telemetry breach.
- **Step 1 (0 min):** Immediate in-app Push notification dispatched to primary on-call clinician via `AlertRota`.
- **Step 2 (15 min / 45 min):** If alert remains unacknowledged, SMS sent to on-call clinician.
- **Step 3 (30 min / 90 min):** Escalation SMS/Call dispatched to backup consultant on-call.
- **Resolution:** Acknowledging the alert stops escalation timers. Clinician must input documented resolution notes to close the alert.

### 3.2 Offline Sync Troubleshooting
- If patient reports unsynced entries, open `/patient/dashboard` and verify the `OfflineStatusBar` status.
- Tap **"Sync Now"** to trigger immediate batch flush against `/api/v1/patient/offline/sync`.

---

## 4. Clinical Emergency Disclaimer

> **IMPORTANT:** WonFlow HPBSP is an asynchronous remote post-operative tracking tool and is **NOT** a replacement for acute emergency services. In the event of acute respiratory distress, severe hemorrhage, or sudden collapse, patients and caregivers must immediately contact local emergency services (1122 / 911) or proceed to the nearest emergency department.
