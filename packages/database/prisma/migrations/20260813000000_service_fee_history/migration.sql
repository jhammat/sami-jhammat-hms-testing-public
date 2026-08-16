-- CreateTable
CREATE TABLE "ServiceFeeHistory" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "priceMinorUnits" INTEGER NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "changedByMembershipId" UUID NOT NULL,
    "changedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceFeeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceFeeHistory_tenantId_serviceId_changedAt_idx" ON "ServiceFeeHistory" ("tenantId", "serviceId", "changedAt");

-- AddForeignKey
ALTER TABLE "ServiceFeeHistory" ADD CONSTRAINT "ServiceFeeHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceFeeHistory" ADD CONSTRAINT "ServiceFeeHistory_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
