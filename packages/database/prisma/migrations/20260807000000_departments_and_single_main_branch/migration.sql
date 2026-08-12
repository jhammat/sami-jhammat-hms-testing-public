-- 1. Repair tenants that ended up with more than one main branch.
--    Keep the oldest active main branch, demote every other.
UPDATE "Branch" b
SET "isMainBranch" = FALSE
WHERE b."isMainBranch"
  AND b."id" <> (
    SELECT m."id"
    FROM "Branch" m
    WHERE m."tenantId" = b."tenantId"
      AND m."organizationId" = b."organizationId"
      AND m."isMainBranch"
      AND m."archivedAt" IS NULL
    ORDER BY m."createdAt" ASC, m."id" ASC
    LIMIT 1
  );

-- 2. Promote a main branch for any organization left without one.
UPDATE "Branch"
SET "isMainBranch" = TRUE
WHERE "id" IN (
  SELECT DISTINCT ON (x."tenantId", x."organizationId") x."id"
  FROM "Branch" x
  WHERE x."archivedAt" IS NULL
    AND x."status" <> 'ARCHIVED'
    AND NOT EXISTS (
      SELECT 1
      FROM "Branch" y
      WHERE y."tenantId" = x."tenantId"
        AND y."organizationId" = x."organizationId"
        AND y."isMainBranch"
        AND y."archivedAt" IS NULL
    )
  ORDER BY x."tenantId", x."organizationId", x."createdAt" ASC, x."id" ASC
);

-- 3. Make a second main branch impossible from now on.
CREATE UNIQUE INDEX "Branch_single_main_per_organization"
  ON "Branch" ("tenantId", "organizationId")
  WHERE "isMainBranch" AND "archivedAt" IS NULL;

-- 4. Hospital departments.
CREATE TABLE "Department" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "branchId" UUID,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "archivedAt" TIMESTAMPTZ(6),
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_tenantId_code_key" ON "Department" ("tenantId", "code");
CREATE INDEX "Department_tenantId_organizationId_isActive_idx" ON "Department" ("tenantId", "organizationId", "isActive");

ALTER TABLE "Department"
  ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Department_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Doctors belong to a department.
ALTER TABLE "DoctorProfile" ADD COLUMN "departmentId" UUID;

CREATE INDEX "DoctorProfile_tenantId_departmentId_idx" ON "DoctorProfile" ("tenantId", "departmentId");

ALTER TABLE "DoctorProfile"
  ADD CONSTRAINT "DoctorProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Seed departments from the specialties already recorded against doctors,
--    so existing clinical staff keep a department after the upgrade.
INSERT INTO "Department" ("id", "tenantId", "organizationId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  s."tenantId",
  s."organizationId",
  UPPER(REGEXP_REPLACE(s."specialty", '[^a-zA-Z0-9]+', '_', 'g')),
  s."specialty",
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT d."tenantId", m."organizationId", TRIM(d."specialty") AS "specialty"
  FROM "DoctorProfile" d
  JOIN "StaffProfile" sp ON sp."id" = d."staffProfileId"
  JOIN "TenantMembership" m ON m."id" = sp."membershipId"
  WHERE d."specialty" IS NOT NULL AND TRIM(d."specialty") <> ''
) s
ON CONFLICT ("tenantId", "code") DO NOTHING;

UPDATE "DoctorProfile" d
SET "departmentId" = dep."id"
FROM "Department" dep
WHERE dep."tenantId" = d."tenantId"
  AND dep."name" = TRIM(d."specialty")
  AND d."departmentId" IS NULL
  AND d."specialty" IS NOT NULL;
