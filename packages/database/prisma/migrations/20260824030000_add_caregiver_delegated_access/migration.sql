-- AlterTable PatientAccess
ALTER TABLE "public"."PatientAccess"
  ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY['observations.write', 'careplan.complete']::TEXT[],
  ADD COLUMN IF NOT EXISTS "invitedBy" UUID,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ(6);

-- AlterTable AuthSession
ALTER TABLE "public"."AuthSession"
  ADD COLUMN IF NOT EXISTS "patientId" UUID,
  ADD COLUMN IF NOT EXISTS "actingRelationship" VARCHAR(80);

-- CreateEnum CaregiverInvitationStatus
CREATE TYPE "public"."CaregiverInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable CaregiverInvitation
CREATE TABLE "public"."CaregiverInvitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "invitedById" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "relationship" VARCHAR(80) NOT NULL,
    "permissions" TEXT[] NOT NULL DEFAULT ARRAY['observations.write', 'careplan.complete']::TEXT[],
    "tokenHash" CHAR(64) NOT NULL,
    "status" "public"."CaregiverInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CaregiverInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverInvitation_tokenHash_key" ON "public"."CaregiverInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "CaregiverInvitation_tenantId_patientId_idx" ON "public"."CaregiverInvitation"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "CaregiverInvitation_tokenHash_status_idx" ON "public"."CaregiverInvitation"("tokenHash", "status");

-- AddForeignKey
ALTER TABLE "public"."CaregiverInvitation" ADD CONSTRAINT "CaregiverInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CaregiverInvitation" ADD CONSTRAINT "CaregiverInvitation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CaregiverInvitation" ADD CONSTRAINT "CaregiverInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
