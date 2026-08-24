-- CreateEnum
CREATE TYPE "ObservationSource" AS ENUM ('STAFF', 'PATIENT', 'CAREGIVER', 'DEVICE');

-- AlterTable
ALTER TABLE "ClinicalObservation" ADD COLUMN     "carePlanTaskId" UUID,
ADD COLUMN     "deviceRecordedAt" TIMESTAMPTZ(6),
ADD COLUMN     "recordedByIdentityId" UUID,
ADD COLUMN     "source" "ObservationSource" NOT NULL DEFAULT 'STAFF',
ALTER COLUMN "encounterId" DROP NOT NULL,
ALTER COLUMN "recordedByMembershipId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ClinicalObservation_tenantId_patientId_source_observedAt_idx" ON "ClinicalObservation"("tenantId", "patientId", "source", "observedAt");
