-- The handler backfill compared category case-sensitively, but older rows store
-- the category label ("Consultation") rather than the code ("CONSULTATION"), so
-- they all fell through to RECEPTION. Recompute case-insensitively, and only for
-- rows that predate the handler column, so deliberate desk choices are kept.
UPDATE "ServiceDefinition"
SET "handlerWorkspace" = CASE upper(regexp_replace("category", '[^A-Za-z0-9]+', '_', 'g'))
  WHEN 'LABORATORY' THEN 'LABORATORY'::"WorkspaceCode"
  WHEN 'RADIOLOGY' THEN 'RADIOLOGY'::"WorkspaceCode"
  WHEN 'PHARMACY' THEN 'PHARMACY'::"WorkspaceCode"
  WHEN 'CONSULTATION' THEN 'DOCTOR'::"WorkspaceCode"
  ELSE 'RECEPTION'::"WorkspaceCode"
END
WHERE "handlerMembershipId" IS NULL
  AND "createdAt" < TIMESTAMPTZ '2026-08-11 00:00:00+00';
