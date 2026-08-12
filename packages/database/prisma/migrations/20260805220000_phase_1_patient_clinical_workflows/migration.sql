-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('OPEN', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QueueEntryStatus" AS ENUM ('WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClinicalNoteStatus" AS ENUM ('DRAFT', 'SIGNED', 'RELEASED', 'AMENDED', 'VOID');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "DiagnosisCertainty" AS ENUM ('PROVISIONAL', 'DIFFERENTIAL', 'CONFIRMED', 'REFUTED');

-- CreateEnum
CREATE TYPE "AllergyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESOLVED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('PRELIMINARY', 'FINAL', 'AMENDED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "SpecimenStatus" AS ENUM ('REQUESTED', 'COLLECTED', 'RECEIVED', 'REJECTED', 'PROCESSING', 'STORED', 'DISPOSED');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "normalizedEmail" VARCHAR(320),
ADD COLUMN     "normalizedPhone" VARCHAR(50);

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "cancellationReason" VARCHAR(1000),
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(6),
ADD COLUMN     "idempotencyKey" VARCHAR(160);

-- AlterTable
ALTER TABLE "DiagnosticOrder" ADD COLUMN     "accessionNumber" VARCHAR(120),
ADD COLUMN     "branchId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "DiagnosticResult" ADD COLUMN     "acknowledgedAt" TIMESTAMPTZ(6),
ADD COLUMN     "tenantId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "PatientIdentifier" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "system" VARCHAR(200) NOT NULL,
    "value" VARCHAR(250) NOT NULL,
    "normalizedValue" VARCHAR(250) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "queueDate" DATE NOT NULL,
    "name" VARCHAR(200) NOT NULL DEFAULT 'Reception Queue',
    "status" "QueueStatus" NOT NULL DEFAULT 'OPEN',
    "nextTokenNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "queueId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "appointmentId" UUID,
    "tokenNumber" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "QueueEntryStatus" NOT NULL DEFAULT 'WAITING',
    "joinedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMPTZ(6),
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),
    "notes" TEXT,

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "key" VARCHAR(160) NOT NULL,
    "operation" VARCHAR(160) NOT NULL,
    "responsePayload" JSONB,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterNote" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "authorMembershipId" UUID NOT NULL,
    "noteType" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL,
    "status" "ClinicalNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "signedAt" TIMESTAMPTZ(6),
    "releasedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EncounterNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterDiagnosis" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "recordedByMembershipId" UUID NOT NULL,
    "codeSystem" VARCHAR(200),
    "code" VARCHAR(100),
    "display" VARCHAR(500) NOT NULL,
    "status" "DiagnosisStatus" NOT NULL DEFAULT 'ACTIVE',
    "certainty" "DiagnosisCertainty" NOT NULL DEFAULT 'PROVISIONAL',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EncounterDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAllergy" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "recordedByMembershipId" UUID NOT NULL,
    "allergen" VARCHAR(500) NOT NULL,
    "reaction" TEXT,
    "severity" VARCHAR(80),
    "status" "AllergyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalObservation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "recordedByMembershipId" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "display" VARCHAR(300) NOT NULL,
    "valueNumber" DECIMAL(18,6),
    "valueText" TEXT,
    "unit" VARCHAR(80),
    "status" "ObservationStatus" NOT NULL DEFAULT 'PRELIMINARY',
    "observedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ClinicalObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticSpecimen" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "diagnosticOrderId" UUID NOT NULL,
    "accessionNumber" VARCHAR(120) NOT NULL,
    "specimenType" VARCHAR(150) NOT NULL,
    "status" "SpecimenStatus" NOT NULL DEFAULT 'REQUESTED',
    "collectedByMembershipId" UUID,
    "receivedByMembershipId" UUID,
    "collectedAt" TIMESTAMPTZ(6),
    "receivedAt" TIMESTAMPTZ(6),
    "rejectedAt" TIMESTAMPTZ(6),
    "rejectionReason" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DiagnosticSpecimen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientIdentifier_tenantId_patientId_idx" ON "PatientIdentifier"("tenantId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientIdentifier_tenantId_system_normalizedValue_key" ON "PatientIdentifier"("tenantId", "system", "normalizedValue");

