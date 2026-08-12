# WonFlow Phase 1 Quality Gates

## After each source-code task

Run:

```bash
pnpm lint
pnpm typecheck
git diff --check
```

## Before marking a task set complete

Run:

```bash
pnpm check:full
```

## Manual visual checks

For changed frontend routes verify:

- Desktop width
- Tablet width
- Small mobile width
- Keyboard navigation
- Visible focus
- Loading state
- Empty state
- Error state
- Permission state
- No viewport-level horizontal overflow

## Reception

Compare changed Reception pages against the approved current design.

Any unintended visual difference is a failure.

## No-dummy-data gate

Search changed production files for:

- Invented people
- Invented hospitals
- Invented branches
- Invented appointments
- Invented prices
- Invented chart series
- Mock service imports

A truthful empty array is acceptable.

A fabricated production fallback is not.

## Database gate

Do not run migrations before the Phase 1 schema and migration task.

Never run reset commands against an unknown database.
