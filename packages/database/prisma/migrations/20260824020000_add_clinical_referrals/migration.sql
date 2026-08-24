-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralPriority" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- CreateTable
CREATE TABLE "ClinicalReferral" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "referringDoctorId" UUID NOT NULL,
    "specialty" VARCHAR(60) NOT NULL,
    "assignedToId" UUID,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "ReferralPriority" NOT NULL DEFAULT 'ROUTINE',
    "reason" TEXT NOT NULL,
    "clinicalSummary" TEXT,
    "validFrom" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ClinicalReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalReferral_tenantId_patientId_idx" ON "ClinicalReferral"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "ClinicalReferral_tenantId_assignedToId_status_idx" ON "ClinicalReferral"("tenantId", "assignedToId", "status");

-- CreateIndex
CREATE INDEX "ClinicalReferral_tenantId_specialty_status_idx" ON "ClinicalReferral"("tenantId", "specialty", "status");

-- AddForeignKey
ALTER TABLE "ClinicalReferral" ADD CONSTRAINT "ClinicalReferral_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalReferral" ADD CONSTRAINT "ClinicalReferral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalReferral" ADD CONSTRAINT "ClinicalReferral_referringDoctorId_fkey" FOREIGN KEY ("referringDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalReferral" ADD CONSTRAINT "ClinicalReferral_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
