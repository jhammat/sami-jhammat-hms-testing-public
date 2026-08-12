# @wonflow/worker

Background job runner for the WonFlow platform.

## Purpose

A small, long-running Node process that polls the database for work the web
application does not do inline on the request path:

- **Outbox processing** — claims and processes pending `OutboxEvent` rows
  (`WORKER_POLL_INTERVAL_MS`, default 5s).
- **Video consultation retention** — deletes expired WebRTC signalling rows
  and closes stale call sessions (`WORKER_RETENTION_INTERVAL_MS`, default 5m).

It depends only on `@wonflow/database` and talks to no other package —
add new sweeps to `src/index.ts` as additional intervals, not new services.

## Run

```powershell
pnpm worker:dev     # from the repo root, or:
pnpm --filter @wonflow/worker dev
```

## Verification

```powershell
pnpm --filter @wonflow/worker typecheck
pnpm check
```
