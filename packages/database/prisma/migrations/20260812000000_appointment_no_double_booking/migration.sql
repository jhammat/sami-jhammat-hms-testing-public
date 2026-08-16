-- Prevents two appointments for the same clinician, branch and start time.
--
-- A plain `@@unique` cannot express this in schema.prisma: a cancelled or
-- no-show appointment must not permanently block its slot, and Prisma's
-- schema language has no partial/filtered unique index syntax. This index
-- is therefore hand-written SQL, not represented in schema.prisma — see
-- packages/database/README.md and docs/architecture/appointment-booking.md.
--
-- A concurrent INSERT that violates this index raises Postgres error 23505
-- (unique_violation), which the application maps to an HTTP 409 response.
CREATE UNIQUE INDEX "appointment_doctor_branch_start_active_key"
ON "Appointment" ("tenantId", "doctorId", "branchId", "startsAt")
WHERE "doctorId" IS NOT NULL
  AND "status" NOT IN ('CANCELLED', 'NO_SHOW');
