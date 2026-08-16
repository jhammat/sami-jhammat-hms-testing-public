-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PurchaseReceiptStatus" AS ENUM ('DRAFT', 'POSTED');

-- CreateEnum
CREATE TYPE "PharmacyReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PharmacyReturnDisposition" AS ENUM ('RESTOCK', 'QUARANTINE', 'DESTROY');

-- CreateEnum
CREATE TYPE "PharmacyPackageCondition" AS ENUM ('SEALED', 'OPENED', 'DAMAGED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "contactPerson" VARCHAR(200),
    "phone" VARCHAR(50),
    "email" VARCHAR(320),
    "address" VARCHAR(500),
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "supplierInvoiceNumber" VARCHAR(150) NOT NULL,
    "status" "PurchaseReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "receivedByMembershipId" UUID NOT NULL,
    "postedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptLine" (
    "id" UUID NOT NULL,
    "purchaseReceiptId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "batchNumber" VARCHAR(150) NOT NULL,
    "expiryDate" DATE NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCostMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyReturn" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "dispenseId" UUID NOT NULL,
    "status" "PharmacyReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" VARCHAR(1000) NOT NULL,
    "requestedByMembershipId" UUID NOT NULL,
    "approvedByMembershipId" UUID,
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "rejectedAt" TIMESTAMPTZ(6),
    "rejectionReason" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PharmacyReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyReturnLine" (
    "id" UUID NOT NULL,
    "returnId" UUID NOT NULL,
    "dispenseItemId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "disposition" "PharmacyReturnDisposition" NOT NULL,
    "packageCondition" "PharmacyPackageCondition" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_code_key" ON "Supplier" ("tenantId", "code");
CREATE INDEX "Supplier_tenantId_status_idx" ON "Supplier" ("tenantId", "status");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_tenantId_branchId_status_createdAt_idx" ON "PurchaseReceipt" ("tenantId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseReceiptLine_purchaseReceiptId_idx" ON "PurchaseReceiptLine" ("purchaseReceiptId");

-- CreateIndex
CREATE INDEX "PharmacyReturn_tenantId_branchId_status_requestedAt_idx" ON "PharmacyReturn" ("tenantId", "branchId", "status", "requestedAt");
CREATE INDEX "PharmacyReturn_tenantId_dispenseId_idx" ON "PharmacyReturn" ("tenantId", "dispenseId");

-- CreateIndex
CREATE INDEX "PharmacyReturnLine_returnId_idx" ON "PharmacyReturnLine" ("returnId");
CREATE INDEX "PharmacyReturnLine_dispenseItemId_idx" ON "PharmacyReturnLine" ("dispenseItemId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyReturn" ADD CONSTRAINT "PharmacyReturn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyReturn" ADD CONSTRAINT "PharmacyReturn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyReturn" ADD CONSTRAINT "PharmacyReturn_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyReturn" ADD CONSTRAINT "PharmacyReturn_dispenseId_fkey" FOREIGN KEY ("dispenseId") REFERENCES "Dispense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyReturnLine" ADD CONSTRAINT "PharmacyReturnLine_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "PharmacyReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyReturnLine" ADD CONSTRAINT "PharmacyReturnLine_dispenseItemId_fkey" FOREIGN KEY ("dispenseItemId") REFERENCES "DispenseItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyReturnLine" ADD CONSTRAINT "PharmacyReturnLine_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
