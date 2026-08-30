-- AlterEnum
ALTER TYPE "DoctorFeeAuthority" ADD VALUE IF NOT EXISTS 'APPROVAL_REQUIRED';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DoctorFeeRequestType" AS ENUM ('CREATE_SERVICE', 'UPDATE_FEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DoctorFeeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DoctorFeeRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "serviceId" UUID,
    "doctorId" UUID NOT NULL,
    "requestedByMembershipId" UUID NOT NULL,
    "requestType" "DoctorFeeRequestType" NOT NULL,
    "proposedName" VARCHAR(250),
    "proposedDescription" TEXT,
    "proposedDurationMinutes" INTEGER,
    "proposedPriceMinorUnits" INTEGER NOT NULL,
    "proposedCurrencyCode" CHAR(3) NOT NULL DEFAULT 'PKR',
    "proposedBranchId" UUID,
    "proposedPubliclyBookable" BOOLEAN NOT NULL DEFAULT false,
    "proposedConsultationModes" "ConsultationMode"[] DEFAULT ARRAY['IN_PERSON'::"ConsultationMode"],
    "status" "DoctorFeeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByMembershipId" UUID,
    "reviewNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(6),

    CONSTRAINT "DoctorFeeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DoctorFeeRequest_tenantId_status_idx" ON "DoctorFeeRequest"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "DoctorFeeRequest_tenantId_doctorId_status_idx" ON "DoctorFeeRequest"("tenantId", "doctorId", "status");
CREATE INDEX IF NOT EXISTS "DoctorFeeRequest_serviceId_idx" ON "DoctorFeeRequest"("serviceId");
CREATE INDEX IF NOT EXISTS "DoctorFeeRequest_doctorId_idx" ON "DoctorFeeRequest"("doctorId");
CREATE INDEX IF NOT EXISTS "DoctorFeeRequest_requestedByMembershipId_idx" ON "DoctorFeeRequest"("requestedByMembershipId");
CREATE INDEX IF NOT EXISTS "DoctorFeeRequest_reviewedByMembershipId_idx" ON "DoctorFeeRequest"("reviewedByMembershipId");
CREATE INDEX IF NOT EXISTS "DoctorFeeRequest_proposedBranchId_idx" ON "DoctorFeeRequest"("proposedBranchId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "DoctorFeeRequest" ADD CONSTRAINT "DoctorFeeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DoctorFeeRequest" ADD CONSTRAINT "DoctorFeeRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DoctorFeeRequest" ADD CONSTRAINT "DoctorFeeRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DoctorFeeRequest" ADD CONSTRAINT "DoctorFeeRequest_requestedByMembershipId_fkey" FOREIGN KEY ("requestedByMembershipId") REFERENCES "TenantMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DoctorFeeRequest" ADD CONSTRAINT "DoctorFeeRequest_reviewedByMembershipId_fkey" FOREIGN KEY ("reviewedByMembershipId") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DoctorFeeRequest" ADD CONSTRAINT "DoctorFeeRequest_proposedBranchId_fkey" FOREIGN KEY ("proposedBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
