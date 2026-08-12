# WonFlow Phase 1 Request Context

## Source of truth

Request context is constructed by the trusted server from:

- Authenticated session
- Tenant membership
- Organization assignment
- Branch assignment
- Selected workspace
- Effective permissions
- Tenant lifecycle status
- Branch lifecycle status

The browser and mobile applications may request a context change, but
they cannot authorize themselves.

## Platform context

Platform context contains no tenant or branch.

Temporary support access must create a separately approved tenant context
with scope and expiry.

## Tenant context

Tenant context is required for:

- Hospital Administration
- Reception
- Doctor
- Patient
- Laboratory
- Radiology
- Pharmacy
- Billing
- Management
- Tenant audit

## Branch context

Branch context is required for branch-owned workflows, including:

- Availability
- Appointments
- Check-in
- Queue
- Diagnostics worklists
- Pharmacy inventory
- Dispensing
- Billing counter
- Branch reports

No branch selection does not mean access to every branch.

## Propagation

The same trusted context is passed to:

- Application service
- Repositories
- Audit service
- Outbox events
- Notifications
- Realtime authorization
- Object-storage authorization

## Cache keys

Tenant-owned cache keys include tenant ID.

Branch-owned cache keys include tenant ID and branch ID.

Incorrect:

```text
patient:123
appointments:today
```

Correct:

```text
tenant:{tenantId}:patient:{patientId}
tenant:{tenantId}:branch:{branchId}:appointments:{date}
```

## Object storage

Use tenant-owned paths:

```text
tenants/{tenantId}/patients/{patientId}/documents/{documentId}
```

The path itself is never proof of authorization.

## Mobile

Mobile clients send session credentials and requested context IDs.

The server reconstructs permissions. Mobile clients do not send trusted
permission lists.

## Worker

Every background job includes tenant context and a request or correlation
ID.

A worker validates tenant status before processing.

## Testing

Every tenant-owned Phase 1 feature requires tests proving:

- Tenant A cannot read Tenant B
- Tenant A cannot update Tenant B
- Branch A cannot access Branch B when branch scope applies
- Suspended tenants cannot perform operational actions
- Expired support access cannot create tenant context
