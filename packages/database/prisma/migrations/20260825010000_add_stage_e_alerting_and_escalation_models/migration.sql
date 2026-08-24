-- CreateEnum
CREATE TYPE "AlertMetricType" AS ENUM ('OBSERVATION', 'DRAIN', 'SYMPTOM', 'TASK_ADHERENCE', 'WEIGHT_CHANGE', 'LAB_VALUE');

-- CreateEnum
CREATE TYPE "AlertComparator" AS ENUM ('GT', 'GTE', 'LT', 'LTE', 'EQ', 'CHANGE_BY', 'CHANGE_TO', 'MISSED_COUNT');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertEventStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AlertEscalationChannel" AS ENUM ('PUSH', 'SMS', 'CALL');

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "patientCategory" VARCHAR(120),
    "metricType" "AlertMetricType" NOT NULL,
    "metricCode" VARCHAR(100) NOT NULL,
    "comparator" "AlertComparator" NOT NULL,
    "thresholdValue" VARCHAR(100) NOT NULL,
    "thresholdSecondary" VARCHAR(100),
    "windowHours" INTEGER,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByMembershipId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAlertRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "overrideThresholdValue" VARCHAR(100),
    "overrideSeverity" "AlertSeverity",
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PatientAlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "ruleId" UUID,
    "title" VARCHAR(250) NOT NULL,
    "description" TEXT,
    "metricType" "AlertMetricType" NOT NULL,
    "metricCode" VARCHAR(100) NOT NULL,
    "metricValue" VARCHAR(100) NOT NULL,
    "sourceRecordType" VARCHAR(100) NOT NULL,
    "sourceRecordId" UUID,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "status" "AlertEventStatus" NOT NULL DEFAULT 'OPEN',
    "deviceRecordedAt" TIMESTAMPTZ(6),
    "triggeredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedByMembershipId" UUID,
    "acknowledgedAt" TIMESTAMPTZ(6),
    "resolvedByMembershipId" UUID,
    "resolvedAt" TIMESTAMPTZ(6),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRota" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "primaryMembershipId" UUID NOT NULL,
    "escalationMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AlertRota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEscalation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "alertEventId" UUID NOT NULL,
    "step" INTEGER NOT NULL,
    "channel" "AlertEscalationChannel" NOT NULL DEFAULT 'PUSH',
    "targetMembershipId" UUID NOT NULL,
    "scheduledFor" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "acknowledgedAt" TIMESTAMPTZ(6),
    "failedAt" TIMESTAMPTZ(6),
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AlertEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertRule_tenantId_metricType_isActive_idx" ON "AlertRule"("tenantId", "metricType", "isActive");

-- CreateIndex
CREATE INDEX "AlertRule_tenantId_metricCode_idx" ON "AlertRule"("tenantId", "metricCode");

-- CreateIndex
CREATE INDEX "PatientAlertRule_tenantId_patientId_ruleId_idx" ON "PatientAlertRule"("tenantId", "patientId", "ruleId");

-- CreateIndex
CREATE INDEX "PatientAlertRule_tenantId_ruleId_idx" ON "PatientAlertRule"("tenantId", "ruleId");

-- CreateIndex
CREATE INDEX "AlertEvent_tenantId_status_severity_triggeredAt_idx" ON "AlertEvent"("tenantId", "status", "severity", "triggeredAt");

-- CreateIndex
CREATE INDEX "AlertEvent_tenantId_patientId_status_idx" ON "AlertEvent"("tenantId", "patientId", "status");

-- CreateIndex
CREATE INDEX "AlertEvent_tenantId_ruleId_idx" ON "AlertEvent"("tenantId", "ruleId");

-- CreateIndex
CREATE INDEX "AlertRota_tenantId_dayOfWeek_severity_idx" ON "AlertRota"("tenantId", "dayOfWeek", "severity");

-- CreateIndex
CREATE INDEX "AlertEscalation_tenantId_alertEventId_step_idx" ON "AlertEscalation"("tenantId", "alertEventId", "step");

-- CreateIndex
CREATE INDEX "AlertEscalation_tenantId_scheduledFor_sentAt_idx" ON "AlertEscalation"("tenantId", "scheduledFor", "sentAt");

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_createdByMembershipId_fkey" FOREIGN KEY ("createdByMembershipId") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAlertRule" ADD CONSTRAINT "PatientAlertRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAlertRule" ADD CONSTRAINT "PatientAlertRule_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAlertRule" ADD CONSTRAINT "PatientAlertRule_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_acknowledgedByMembershipId_fkey" FOREIGN KEY ("acknowledgedByMembershipId") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_resolvedByMembershipId_fkey" FOREIGN KEY ("resolvedByMembershipId") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRota" ADD CONSTRAINT "AlertRota_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRota" ADD CONSTRAINT "AlertRota_primaryMembershipId_fkey" FOREIGN KEY ("primaryMembershipId") REFERENCES "TenantMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRota" ADD CONSTRAINT "AlertRota_escalationMembershipId_fkey" FOREIGN KEY ("escalationMembershipId") REFERENCES "TenantMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEscalation" ADD CONSTRAINT "AlertEscalation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEscalation" ADD CONSTRAINT "AlertEscalation_alertEventId_fkey" FOREIGN KEY ("alertEventId") REFERENCES "AlertEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEscalation" ADD CONSTRAINT "AlertEscalation_targetMembershipId_fkey" FOREIGN KEY ("targetMembershipId") REFERENCES "TenantMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
