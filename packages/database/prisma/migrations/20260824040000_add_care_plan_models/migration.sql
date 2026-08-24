-- CreateEnum CarePlanStatus
CREATE TYPE "public"."CarePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'DISCONTINUED');

-- CreateEnum CarePlanTaskType
CREATE TYPE "public"."CarePlanTaskType" AS ENUM ('MEDICATION', 'VITALS_LOG', 'DRAIN_LOG', 'WOUND_PHOTO', 'DIET_LOG', 'EXERCISE', 'QUESTIONNAIRE', 'APPOINTMENT', 'EDUCATION');

-- CreateEnum CarePlanTaskStatus
CREATE TYPE "public"."CarePlanTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED', 'MISSED');

-- CreateEnum CarePlanAlertSeverity
CREATE TYPE "public"."CarePlanAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum CarePlanAlertStatus
CREATE TYPE "public"."CarePlanAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateTable CarePlanTemplate
CREATE TABLE "public"."CarePlanTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL,
    "stages" JSONB NOT NULL,
    "taskTemplates" JSONB NOT NULL,
    "alertRules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CarePlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable CarePlan
CREATE TABLE "public"."CarePlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "templateId" UUID,
    "category" VARCHAR(60) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "status" "public"."CarePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMPTZ(6) NOT NULL,
    "endDate" TIMESTAMPTZ(6),
    "currentStage" INTEGER NOT NULL DEFAULT 1,
    "instigatingEncounterId" UUID,
    "managingDoctorId" UUID NOT NULL,
    "assignedCaregiverId" UUID,
    "assignedTherapistId" UUID,
    "assignedNutritionistId" UUID,
    "progressNotes" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable CarePlanTask
CREATE TABLE "public"."CarePlanTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "carePlanId" UUID NOT NULL,
    "taskType" "public"."CarePlanTaskType" NOT NULL,
    "stageNumber" INTEGER NOT NULL DEFAULT 1,
    "dayNumber" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMPTZ(6) NOT NULL,
    "dueBy" TIMESTAMPTZ(6),
    "title" VARCHAR(200) NOT NULL,
    "instructions" TEXT,
    "requiredSource" "public"."ObservationSource",
    "status" "public"."CarePlanTaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMPTZ(6),
    "completedByIdentityId" UUID,
    "resultData" JSONB,
    "skipReason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarePlanTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable CarePlanAlert
CREATE TABLE "public"."CarePlanAlert" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "carePlanId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "triggeredByObservationId" UUID,
    "severity" "public"."CarePlanAlertSeverity" NOT NULL,
    "status" "public"."CarePlanAlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledgedByMembershipId" UUID,
    "acknowledgedAt" TIMESTAMPTZ(6),
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarePlanAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for CarePlanTemplate
CREATE INDEX "CarePlanTemplate_tenantId_category_isActive_idx" ON "public"."CarePlanTemplate"("tenantId", "category", "isActive");

-- CreateIndexes for CarePlan
CREATE INDEX "CarePlan_tenantId_patientId_status_idx" ON "public"."CarePlan"("tenantId", "patientId", "status");
CREATE INDEX "CarePlan_tenantId_managingDoctorId_status_idx" ON "public"."CarePlan"("tenantId", "managingDoctorId", "status");

-- CreateIndexes for CarePlanTask
CREATE INDEX "CarePlanTask_tenantId_carePlanId_status_scheduledFor_idx" ON "public"."CarePlanTask"("tenantId", "carePlanId", "status", "scheduledFor");
CREATE INDEX "CarePlanTask_tenantId_scheduledFor_status_idx" ON "public"."CarePlanTask"("tenantId", "scheduledFor", "status");

-- CreateIndexes for CarePlanAlert
CREATE INDEX "CarePlanAlert_tenantId_patientId_status_severity_idx" ON "public"."CarePlanAlert"("tenantId", "patientId", "status", "severity");
CREATE INDEX "CarePlanAlert_tenantId_carePlanId_status_idx" ON "public"."CarePlanAlert"("tenantId", "carePlanId", "status");

-- AddForeignKeys
ALTER TABLE "public"."CarePlanTemplate" ADD CONSTRAINT "CarePlanTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlanTemplate" ADD CONSTRAINT "CarePlanTemplate_createdByMembershipId_fkey" FOREIGN KEY ("createdByMembershipId") REFERENCES "public"."TenantMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."CarePlan" ADD CONSTRAINT "CarePlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlan" ADD CONSTRAINT "CarePlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlan" ADD CONSTRAINT "CarePlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."CarePlanTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlan" ADD CONSTRAINT "CarePlan_instigatingEncounterId_fkey" FOREIGN KEY ("instigatingEncounterId") REFERENCES "public"."Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlan" ADD CONSTRAINT "CarePlan_managingDoctorId_fkey" FOREIGN KEY ("managingDoctorId") REFERENCES "public"."DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlan" ADD CONSTRAINT "CarePlan_assignedCaregiverId_fkey" FOREIGN KEY ("assignedCaregiverId") REFERENCES "public"."Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlan" ADD CONSTRAINT "CarePlan_assignedTherapistId_fkey" FOREIGN KEY ("assignedTherapistId") REFERENCES "public"."StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlan" ADD CONSTRAINT "CarePlan_assignedNutritionistId_fkey" FOREIGN KEY ("assignedNutritionistId") REFERENCES "public"."StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."CarePlanTask" ADD CONSTRAINT "CarePlanTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlanTask" ADD CONSTRAINT "CarePlanTask_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "public"."CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlanTask" ADD CONSTRAINT "CarePlanTask_completedByIdentityId_fkey" FOREIGN KEY ("completedByIdentityId") REFERENCES "public"."Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."CarePlanAlert" ADD CONSTRAINT "CarePlanAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlanAlert" ADD CONSTRAINT "CarePlanAlert_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "public"."CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlanAlert" ADD CONSTRAINT "CarePlanAlert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlanAlert" ADD CONSTRAINT "CarePlanAlert_triggeredByObservationId_fkey" FOREIGN KEY ("triggeredByObservationId") REFERENCES "public"."ClinicalObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."CarePlanAlert" ADD CONSTRAINT "CarePlanAlert_acknowledgedByMembershipId_fkey" FOREIGN KEY ("acknowledgedByMembershipId") REFERENCES "public"."TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_carePlanTaskId_fkey" FOREIGN KEY ("carePlanTaskId") REFERENCES "public"."CarePlanTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
