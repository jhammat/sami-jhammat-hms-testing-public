-- Supervision for clinical note signing: a doctor configured with
-- requiresCountersignature cannot sign their own encounter notes — only
-- their assigned supervisorDoctorId may countersign. Enforced in
-- DoctorService.signNote, never trusted from the client.
ALTER TABLE "DoctorProfile"
  ADD COLUMN "requiresCountersignature" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "supervisorDoctorId" UUID;

CREATE INDEX "DoctorProfile_tenantId_supervisorDoctorId_idx"
  ON "DoctorProfile" ("tenantId", "supervisorDoctorId");

ALTER TABLE "DoctorProfile"
  ADD CONSTRAINT "DoctorProfile_supervisorDoctorId_fkey"
  FOREIGN KEY ("supervisorDoctorId") REFERENCES "DoctorProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
