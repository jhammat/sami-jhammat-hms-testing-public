-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT', 'DISPENSE', 'RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY', 'RECALL');

-- CreateEnum
CREATE TYPE "DispenseStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'PARTIALLY_COMPLETED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateEnum
CREATE TYPE "DeviceApplication" AS ENUM ('PATIENT', 'DOCTOR', 'STAFF');

-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN     "refreshExpiresAt" TIMESTAMPTZ(6),
ADD COLUMN     "refreshTokenHash" CHAR(64);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "inventoryBatchId" UUID,
    "type" "StockMovementType" NOT NULL,
    "quantityDelta" DECIMAL(18,4) NOT NULL,
    "unit" VARCHAR(80) NOT NULL,
    "actorMembershipId" UUID NOT NULL,
    "referenceType" VARCHAR(120),
    "referenceId" VARCHAR(200),
    "reason" VARCHAR(1000),
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispense" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "status" "DispenseStatus" NOT NULL DEFAULT 'DRAFT',
    "dispensedByMembershipId" UUID NOT NULL,
    "notes" TEXT,
    "completedAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),
    "cancellationReason" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Dispense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispenseItem" (
    "id" UUID NOT NULL,
    "dispenseId" UUID NOT NULL,
    "prescriptionItemId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "inventoryBatchId" UUID NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'PKR',
    "reason" VARCHAR(1000) NOT NULL,
    "requestedByMembershipId" UUID NOT NULL,
    "approvedByMembershipId" UUID,
    "completedByMembershipId" UUID,
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "rejectedAt" TIMESTAMPTZ(6),
    "rejectionReason" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceRegistration" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "application" "DeviceApplication" NOT NULL,
    "deviceId" VARCHAR(250) NOT NULL,
    "deviceName" VARCHAR(250),
    "pushToken" VARCHAR(1000),
    "appVersion" VARCHAR(80),
    "operatingSystem" VARCHAR(120),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DeviceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_branchId_occurredAt_idx" ON "StockMovement"("tenantId", "branchId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_medicationId_occurredAt_idx" ON "StockMovement"("tenantId", "medicationId", "occurredAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_inventoryBatchId_idx" ON "StockMovement"("tenantId", "inventoryBatchId");

-- CreateIndex
CREATE INDEX "Dispense_tenantId_branchId_status_createdAt_idx" ON "Dispense"("tenantId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Dispense_tenantId_patientId_createdAt_idx" ON "Dispense"("tenantId", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Dispense_tenantId_prescriptionId_idx" ON "Dispense"("tenantId", "prescriptionId");

-- CreateIndex
CREATE INDEX "DispenseItem_dispenseId_idx" ON "DispenseItem"("dispenseId");

-- CreateIndex
CREATE INDEX "DispenseItem_inventoryBatchId_idx" ON "DispenseItem"("inventoryBatchId");

-- CreateIndex
CREATE INDEX "Refund_tenantId_status_requestedAt_idx" ON "Refund"("tenantId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "Refund_tenantId_invoiceId_idx" ON "Refund"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "Refund_tenantId_paymentId_idx" ON "Refund"("tenantId", "paymentId");

-- CreateIndex
CREATE INDEX "DeviceRegistration_tenantId_application_isActive_idx" ON "DeviceRegistration"("tenantId", "application", "isActive");

-- CreateIndex
CREATE INDEX "DeviceRegistration_pushToken_idx" ON "DeviceRegistration"("pushToken");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegistration_identityId_application_deviceId_key" ON "DeviceRegistration"("identityId", "application", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispense" ADD CONSTRAINT "Dispense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispense" ADD CONSTRAINT "Dispense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispense" ADD CONSTRAINT "Dispense_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispense" ADD CONSTRAINT "Dispense_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseItem" ADD CONSTRAINT "DispenseItem_dispenseId_fkey" FOREIGN KEY ("dispenseId") REFERENCES "Dispense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseItem" ADD CONSTRAINT "DispenseItem_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseItem" ADD CONSTRAINT "DispenseItem_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseItem" ADD CONSTRAINT "DispenseItem_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "InventoryBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegistration" ADD CONSTRAINT "DeviceRegistration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegistration" ADD CONSTRAINT "DeviceRegistration_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
