# Deferred Phase 2 modules

This folder holds WonFlow modules that are **not part of the Phase 1 release**.

The code is parked here verbatim. It is deliberately outside `apps/web`, so it
is not routed by the Next.js App Router, not compiled by `pnpm build`, not
type-checked by `pnpm typecheck` and not linted by `pnpm lint`.

Nothing in `apps/web` imports from this folder. Moving it back is the only step
required to revive a module.

## What is here

| Module | Registry code | Original route |
| --- | --- | --- |
| Inpatient wards and nursing | `WARD` | `/operations/inpatient/*` |
| Operation theatre | `OPERATION_THEATRE` | `/operations/surgery/operation-theatre` |
| CSSD | `CSSD` | `/operations/surgery/cssd` |
| Insurance claims and receivables | `INSURANCE` | `/operations/insurance/*` |
| Blood bank and transfusion | `BLOOD_BANK` | `/operations/blood-bank/*` |
| Reception queue | `QUEUE` | `/operations/queue` |
| Doctor inpatient rounds | `WARD` | `/doctor/inpatients/*` |
| Doctor queue | `QUEUE` | `/doctor/queue` |

These are the same module codes listed in `disabledModuleCodes` on
`WONFLOW_PHASE_ONE_PROFILE` in `packages/config/src/feature-flags.ts`.

## Layout

```
deferred/phase-two/
  app/          route segments, mirroring their original App Router paths
    operations/ from apps/web/src/app/(hospital-operations)/operations/
    doctor/     from apps/web/src/app/(doctor-workspace)/doctor/
  components/   from apps/web/src/components/
  lib/          from apps/web/src/lib/
```

## Before it was moved

Every route here was already unreachable. Each module's `layout.tsx` calls
`notFound()`:

```tsx
import { notFound } from "next/navigation";

export default function HiddenPhaseTwoLayout() {
  notFound();
}
```

So moving the code changed no behaviour — these paths returned 404 before and
still return 404 now. The end-to-end suite asserts exactly that in
`apps/web/tests/e2e/phase-one-portals.spec.ts`.

## Restoring a module

1. Move the module's folders back to their original locations:
   - `app/operations/<module>` → `apps/web/src/app/(hospital-operations)/operations/<module>`
   - `app/doctor/<module>` → `apps/web/src/app/(doctor-workspace)/doctor/<module>`
   - `components/<module>` → `apps/web/src/components/<module>`
   - `lib/<module>` → `apps/web/src/lib/<module>`
2. Delete the module's `layout.tsx` containing `notFound()`, or the routes will
   still 404.
3. Remove the module's code from `disabledModuleCodes` in
   `packages/config/src/feature-flags.ts`.
4. Remove the route from `hiddenPhaseTwoRoutes` in
   `apps/web/tests/e2e/phase-one-portals.spec.ts`, and add it to the relevant
   portal's `routes` list.
5. Run `pnpm check` and `pnpm test:e2e`.

## Import paths

Files here still use the original `@/components/...` and `@/lib/...` aliases.
Those aliases resolve against `apps/web/src`, so they only work once the code is
moved back. This is intentional: it keeps the diff for restoring a module to a
pure file move.

`lib/blood-bank` imports `@/lib/inpatient`, so those two must be restored
together.

## What deliberately stayed behind

`apps/web/src/lib/queue` was **not** moved. Despite the name it is shared: the
Phase 1 doctor workspace imports it (consultation hub, consultation workspace,
compact doctor portal, appointment directory). Only the queue *screen*
(`components/queue`, `app/operations/queue`, `app/doctor/queue`) is deferred.
