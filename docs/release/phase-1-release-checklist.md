# WonFlow Phase 1 Release Checklist

## Code
- [ ] Phase 1 scope frozen; Reception design preserved
- [ ] No production mock data, hard-coded accounts, or fictional records
- [ ] Lint, typecheck, unit, integration, E2E, mobile and production builds pass

## Database and security
- [ ] Migration SQL and production backup reviewed
- [ ] Migration and restore rehearsals completed
- [ ] Tenant and branch isolation tests pass
- [ ] MFA, rate limiting, session revocation and mobile rotation verified
- [ ] Private storage, scanning, security headers and dependency findings reviewed

## Operations, mobile and handover
- [ ] Web, worker, PostgreSQL, storage, gateways, monitoring and alerting ready
- [ ] Backup schedule and rollback runbook approved
- [ ] Package identifiers and signing credentials secured
- [ ] Preview APKs and production AABs tested
- [ ] Hospital UAT, training, guides, support contacts and go-live sign-off complete
