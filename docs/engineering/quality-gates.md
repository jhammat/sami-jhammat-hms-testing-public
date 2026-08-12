# WonFlow Quality Gates

## During normal development

Run:

```bash
pnpm lint
pnpm typecheck
pnpm db:validate
git diff --check
```

## Before completing a task

Run:

```bash
pnpm check:full
```

## Before database-model work

Run:

```bash
pnpm db:format
pnpm db:validate
pnpm db:generate
pnpm typecheck
```

## Database safety

Do not run development migrations against an unknown or production
database.

Before any migration:

- Confirm `DATABASE_URL`.
- Confirm the target database name and host.
- Confirm whether the database contains real data.
- Review generated SQL.
- Back up any non-empty environment.
- Never use reset commands against production.

## Completion rule

A task is not complete when:

- Lint fails
- Typecheck fails
- Prisma validation fails
- Build fails
- `git diff --check` fails
- Required tests fail
- Dummy operational data was introduced
