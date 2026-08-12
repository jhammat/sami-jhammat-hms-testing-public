-- A service names who operates it: either a desk (reception, laboratory, ...)
-- or one specific staff member. This replaces the short-lived department link,
-- which duplicated the category without saying who actually does the work.
ALTER TABLE "ServiceDefinition"
  ADD COLUMN "handlerWorkspace" "WorkspaceCode",
  ADD COLUMN "handlerMembershipId" UUID;

ALTER TABLE "ServiceDefinition"
  ADD CONSTRAINT "ServiceDefinition_handlerMembershipId_fkey" FOREIGN KEY ("handlerMembershipId") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ServiceDefinition_tenantId_handlerMembershipId_isActive_idx"
  ON "ServiceDefinition" ("tenantId", "handlerMembershipId", "isActive");

-- Doctor-linked services are operated by that doctor; the rest fall back to the
-- desk their category already routes to.
UPDATE "ServiceDefinition" AS s
SET "handlerMembershipId" = m."id"
FROM "DoctorProfile" AS d
  JOIN "StaffProfile" AS sp ON sp."id" = d."staffProfileId"
  JOIN "TenantMembership" AS m ON m."id" = sp."membershipId"
WHERE s."doctorId" = d."id";

UPDATE "ServiceDefinition"
SET "handlerWorkspace" = CASE "category"
  WHEN 'LABORATORY' THEN 'LABORATORY'::"WorkspaceCode"
  WHEN 'RADIOLOGY' THEN 'RADIOLOGY'::"WorkspaceCode"
  WHEN 'PHARMACY' THEN 'PHARMACY'::"WorkspaceCode"
  WHEN 'CONSULTATION' THEN 'DOCTOR'::"WorkspaceCode"
  ELSE 'RECEPTION'::"WorkspaceCode"
END
WHERE "handlerMembershipId" IS NULL;

-- Departments no longer own services, and department-owned pricing goes with them.
UPDATE "ServiceDefinition" SET "billingOwner" = 'HOSPITAL' WHERE "billingOwner" = 'DEPARTMENT';

DROP INDEX IF EXISTS "ServiceDefinition_tenantId_departmentId_isActive_idx";
ALTER TABLE "ServiceDefinition" DROP CONSTRAINT IF EXISTS "ServiceDefinition_departmentId_fkey";
ALTER TABLE "ServiceDefinition" DROP COLUMN "departmentId";
