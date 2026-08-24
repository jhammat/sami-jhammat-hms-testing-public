-- CreateTable
CREATE TABLE "public"."SymptomLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceRecordedAt" TIMESTAMPTZ(6),
    "symptomCode" VARCHAR(60) NOT NULL,
    "symptomName" VARCHAR(120) NOT NULL,
    "severityScore" INTEGER NOT NULL,
    "severityLabel" VARCHAR(30) NOT NULL,
    "freeText" TEXT,
    "photoDocumentId" UUID,
    "photoData" TEXT,
    "recordedByIdentityId" UUID,
    "source" "public"."ObservationSource" NOT NULL DEFAULT 'PATIENT',
    "carePlanTaskId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SymptomLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SymptomLog_tenantId_patientId_recordedAt_idx" ON "public"."SymptomLog"("tenantId", "patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "SymptomLog_tenantId_symptomCode_recordedAt_idx" ON "public"."SymptomLog"("tenantId", "symptomCode", "recordedAt");

-- AddForeignKey
ALTER TABLE "public"."SymptomLog" ADD CONSTRAINT "SymptomLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SymptomLog" ADD CONSTRAINT "SymptomLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SymptomLog" ADD CONSTRAINT "SymptomLog_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "public"."Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SymptomLog" ADD CONSTRAINT "SymptomLog_carePlanTaskId_fkey" FOREIGN KEY ("carePlanTaskId") REFERENCES "public"."CarePlanTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
