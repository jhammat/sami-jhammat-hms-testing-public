-- Patient education: content, assignments and completions.
--
-- These three tables and the EducationContentType enum were in schema.prisma
-- with no migration to create them. A database built by `prisma migrate
-- deploy` therefore did not have them, while a developer machine built by
-- `prisma migrate dev` did — so the API routes under
-- /api/v1/clinical/education worked locally and would have failed on the
-- server with "relation does not exist", and `pnpm db:seed:sjh` could not
-- finish.
--
-- Generated with `prisma migrate diff` from the state the existing migrations
-- produce to the state schema.prisma declares, so it closes the gap exactly.
--
-- The DoctorFeeRequest alteration below drops two database-level defaults that
-- 20260828000000 created but the schema never declared. Prisma supplies both
-- values on every write (`@default(uuid())` is generated client-side and
-- `@updatedAt` is set by the client), so nothing depends on the database
-- defaults. Dropping them is what keeps `migrate status` reading clean rather
-- than carrying this difference into whatever migration someone writes next.


-- CreateEnum
CREATE TYPE "EducationContentType" AS ENUM ('VIDEO', 'DOCUMENT', 'ARTICLE');

-- AlterTable
ALTER TABLE "DoctorFeeRequest" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "EducationAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "contentId" UUID NOT NULL,
    "assignedByMembershipId" UUID,
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMPTZ(6),
    "carePlanTaskId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EducationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationCompletion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "completedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedByIdentityId" UUID NOT NULL,
    "watchedSeconds" INTEGER,
    "comprehensionPassed" BOOLEAN,
    "comprehensionScore" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationContent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "contentType" "EducationContentType" NOT NULL DEFAULT 'ARTICLE',
    "url" VARCHAR(1000),
    "documentId" UUID,
    "durationSeconds" INTEGER,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "hasComprehensionCheck" BOOLEAN NOT NULL DEFAULT false,
    "comprehensionQuestions" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EducationContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EducationAssignment_tenantId_carePlanTaskId_idx" ON "EducationAssignment"("tenantId", "carePlanTaskId");

-- CreateIndex
CREATE INDEX "EducationAssignment_tenantId_contentId_idx" ON "EducationAssignment"("tenantId", "contentId");

-- CreateIndex
CREATE INDEX "EducationAssignment_tenantId_patientId_dueDate_idx" ON "EducationAssignment"("tenantId", "patientId", "dueDate");

-- CreateIndex
CREATE INDEX "EducationCompletion_assignmentId_completedAt_idx" ON "EducationCompletion"("assignmentId", "completedAt");

-- CreateIndex
CREATE INDEX "EducationCompletion_completedByIdentityId_idx" ON "EducationCompletion"("completedByIdentityId");

-- CreateIndex
CREATE INDEX "EducationContent_tenantId_category_isActive_displayOrder_idx" ON "EducationContent"("tenantId", "category", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "EducationContent_tenantId_language_isActive_idx" ON "EducationContent"("tenantId", "language", "isActive");

-- AddForeignKey
ALTER TABLE "EducationAssignment" ADD CONSTRAINT "EducationAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAssignment" ADD CONSTRAINT "EducationAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAssignment" ADD CONSTRAINT "EducationAssignment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "EducationContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAssignment" ADD CONSTRAINT "EducationAssignment_assignedByMembershipId_fkey" FOREIGN KEY ("assignedByMembershipId") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAssignment" ADD CONSTRAINT "EducationAssignment_carePlanTaskId_fkey" FOREIGN KEY ("carePlanTaskId") REFERENCES "CarePlanTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationCompletion" ADD CONSTRAINT "EducationCompletion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EducationAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationCompletion" ADD CONSTRAINT "EducationCompletion_completedByIdentityId_fkey" FOREIGN KEY ("completedByIdentityId") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationContent" ADD CONSTRAINT "EducationContent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

