-- CreateTable
CREATE TABLE "TenantOnboardingState" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "currentStep" VARCHAR(50) NOT NULL,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantOnboardingState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantOnboardingState_tenantId_key" ON "TenantOnboardingState" ("tenantId");

-- AddForeignKey
ALTER TABLE "TenantOnboardingState" ADD CONSTRAINT "TenantOnboardingState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
