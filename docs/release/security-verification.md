# Security test automation (FIX-21)

`apps/web/tests/e2e/security.spec.ts` — **54 tests**, all API-level (`page.request` /
a dedicated `APIRequestContext` per session, never relying on the UI hiding
something). Full suite:

```
pnpm --filter web exec playwright test tests/e2e/security.spec.ts --project=chromium
```

Result: **54/54 pass**. The full `pnpm test:e2e` run (all spec files) also
passes clean at **138/138** after two fixes described below.

## Coverage

**Reach/non-reach matrix (44 tests)** — for each of the ten seeded accounts
(`admin`, `reception`, `doctor`, `laboratory`, `radiology`, `pharmacy`,
`billing`, `management`, `patient`, `platform`), one test asserts the
endpoint that role legitimately needs returns `200`, and 2–4 tests assert
endpoints from unrelated roles are refused (`400`/`401`/`403` — 400 covers a
platform-scope session hitting a tenant-scoped route, which has no tenant
context to even check a permission against).

**The ten specific attacks from the task, each its own test:**

| Attack | Result | How it's proven |
|---|---|---|
| Patient opens `/doctor`, `/admin`, `/platform` | Refused | All three underlying APIs return 403 from the patient's session; the page shell itself never 500s or leaks content |
| Doctor opens `/platform` | Refused | `GET /api/v1/platform/organizations` → 403 |
| Reception opens `/admin/team` | Refused | `GET /api/v1/admin/users` → 403 |
| — (added) permission denials are logged | Refused + logged | The 403 above is now confirmed to appear in `GET /api/v1/admin/audit` as an `access.denied` WARNING event — see the fix below |
| Patient A requests patient B's appointment by id | Refused | A real second patient is registered and booked by reception; patient A's session gets `404` attempting to cancel it by id |
| Patient A requests patient B's document by id | Refused | No API can provision "patient B's real document" over HTTP (by design — see FIX-20's note on why `PatientAccess` can't be fabricated), so a fabricated id exercises the identical `patientId`-scoped query path; `404` either way |
| Any user requests another organization's data by id | Refused | A throwaway second tenant is created and activated; from inside it, tenant A's real doctor id and real `DEV-0001` patient number both return zero results |
| A supervised clinician signs their own note | Refused | A dedicated `supervised-doctor@wonflow.local` fixture (added to the dev seed, `requiresCountersignature: true`) attempts to self-sign; `403 countersignature-required`; the assigned supervisor can sign it |
| An unverified diagnostic result is released | Refused | Releasing a result id that was never entered → `409`; releasing an already-released result a second time → `409` |
| A suspended organization's user attempts any action | Refused | A throwaway tenant is suspended mid-session; the already-open session gets `401` on its very next request; a fresh login gets `403 organization-suspended` |
| An expired support access session is used | Refused | A grant is created, approved/activated, left to expire, confirmed to self-heal to `REVOKED` on the next read, then a reactivation attempt is rejected `409` — see the fix below |

## Defects found and fixed

**1. Permission denials were never logged anywhere.** `requirePermission`
threw and the HTTP layer mapped it straight to a 403 response — there was no
record in `AuditEvent` of who was denied what, ever. A pattern of probing
(a compromised account trying every admin/platform endpoint it could reach)
would have left no trail. Fixed by carrying the acting context and the
denied permission code on `WonFlowRequestContextError` itself
([`packages/contracts/src/access/request-context.ts`](../../packages/contracts/src/access/request-context.ts)),
and writing an `access.denied` `WARNING` audit event from the one place
every API route's error handling already funnels through
([`apps/web/src/server/http/route-handler.ts`](../../apps/web/src/server/http/route-handler.ts),
[`apps/web/src/lib/api/route-helpers.ts`](../../apps/web/src/lib/api/route-helpers.ts)).
Every 403 in the whole app is now logged, not just the ones this suite
exercises directly.

**2. An expired support-access grant could be silently reactivated.**
`updateSupportAccess` let a grant be moved to `APPROVED`/`ACTIVE` with no
check on whether it had already passed its `expiresAt` — the 24-hour cap on
`createSupportAccess` meant nothing if the same grant could just be
re-approved forever after expiring. Fixed in
[`apps/web/src/server/platform/platform-administration-service.ts`](../../apps/web/src/server/platform/platform-administration-service.ts):
reactivating an already-expired grant now returns `409 support-access-expired`.

## Test-infrastructure fixes made to reach a green full suite

Two pre-existing spec files (`diagnostics.spec.ts`, `doctor-queue-flow.spec.ts`,
neither touched by FIX-20 or FIX-21) were failing before this task, for
reasons unrelated to the security work itself — confirmed by reproducing
both in complete isolation with a fresh database reseed:

- **113 leftover non-terminal appointments** had accumulated in the shared
  development database from this project's own extensive automated testing
  history, clogging every doctor's calendar densely enough that even a
  previously-reliable spec's fixed booking-time logic collided with old
  bookings. Cleared via the application's own cancel API (not a raw
  deletion), with the user's explicit approval before running it.
- **The development seed's "keep 8 open diagnostic orders" logic counted
  orders by status only, not by date** — an order left `ORDERED` from two
  days earlier still counted toward "the pool is full," so no fresh order
  ever got created for *today*, and the worklist (which filters by
  `createdAt` within today) legitimately found nothing. Fixed in
  [`tooling/scripts/seed-development-logins.ts`](../../tooling/scripts/seed-development-logins.ts)
  to count only today's orders toward the quota.

Also added a `supervised-doctor@wonflow.local` fixture to the same seed
script — the dev tenant previously had no clinician configured with
`requiresCountersignature`, so there was no way to exercise that rule at all
before this task.

## Test count

**54** tests in `security.spec.ts`: 5 pre-existing header/cache/throttling
tests, 44 reach/non-reach matrix tests (across the ten seeded accounts), and
11 specific-attack tests covering the ten listed attacks plus the added
audit-logging check.

```
$ pnpm --filter web exec playwright test tests/e2e/security.spec.ts --project=chromium --list | grep -c "›"
54
```

The full `pnpm test:e2e` suite across every spec file: **138/138 pass.**
