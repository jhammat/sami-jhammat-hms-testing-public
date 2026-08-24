-- AlterEnum
ALTER TYPE "CarePlanTaskType" ADD VALUE 'MEAL';
ALTER TYPE "CarePlanTaskType" ADD VALUE 'SUPPLEMENT';

-- CreateEnum
CREATE TYPE "ReferralDiscipline" AS ENUM ('PHYSIOTHERAPY', 'NUTRITION', 'OTHER');

-- CreateEnum
CREATE TYPE "IndependenceLevel" AS ENUM ('BED_BOUND', 'CHAIR_TRANSFER', 'ASSISTED_AMBULATION', 'INDEPENDENT_AMBULATION', 'STAIR_NAVIGATING');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('RESPIRATORY', 'CIRCULATORY', 'MOBILITY', 'STRENGTHENING', 'POSTURE');

-- CreateEnum
CREATE TYPE "TherapyAttendanceStatus" AS ENUM ('COMPLETED', 'CANCELLED', 'PATIENT_UNWELL', 'REFUSED');

-- CreateEnum
CREATE TYPE "NutritionItemType" AS ENUM ('MEAL', 'SNACK', 'SUPPLEMENT', 'ENZYME');

-- AlterTable
ALTER TABLE "ClinicalReferral" ADD COLUMN "acceptedAt" TIMESTAMPTZ(6),
ADD COLUMN "discipline" "ReferralDiscipline" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "goal" TEXT,
ADD COLUMN "outcomeNotes" TEXT,
ADD COLUMN "precautions" TEXT,
ADD COLUMN "surgicalSummary" TEXT;

-- AlterTable
ALTER TABLE "PatientAccess" ADD COLUMN "accessReason" VARCHAR(200),
ADD COLUMN "referralId" UUID;

-- CreateTable
CREATE TABLE "TherapyAssessment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "assessedByStaffId" UUID NOT NULL,
    "referralId" UUID,
    "assessedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mobilityScore" INTEGER NOT NULL,
    "painScore" INTEGER NOT NULL,
    "respiratoryFunction" VARCHAR(200),
    "independenceLevel" "IndependenceLevel" NOT NULL DEFAULT 'BED_BOUND',
    "surgicalRestrictions" TEXT,
    "baselineNotes" TEXT,
    "goals" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TherapyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseDefinition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" "ExerciseCategory" NOT NULL DEFAULT 'MOBILITY',
    "description" TEXT,
    "instruction" TEXT NOT NULL,
    "demonstrationDocumentId" UUID,
    "demonstrationUrl" VARCHAR(1000),
    "defaultRepetitions" INTEGER,
    "defaultSets" INTEGER,
    "defaultDurationSeconds" INTEGER,
    "precautions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExerciseDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TherapySession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "conductedByStaffId" UUID NOT NULL,
    "referralId" UUID,
    "sessionDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attendanceStatus" "TherapyAttendanceStatus" NOT NULL DEFAULT 'COMPLETED',
    "painBefore" INTEGER,
    "painAfter" INTEGER,
    "spirometryAchievedMl" INTEGER,
    "stepsAchieved" INTEGER,
    "progressNotes" TEXT,
    "goalsMet" TEXT,
    "nextSessionDate" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TherapySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionAssessment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "assessedByStaffId" UUID NOT NULL,
    "referralId" UUID,
    "assessedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DECIMAL(6,2),
    "heightCm" DECIMAL(6,2),
    "bmi" DECIMAL(5,2),
    "weightChangeSinceSurgeryKg" DECIMAL(6,2),
    "appetiteScore" INTEGER,
    "intakeNotes" TEXT,
    "giSymptoms" TEXT,
    "enzymeRequirement" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NutritionAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionPlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "createdByStaffId" UUID NOT NULL,
    "referralId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "startDate" TIMESTAMPTZ(6) NOT NULL,
    "endDate" TIMESTAMPTZ(6),
    "caloricTargetKcal" INTEGER,
    "proteinTargetGrams" INTEGER,
    "fluidTargetMl" INTEGER,
    "phase" VARCHAR(120) NOT NULL,
    "foodsToAvoid" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NutritionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionPlanItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "itemType" "NutritionItemType" NOT NULL DEFAULT 'MEAL',
    "name" VARCHAR(200) NOT NULL,
    "instruction" TEXT,
    "timeOfDay" VARCHAR(60) NOT NULL,
    "quantity" DECIMAL(10,2),
    "unit" VARCHAR(50),
    "withMeal" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "carePlanTaskId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NutritionPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TherapyAssessment_tenantId_patientId_assessedAt_idx" ON "TherapyAssessment"("tenantId", "patientId", "assessedAt");

