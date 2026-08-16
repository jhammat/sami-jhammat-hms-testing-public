-- Enforces AuditEvent append-only at the database privilege level.
--
-- The application no longer has to be trusted to never UPDATE or DELETE an
-- audit row: a dedicated, lower-privileged role ("wonflow_app") is granted
-- normal read/write access to every table except AuditEvent, where it only
-- ever gets SELECT and INSERT. The role that owns the schema (the one
-- `prisma migrate` runs as) keeps full rights, since only migrations are
-- allowed to reshape audit history's storage -- never a running request.
--
-- The password below is a placeholder. Run
-- `pnpm db:provision-roles` (tooling/scripts/provision-database-roles.ts)
-- with WONFLOW_APP_DB_PASSWORD set to rotate it before this role is used
-- for anything beyond a local smoke test -- see docs/release/phase-one-readiness.md.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wonflow_app') THEN
    CREATE ROLE wonflow_app LOGIN PASSWORD 'wonflow_app_change_me';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO wonflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wonflow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wonflow_app;

-- Audit history: readable and appendable, never rewritable or erasable.
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditEvent" FROM wonflow_app;

-- Carries the same grants forward onto any table/sequence a later
-- migration adds, so this doesn't quietly regress the next time the
-- schema changes.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wonflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO wonflow_app;