-- CreateIndex
CREATE INDEX "Queue_tenantId_branchId_queueDate_status_idx" ON "Queue"("tenantId", "branchId", "queueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_tenantId_branchId_queueDate_key" ON "Queue"("tenantId", "branchId", "queueDate");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_appointmentId_key" ON "QueueEntry"("appointmentId");

-- CreateIndex
CREATE INDEX "QueueEntry_tenantId_queueId_status_priority_joinedAt_idx" ON "QueueEntry"("tenantId", "queueId", "status", "priority", "joinedAt");

-- CreateIndex
CREATE INDEX "QueueEntry_tenantId_patientId_idx" ON "QueueEntry"("tenantId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_queueId_tokenNumber_key" ON "QueueEntry"("queueId", "tokenNumber");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_tenantId_key_operation_key" ON "IdempotencyRecord"("tenantId", "key", "operation");

-- CreateIndex
CREATE INDEX "EncounterNote_tenantId_encounterId_status_idx" ON "EncounterNote"("tenantId", "encounterId", "status");

-- CreateIndex
CREATE INDEX "EncounterNote_tenantId_authorMembershipId_idx" ON "EncounterNote"("tenantId", "authorMembershipId");

-- CreateIndex
CREATE INDEX "EncounterDiagnosis_tenantId_patientId_status_idx" ON "EncounterDiagnosis"("tenantId", "patientId", "status");

-- CreateIndex
CREATE INDEX "EncounterDiagnosis_tenantId_encounterId_idx" ON "EncounterDiagnosis"("tenantId", "encounterId");

-- CreateIndex
CREATE INDEX "PatientAllergy_tenantId_patientId_status_idx" ON "PatientAllergy"("tenantId", "patientId", "status");

-- CreateIndex
CREATE INDEX "ClinicalObservation_tenantId_patientId_code_observedAt_idx" ON "ClinicalObservation"("tenantId", "patientId", "code", "observedAt");

-- CreateIndex
CREATE INDEX "ClinicalObservation_tenantId_encounterId_idx" ON "ClinicalObservation"("tenantId", "encounterId");

-- CreateIndex
CREATE INDEX "DiagnosticSpecimen_tenantId_diagnosticOrderId_status_idx" ON "DiagnosticSpecimen"("tenantId", "diagnosticOrderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticSpecimen_tenantId_accessionNumber_key" ON "DiagnosticSpecimen"("tenantId", "accessionNumber");

-- CreateIndex
CREATE INDEX "Patient_tenantId_normalizedPhone_idx" ON "Patient"("tenantId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "Patient_tenantId_normalizedEmail_idx" ON "Patient"("tenantId", "normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_tenantId_idempotencyKey_key" ON "Appointment"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_tenantId_branchId_type_status_createdAt_idx" ON "DiagnosticOrder"("tenantId", "branchId", "type", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticOrder_tenantId_accessionNumber_key" ON "DiagnosticOrder"("tenantId", "accessionNumber");

-- CreateIndex
CREATE INDEX "DiagnosticResult_tenantId_status_releasedAt_idx" ON "DiagnosticResult"("tenantId", "status", "releasedAt");

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticResult" ADD CONSTRAINT "DiagnosticResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientIdentifier" ADD CONSTRAINT "PatientIdentifier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientIdentifier" ADD CONSTRAINT "PatientIdentifier_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterNote" ADD CONSTRAINT "EncounterNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterNote" ADD CONSTRAINT "EncounterNote_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterDiagnosis" ADD CONSTRAINT "EncounterDiagnosis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterDiagnosis" ADD CONSTRAINT "EncounterDiagnosis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterDiagnosis" ADD CONSTRAINT "EncounterDiagnosis_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticSpecimen" ADD CONSTRAINT "DiagnosticSpecimen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticSpecimen" ADD CONSTRAINT "DiagnosticSpecimen_diagnosticOrderId_fkey" FOREIGN KEY ("diagnosticOrderId") REFERENCES "DiagnosticOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
