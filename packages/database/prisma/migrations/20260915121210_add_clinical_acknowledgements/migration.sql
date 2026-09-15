-- CreateTable
CREATE TABLE "ClinicalAcknowledgement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "entryType" VARCHAR(60) NOT NULL,
    "entryId" VARCHAR(200) NOT NULL,
    "membershipId" UUID NOT NULL,
    "note" VARCHAR(1000),
    "acknowledgedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicalAcknowledgement_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "ClinicalAcknowledgement_tenantId_patientId_acknowledgedAt_idx" ON "ClinicalAcknowledgement"("tenantId", "patientId", "acknowledgedAt");
-- CreateIndex
CREATE INDEX "ClinicalAcknowledgement_membershipId_idx" ON "ClinicalAcknowledgement"("membershipId");
-- CreateIndex
CREATE INDEX "ClinicalAcknowledgement_patientId_idx" ON "ClinicalAcknowledgement"("patientId");
-- CreateIndex
CREATE UNIQUE INDEX "ClinicalAcknowledgement_tenantId_entryType_entryId_membersh_key" ON "ClinicalAcknowledgement"("tenantId", "entryType", "entryId", "membershipId");
-- AddForeignKey
ALTER TABLE "ClinicalAcknowledgement" ADD CONSTRAINT "ClinicalAcknowledgement_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ClinicalAcknowledgement" ADD CONSTRAINT "ClinicalAcknowledgement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ClinicalAcknowledgement" ADD CONSTRAINT "ClinicalAcknowledgement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
