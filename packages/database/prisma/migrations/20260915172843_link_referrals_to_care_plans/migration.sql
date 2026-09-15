-- AlterTable
ALTER TABLE "ClinicalReferral" ADD COLUMN     "carePlanId" UUID;
-- CreateIndex
CREATE INDEX "ClinicalReferral_tenantId_carePlanId_idx" ON "ClinicalReferral"("tenantId", "carePlanId");
-- AddForeignKey
ALTER TABLE "ClinicalReferral" ADD CONSTRAINT "ClinicalReferral_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
