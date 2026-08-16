-- CreateEnum
CREATE TYPE "PaymentAccountMethod" AS ENUM ('BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA');

-- CreateTable
CREATE TABLE "PaymentAccount" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "method" "PaymentAccountMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "bankName" VARCHAR(200),
    "accountTitle" VARCHAR(200) NOT NULL,
    "accountNumber" VARCHAR(100) NOT NULL,
    "iban" VARCHAR(50),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentAccount_tenantId_isEnabled_displayOrder_idx" ON "PaymentAccount"("tenantId", "isEnabled", "displayOrder");

-- AddForeignKey
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
