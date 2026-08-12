-- CreateEnum
CREATE TYPE "DoctorFeeAuthority" AS ENUM ('DOCTOR', 'HOSPITAL');

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "doctorFeeAuthority" "DoctorFeeAuthority" NOT NULL DEFAULT 'HOSPITAL';

-- AlterTable
ALTER TABLE "ServiceDefinition"
ADD COLUMN "doctorId" UUID;

-- CreateIndex
CREATE INDEX "ServiceDefinition_tenantId_doctorId_isActive_idx"
ON "ServiceDefinition"("tenantId", "doctorId", "isActive");

-- AddForeignKey
ALTER TABLE "ServiceDefinition"
ADD CONSTRAINT "ServiceDefinition_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
