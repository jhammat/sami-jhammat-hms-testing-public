-- Hospital policy and patient-content documents. The live wording lives on
-- PolicyDocument; each publish snapshots it into PolicyDocumentVersion so the
-- exact text a patient consented to can be produced later.
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "PolicyDocument" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "title" VARCHAR(250) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "summary" VARCHAR(500),
  "body" TEXT NOT NULL,
  "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "effectiveFrom" TIMESTAMPTZ(6),
  "publishedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "archivedAt" TIMESTAMPTZ(6),
  CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PolicyDocument_tenantId_code_key" ON "PolicyDocument" ("tenantId", "code");
CREATE INDEX "PolicyDocument_tenantId_organizationId_status_idx" ON "PolicyDocument" ("tenantId", "organizationId", "status");

ALTER TABLE "PolicyDocument"
  ADD CONSTRAINT "PolicyDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PolicyDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PolicyDocumentVersion" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "policyId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "title" VARCHAR(250) NOT NULL,
  "body" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMPTZ(6),
  "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedById" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyDocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PolicyDocumentVersion_policyId_version_key" ON "PolicyDocumentVersion" ("policyId", "version");
CREATE INDEX "PolicyDocumentVersion_tenantId_policyId_idx" ON "PolicyDocumentVersion" ("tenantId", "policyId");

ALTER TABLE "PolicyDocumentVersion"
  ADD CONSTRAINT "PolicyDocumentVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PolicyDocumentVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PolicyDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
