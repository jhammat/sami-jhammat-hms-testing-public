-- Existing doctor memberships must receive the profiles required by
-- doctor-owned consultation services.
INSERT INTO "StaffProfile" (
  "id",
  "tenantId",
  "membershipId",
  "branchId",
  "employeeNumber",
  "staffType",
  "status",
  "title",
  "createdAt",
  "updatedAt"
)
SELECT
  md5('staff-' || membership."id"::text)::uuid,
  membership."tenantId",
  membership."id",
  membership."primaryBranchId",
  'DR-' || membership."id"::text,
  'DOCTOR',
  'ACTIVE'::"StaffStatus",
  'Doctor',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "TenantMembership" AS membership
WHERE 'DOCTOR'::"WorkspaceCode" = ANY(membership."workspaceCodes")
  AND membership."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "StaffProfile" AS staff
    WHERE staff."membershipId" = membership."id"
  );

UPDATE "StaffProfile" AS staff
SET
  "staffType" = 'DOCTOR',
  "title" = COALESCE(staff."title", 'Doctor'),
  "updatedAt" = CURRENT_TIMESTAMP
FROM "TenantMembership" AS membership
WHERE staff."membershipId" = membership."id"
  AND 'DOCTOR'::"WorkspaceCode" = ANY(membership."workspaceCodes")
  AND membership."archivedAt" IS NULL;

INSERT INTO "DoctorProfile" (
  "id",
  "tenantId",
  "staffProfileId",
  "durationMinutes",
  "publiclyBookable",
  "createdAt",
  "updatedAt"
)
SELECT
  md5('doctor-' || staff."id"::text)::uuid,
  staff."tenantId",
  staff."id",
  15,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "StaffProfile" AS staff
INNER JOIN "TenantMembership" AS membership
  ON membership."id" = staff."membershipId"
WHERE 'DOCTOR'::"WorkspaceCode" = ANY(membership."workspaceCodes")
  AND membership."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "DoctorProfile" AS doctor
    WHERE doctor."staffProfileId" = staff."id"
  );
