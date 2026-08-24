-- CreateEnum
CREATE TYPE "TenantPicklistKind" AS ENUM ('CHIEF_COMPLAINT', 'DIAGNOSIS', 'LABORATORY_ORDER', 'RADIOLOGY_ORDER', 'CONSULTATION_ROOM');
-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "signatureImageData" TEXT;
-- CreateTable
CREATE TABLE "TenantPicklistEntry" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "kind" "TenantPicklistKind" NOT NULL,
    "label" VARCHAR(250) NOT NULL,
    "normalizedLabel" VARCHAR(250) NOT NULL,
    "code" VARCHAR(100),
    "metadata" JSONB,
    "createdByMembershipId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "TenantPicklistEntry_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "TenantPicklistEntry_tenantId_kind_idx" ON "TenantPicklistEntry"("tenantId", "kind");
-- CreateIndex
CREATE UNIQUE INDEX "TenantPicklistEntry_tenantId_kind_normalizedLabel_key" ON "TenantPicklistEntry"("tenantId", "kind", "normalizedLabel");
-- AddForeignKey
ALTER TABLE "TenantPicklistEntry" ADD CONSTRAINT "TenantPicklistEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
