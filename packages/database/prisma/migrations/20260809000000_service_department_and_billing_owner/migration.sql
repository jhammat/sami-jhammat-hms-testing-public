-- A service now names the hospital's own department that performs it, and the
-- party allowed to set its price. Existing services keep hospital-owned billing
-- unless they are doctor-linked in a hospital that lets doctors set their fees.
CREATE TYPE "ServiceBillingOwner" AS ENUM ('HOSPITAL', 'DEPARTMENT', 'DOCTOR');

ALTER TABLE "ServiceDefinition"
  ADD COLUMN "departmentId" UUID,
  ADD COLUMN "billingOwner" "ServiceBillingOwner" NOT NULL DEFAULT 'HOSPITAL';

ALTER TABLE "ServiceDefinition"
  ADD CONSTRAINT "ServiceDefinition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ServiceDefinition_tenantId_departmentId_isActive_idx"
  ON "ServiceDefinition" ("tenantId", "departmentId", "isActive");

UPDATE "ServiceDefinition" AS s
SET "departmentId" = d."departmentId"
FROM "DoctorProfile" AS d
WHERE s."doctorId" = d."id" AND d."departmentId" IS NOT NULL;

UPDATE "ServiceDefinition" AS s
SET "billingOwner" = 'DOCTOR'
FROM "DoctorProfile" AS d
  JOIN "StaffProfile" AS sp ON sp."id" = d."staffProfileId"
  JOIN "TenantMembership" AS m ON m."id" = sp."membershipId"
  JOIN "Organization" AS o ON o."id" = m."organizationId"
WHERE s."doctorId" = d."id" AND o."doctorFeeAuthority" = 'DOCTOR';
