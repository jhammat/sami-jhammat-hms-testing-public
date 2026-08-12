-- Preserve historical consultation services if a doctor profile is removed.
ALTER TABLE "ServiceDefinition"
DROP CONSTRAINT "ServiceDefinition_doctorId_fkey";

ALTER TABLE "ServiceDefinition"
ADD CONSTRAINT "ServiceDefinition_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
