# WonFlow Batch 02 — Platform Administration Baseline

## Repository state used

- Branch: `feature/p1-25b-mobile-patient-appointments`
- HEAD captured by the supplied snapshot: `3edd0c6`
- The snapshot reported no tracked-file changes.
- The snapshot directory and the Batch 01 installer were untracked.

## Existing Platform Administration surface

The repository already contained these routes:

- `/platform`
- `/platform/organizations`
- `/platform/entitlements`
- `/platform/subscriptions`
- `/platform/support`
- `/platform/audit`

Existing platform components were connected to the mock practice service and selected the first available tenant. That behavior conflicted with the approved empty-first requirement because it assumed a provisioned tenant.

## Batch 02 implementation decision

Batch 02 preserves the established route family and shared WonFlow shell while replacing the Platform Administration presentation with an empty-first frontend configuration workspace.

The frontend workspace:

- starts with zero tenants;
- does not seed or manufacture organizations;
- creates records only from operator-entered values;
- gives new tenants zero branches and zero users;
- leaves the subscription plan unconfigured;
- disables every entitlement by default;
- uses PKR, Main Branch, English, Urdu and Asia/Karachi only as configurable product defaults;
- records configuration actions in the frontend audit view;
- uses deeper red for critical lifecycle and active support-access events;
- supports uploaded hospital logos;
- supports circular profile photos or initials with a violet outline;
- uses the shared rotating WonFlow W route loader.

## Persistence boundary

This batch does not introduce a production database or platform API. The temporary adapter stores manually entered Platform Administration configuration in the current browser under:

`wonflow:platform-administration:workspace:v1`

This adapter must be replaced by authenticated platform endpoints and an immutable audit store during the backend phase. The screen and action contracts should remain stable when that adapter is replaced.

## No-dummy-data statement

No tenant, branch, user, subscription, support-access request, audit event, hospital, patient, clinician or financial record is preloaded by Batch 02.

No seed command, database migration or Prisma schema change is part of this batch.
