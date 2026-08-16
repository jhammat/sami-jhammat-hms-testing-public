/**
 * FIX-22: seeds a volume dataset (5,000 patients, 20,000 appointments) into
 * the existing development tenant, purely to measure list/detail/search
 * timings at realistic scale — not a "realistic hospital day" like
 * seed-demo-data.ts. Uses batched createMany, not one row at a time, so it
 * finishes in seconds rather than minutes.
 *
 * Idempotent: patient numbers and appointment idempotency keys are
 * deterministic (PERF-00001..PERF-05000), so re-running skips rows that
 * already exist rather than duplicating them.
 *
 *   pnpm exec tsx tooling/scripts/seed-performance-dataset.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

if (process.env.NODE_ENV === "production" || process.env.WONFLOW_ENVIRONMENT === "production") {
  throw new Error("Performance dataset seeding is disabled in production.");
}

const PATIENT_COUNT = 5_000;
const APPOINTMENT_COUNT = 20_000;
const BATCH_SIZE = 1_000;

async function main(): Promise<void> {
  const { database } = await import("../../packages/database/src/index.js");

  const tenant = await database.tenant.findUnique({ where: { slug: "wonflow-development" }, select: { id: true } });
  if (!tenant) throw new Error("Run `pnpm db:seed:dev` first — the development tenant does not exist yet.");

  const branch = await database.branch.findFirst({ where: { tenantId: tenant.id, isMainBranch: true }, select: { id: true } });
  if (!branch) throw new Error("The development tenant has no main branch.");

  const doctor = await database.doctorProfile.findFirst({
    where: { tenantId: tenant.id, staffProfile: { membership: { identity: { normalizedEmail: "doctor@wonflow.local" } } } },
    select: { id: true },
  });
  if (!doctor) throw new Error("Run `pnpm db:seed:dev` first — the development doctor does not exist yet.");

  console.log(`Seeding ${PATIENT_COUNT} patients...`);
  const existingPatientCount = await database.patient.count({ where: { tenantId: tenant.id, patientNumber: { startsWith: "PERF-" } } });
  if (existingPatientCount < PATIENT_COUNT) {
    for (let start = existingPatientCount; start < PATIENT_COUNT; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, PATIENT_COUNT);
      const rows = Array.from({ length: end - start }, (_, offset) => {
        const index = start + offset;
        const patientNumber = `PERF-${String(index + 1).padStart(5, "0")}`;
        return {
          tenantId: tenant.id,
          patientNumber,
          givenName: `Perf${index}`,
          familyName: `Patient${index}`,
          sex: index % 2 === 0 ? "Male" : "Female",
          dateOfBirth: new Date(Date.UTC(1950 + (index % 60), index % 12, 1 + (index % 28))),
          phone: `030${String(10000000 + index).padStart(8, "0")}`,
          normalizedPhone: `030${String(10000000 + index).padStart(8, "0")}`,
          status: "ACTIVE" as const,
        };
      });
      await database.patient.createMany({ data: rows, skipDuplicates: true });
      console.log(`  patients ${end}/${PATIENT_COUNT}`);
    }
  } else {
    console.log(`  already have ${existingPatientCount} — skipping.`);
  }

  const patients = await database.patient.findMany({
    where: { tenantId: tenant.id, patientNumber: { startsWith: "PERF-" } },
    select: { id: true },
    orderBy: { patientNumber: "asc" },
    take: PATIENT_COUNT,
  });

  console.log(`Seeding ${APPOINTMENT_COUNT} appointments...`);
  const existingAppointmentCount = await database.appointment.count({ where: { tenantId: tenant.id, source: "performance-seed" } });
  if (existingAppointmentCount < APPOINTMENT_COUNT) {
    // Every appointment needs a distinct (doctorId, branchId, startsAt) —
    // the real double-booking unique index enforces this even here — so
    // slots step forward 5 minutes at a time across roughly 70 days on
    // either side of today, not clustered into real business hours.
    const anchor = new Date();
    anchor.setUTCHours(0, 0, 0, 0);
    anchor.setUTCDate(anchor.getUTCDate() - 35);

    for (let start = existingAppointmentCount; start < APPOINTMENT_COUNT; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, APPOINTMENT_COUNT);
      const rows = Array.from({ length: end - start }, (_, offset) => {
        const index = start + offset;
        const startsAt = new Date(anchor.getTime() + index * 5 * 60_000);
        const statusPool = ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED"] as const;
        return {
          tenantId: tenant.id,
          patientId: patients[index % patients.length]!.id,
          doctorId: doctor.id,
          branchId: branch.id,
          status: statusPool[index % statusPool.length],
          consultationMode: "IN_PERSON" as const,
          source: "performance-seed",
          reason: "Performance dataset appointment",
          startsAt,
          endsAt: new Date(startsAt.getTime() + 15 * 60_000),
          idempotencyKey: `perf-seed-${index}`,
        };
      });
      await database.appointment.createMany({ data: rows, skipDuplicates: true });
      console.log(`  appointments ${end}/${APPOINTMENT_COUNT}`);
    }
  } else {
    console.log(`  already have ${existingAppointmentCount} — skipping.`);
  }

  console.log("Done.");
  await database.$disconnect();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
