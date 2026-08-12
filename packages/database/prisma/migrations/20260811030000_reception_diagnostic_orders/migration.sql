-- Reception can order laboratory and radiology tests for a walk-in before any
-- doctor has opened an encounter, so a diagnostic order no longer requires one.
ALTER TABLE "DiagnosticOrder" ALTER COLUMN "encounterId" DROP NOT NULL;
