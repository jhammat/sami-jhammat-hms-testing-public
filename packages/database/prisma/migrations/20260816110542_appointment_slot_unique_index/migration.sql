-- The application already assumed this constraint existed (see the comment
-- in reception-service.ts's bookAppointment and the isUniqueConstraintError
-- catch around it) but it was never actually created — two requests could
-- both pass the application-level count check and both insert before either
-- committed. This closes that race at the database, which is the only place
-- a race between two concurrent transactions can actually be closed.
--
-- Partial (not a plain @@unique, which Prisma's schema DSL cannot express
-- with a WHERE clause) because a cancelled appointment must free the slot
-- for someone else to book — only the statuses that actually occupy the
-- doctor's time collide.
CREATE UNIQUE INDEX "Appointment_doctor_branch_start_active_key"
  ON "public"."Appointment" ("doctorId", "branchId", "startsAt")
  WHERE "doctorId" IS NOT NULL
    AND "status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_QUEUE', 'IN_PROGRESS');
