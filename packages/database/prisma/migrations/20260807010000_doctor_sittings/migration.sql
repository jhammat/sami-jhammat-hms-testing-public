-- Doctor sittings: the doctor's actual sitting hours for a business date.
-- The hospital roster (AvailabilityRule) stays as the expected arrival window;
-- a sitting recorded here overrides it when appointment slots are generated.
CREATE TYPE "DoctorSittingStatus" AS ENUM ('PLANNED', 'AVAILABLE', 'ON_BREAK', 'FINISHED');

CREATE TABLE "DoctorSitting" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "doctorId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "businessDate" DATE NOT NULL,
  "startsMinute" INTEGER NOT NULL,
  "endsMinute" INTEGER NOT NULL,
  "averageConsultationMinutes" INTEGER NOT NULL DEFAULT 15,
  "roomLabel" VARCHAR(120),
  "status" "DoctorSittingStatus" NOT NULL DEFAULT 'PLANNED',
  "actualStartedAt" TIMESTAMPTZ(6),
  "actualEndedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "DoctorSitting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DoctorSitting_minutes_check" CHECK ("startsMinute" >= 0 AND "endsMinute" <= 1440 AND "endsMinute" > "startsMinute")
);

CREATE UNIQUE INDEX "DoctorSitting_tenantId_doctorId_branchId_businessDate_key"
  ON "DoctorSitting" ("tenantId", "doctorId", "branchId", "businessDate");
CREATE INDEX "DoctorSitting_tenantId_branchId_businessDate_idx"
  ON "DoctorSitting" ("tenantId", "branchId", "businessDate");
CREATE INDEX "DoctorSitting_tenantId_doctorId_businessDate_idx"
  ON "DoctorSitting" ("tenantId", "doctorId", "businessDate");

ALTER TABLE "DoctorSitting"
  ADD CONSTRAINT "DoctorSitting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DoctorSitting_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DoctorSitting_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