-- CreateIndex
CREATE INDEX "TherapyAssessment_tenantId_referralId_idx" ON "TherapyAssessment"("tenantId", "referralId");

-- CreateIndex
CREATE INDEX "ExerciseDefinition_tenantId_category_isActive_idx" ON "ExerciseDefinition"("tenantId", "category", "isActive");

-- CreateIndex
CREATE INDEX "TherapySession_tenantId_patientId_sessionDate_idx" ON "TherapySession"("tenantId", "patientId", "sessionDate");

-- CreateIndex
CREATE INDEX "TherapySession_tenantId_referralId_idx" ON "TherapySession"("tenantId", "referralId");

-- CreateIndex
CREATE INDEX "NutritionAssessment_tenantId_patientId_assessedAt_idx" ON "NutritionAssessment"("tenantId", "patientId", "assessedAt");

-- CreateIndex
CREATE INDEX "NutritionAssessment_tenantId_referralId_idx" ON "NutritionAssessment"("tenantId", "referralId");

-- CreateIndex
CREATE INDEX "NutritionPlan_tenantId_patientId_isActive_idx" ON "NutritionPlan"("tenantId", "patientId", "isActive");

-- CreateIndex
CREATE INDEX "NutritionPlan_tenantId_referralId_idx" ON "NutritionPlan"("tenantId", "referralId");

-- CreateIndex
CREATE INDEX "NutritionPlanItem_tenantId_planId_displayOrder_idx" ON "NutritionPlanItem"("tenantId", "planId", "displayOrder");

-- CreateIndex
CREATE INDEX "NutritionPlanItem_tenantId_carePlanTaskId_idx" ON "NutritionPlanItem"("tenantId", "carePlanTaskId");

-- CreateIndex
CREATE INDEX "ClinicalReferral_tenantId_discipline_status_idx" ON "ClinicalReferral"("tenantId", "discipline", "status");

-- CreateIndex
CREATE INDEX "PatientAccess_referralId_idx" ON "PatientAccess"("referralId");

-- AddForeignKey
ALTER TABLE "TherapyAssessment" ADD CONSTRAINT "TherapyAssessment_assessedByStaffId_fkey" FOREIGN KEY ("assessedByStaffId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyAssessment" ADD CONSTRAINT "TherapyAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyAssessment" ADD CONSTRAINT "TherapyAssessment_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ClinicalReferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyAssessment" ADD CONSTRAINT "TherapyAssessment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseDefinition" ADD CONSTRAINT "ExerciseDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapySession" ADD CONSTRAINT "TherapySession_conductedByStaffId_fkey" FOREIGN KEY ("conductedByStaffId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapySession" ADD CONSTRAINT "TherapySession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapySession" ADD CONSTRAINT "TherapySession_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ClinicalReferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapySession" ADD CONSTRAINT "TherapySession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionAssessment" ADD CONSTRAINT "NutritionAssessment_assessedByStaffId_fkey" FOREIGN KEY ("assessedByStaffId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionAssessment" ADD CONSTRAINT "NutritionAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionAssessment" ADD CONSTRAINT "NutritionAssessment_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ClinicalReferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionAssessment" ADD CONSTRAINT "NutritionAssessment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ClinicalReferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlanItem" ADD CONSTRAINT "NutritionPlanItem_carePlanTaskId_fkey" FOREIGN KEY ("carePlanTaskId") REFERENCES "CarePlanTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlanItem" ADD CONSTRAINT "NutritionPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "NutritionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlanItem" ADD CONSTRAINT "NutritionPlanItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
