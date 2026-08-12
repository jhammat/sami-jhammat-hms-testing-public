# WonFlow Phase 1 Rollback Runbook

## Application rollback
1. Stop deployments and record the failed release.
2. Restore the previous verified image; keep the worker stopped if event compatibility is uncertain.
3. Verify health endpoints, authentication, isolation and Reception smoke tests.
4. Resume the worker only after compatibility is confirmed.

## Database rollback
Prisma has no automatic destructive down migration. Stop writes, capture a failure-state backup, restore the last verified backup into a separate database, validate counts and tenant boundaries, connect the previous release, run smoke tests, then switch traffic. Never use `prisma migrate reset` in production.

## Mobile rollback
Revoke incompatible sessions, disable affected APIs through configuration, publish a corrected build, and retain backward-compatible APIs for the supported mobile window.

Record release ID, times, detection, scope, data/security impact, recovery evidence and resolution.
