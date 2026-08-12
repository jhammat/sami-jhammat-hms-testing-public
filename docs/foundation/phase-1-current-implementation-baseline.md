# WonFlow Phase 1 Current Implementation Baseline

## Snapshot

- Branch: `feature/p1-25b-mobile-patient-appointments`
- HEAD: `e6ef662`
- Worktree at application time:

```text
M apps/web/src/app/(access)/auth/login/page.tsx
 M apps/web/src/app/_providers/index.ts
 M apps/web/src/app/globals.css
 M apps/web/src/app/layout.tsx
 M apps/web/src/app/login/page.tsx
 M apps/web/src/components/auth/auth-page.tsx
 M apps/web/src/components/auth/auth-screen.tsx
 M apps/web/src/components/auth/index.ts
 M apps/web/src/components/shell/index.ts
?? .wonflow-snapshots/
?? apps/web/src/app/(access)/auth/select-context/
?? apps/web/src/app/_providers/route-transition-provider.tsx
?? apps/web/src/app/loading.tsx
?? apps/web/src/app/notifications/
?? apps/web/src/app/unauthorized/
?? apps/web/src/components/auth/auth-frame.tsx
?? apps/web/src/components/auth/hospital-logo-placeholder.tsx
?? apps/web/src/components/auth/workspace-selector.tsx
?? apps/web/src/components/brand/wonflow-route-loader.tsx
?? apps/web/src/components/shell/application-shell-boundary.tsx
?? wonflow_batch_01_apply.py
```

## Current implementation findings

- The repository is a pnpm workspace with the web application under
  `apps/web` and shared packages under `packages`.
- The web application uses Next.js, React, TypeScript, Tailwind CSS,
  shared WonFlow packages, and Lucide icons.
- The root layout reads the current session and application
  configuration.
- The existing `/login` route calls `/api/auth/login`; Batch 01 preserves
  that integration.
- Existing access routes already delegate to shared authentication
  components.
- `PremiumApplicationShell` remains the internal portal shell.
- Brand assets exist at:
  - `apps/web/public/brand/wonflow-logo.png`
  - `apps/web/public/brand/wonflow-mark.png`
- Existing portal and operations components are preserved.
- Existing local/mock runtime code is not removed by this batch.
- Batch 01 adds no dummy records and runs no seed command.

## Classification

### Preserve

- Existing monorepo and package boundaries.
- Current session and login API behavior.
- Existing portal route groups and implemented workflows.
- Existing brand assets.
- Existing application provider, session provider, and shared UI package.

### Polish

- Access screens.
- Public-versus-internal shell behavior.
- Route transition feedback.
- Empty access and notification states.

### Complete in this batch

- Canonical `/login` visual experience.
- Authentication shell bypass.
- Password recovery and reset visual states.
- Empty organization/branch selector.
- Unauthorized screen.
- Empty notification center.
- Rotating WonFlow route loader.
- Shared UI contract documentation.

### Refactor later

- Large workflow components identified by later portal-specific batches.
- Replacement of mock adapters with production APIs.
- Full authorization and tenant-isolation enforcement.
- Full test infrastructure.

### Build later

- Production password recovery.
- Production invitation acceptance.
- Production organization/branch context service.
- Notification delivery service.
- Backend RBAC enforcement.

## Canonical route observations

- `/login` is the canonical sign-in route.
- `/auth/login` redirects to `/login`.
- Access routes bypass the internal application shell.
- `/notifications` remains inside the internal shell.
- Existing admin and organization route overlap must be resolved in its
  dedicated administration batch, not here.

## Verification

Run after applying:

```bash
pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

No verification result is claimed by this generated document until those
commands are executed successfully.
