-- CreateEnum
CREATE TYPE "DrainColour" AS ENUM ('CLEAR', 'PALE_YELLOW', 'RED', 'DARK_BROWN', 'GREEN', 'MILKY', 'OTHER');

-- CreateEnum
CREATE TYPE "DrainCharacter" AS ENUM ('SEROUS', 'SEROSANGUINOUS', 'PURULENT', 'BILIOUS', 'CHYLOUS');

-- CreateEnum
CREATE TYPE "DrainAmylaseSource" AS ENUM ('PATIENT_REPORTED', 'LAB_CONFIRMED');

-- CreateTable
CREATE TABLE "PatientDrain" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "site" VARCHAR(120) NOT NULL,
    "insertedAt" TIMESTAMPTZ(6) NOT NULL,
    "removedAt" TIMESTAMPTZ(6),
    "insertedByMembershipId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PatientDrain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrainLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "drainId" UUID NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL,
    "deviceRecordedAt" TIMESTAMPTZ(6),
    "volumeMl" INTEGER NOT NULL,
    "colour" "DrainColour" NOT NULL,
    "colourNote" VARCHAR(200),
    "character" "DrainCharacter",
    "amylaseValue" DECIMAL(10,2),
    "amylaseUnit" VARCHAR(50),
    "amylaseSource" "DrainAmylaseSource",
    "photoObjectKey" VARCHAR(500),
    "notes" TEXT,
    "source" "ObservationSource" NOT NULL DEFAULT 'PATIENT',
    "status" "ObservationStatus" NOT NULL DEFAULT 'PRELIMINARY',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DrainLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientDrain_tenantId_patientId_isActive_idx" ON "PatientDrain"("tenantId", "patientId", "isActive");

-- CreateIndex
CREATE INDEX "DrainLog_tenantId_patientId_recordedAt_idx" ON "DrainLog"("tenantId", "patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "DrainLog_tenantId_drainId_recordedAt_idx" ON "DrainLog"("tenantId", "drainId", "recordedAt");

-- AddForeignKey
ALTER TABLE "PatientDrain" ADD CONSTRAINT "PatientDrain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDrain" ADD CONSTRAINT "PatientDrain_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDrain" ADD CONSTRAINT "PatientDrain_insertedByMembershipId_fkey" FOREIGN KEY ("insertedByMembershipId") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrainLog" ADD CONSTRAINT "DrainLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrainLog" ADD CONSTRAINT "DrainLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrainLog" ADD CONSTRAINT "DrainLog_drainId_fkey" FOREIGN KEY ("drainId") REFERENCES "PatientDrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
