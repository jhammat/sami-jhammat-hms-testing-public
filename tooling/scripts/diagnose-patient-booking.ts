/**
 * Reports, per tenant, whether patients can actually book online — and when
 * they cannot, which piece of configuration is missing.
 *
 * The patient portal needs four things lined up before it will offer a single
 * slot: an active branch, an active availability rule for the weekday, a doctor
 * with `publiclyBookable` set, and a service that is both active and
 * `publiclyBookable`. The last two default to false, so a hospital can look
 * fully configured in the admin screens and still show patients nothing.
 *
 *   pnpm db:diagnose:booking            # every tenant, next 14 days
 *   pnpm db:diagnose:booking <slug>     # one tenant
 */
import { database } from "@wonflow/database";

const HORIZON_DAYS = 14;

function nextDates(count: number) {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  for (let index = 0; index < count; index += 1) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

async function diagnoseTenant(tenantId: string, slug: string) {
  const [branches, rules, doctors, services] = await Promise.all([
    database.branch.count({ where: { tenantId, status: "ACTIVE", archivedAt: null } }),
    database.availabilityRule.findMany({
      where: { tenantId, isActive: true, branch: { status: "ACTIVE", archivedAt: null } },
      include: { service: true, doctor: { include: { staffProfile: { include: { membership: true } } } } },
    }),
    database.doctorProfile.count({ where: { tenantId, publiclyBookable: true } }),
    database.serviceDefinition.count({ where: { tenantId, isActive: true, publiclyBookable: true } }),
  ]);

  const bookable = rules.filter((rule) => rule.doctor.publiclyBookable && rule.serviceId !== null && rule.service?.isActive && rule.service.publiclyBookable);
  const weekdaysCovered = new Set(bookable.map((rule) => rule.weekday));
  const datesWithClinic = nextDates(HORIZON_DAYS).filter((date) => weekdaysCovered.has(new Date(`${date}T00:00:00.000Z`).getUTCDay()));

  console.log(`\n${slug}`);
  console.log(`  active branches           ${branches}`);
  console.log(`  active rostered windows   ${rules.length}`);
  console.log(`  doctors open to patients  ${doctors}`);
  console.log(`  services open to patients ${services}`);
  console.log(`  patient-bookable windows  ${bookable.length}`);
  console.log(`  bookable dates in ${HORIZON_DAYS}d     ${datesWithClinic.length}${datesWithClinic.length ? ` (first: ${datesWithClinic[0]})` : ""}`);

  if (bookable.length > 0) {
    console.log("  STATUS: patients can book online.");
    return;
  }

  console.log("  STATUS: patients CANNOT book online. Blocking configuration:");
  if (branches === 0) console.log("    - no active branch");
  if (rules.length === 0) console.log("    - no active availability rule (Admin -> Schedules)");
  // One line per distinct problem: a doctor rostered on five weekdays is one
  // switch to flip, not five findings.
  const findings = new Set<string>();
  for (const rule of rules) {
    const name = rule.doctor.staffProfile.membership.displayName;
    if (!rule.doctor.publiclyBookable) findings.add(`${name}: publiclyBookable is off (Admin -> Schedules -> Enable online booking)`);
    else if (rule.serviceId === null) findings.add(`${name}: rostered window has no consultation service attached`);
    else if (!rule.service?.isActive) findings.add(`${name}: service "${rule.service?.name}" is archived`);
    else if (!rule.service.publiclyBookable) findings.add(`${name}: service "${rule.service.name}" is not open to patient booking (Admin -> Services)`);
  }
  for (const finding of findings) console.log(`    - ${finding}`);
}

async function main() {
  const requested = process.argv[2];
  const tenants = await database.tenant.findMany({
    where: requested ? { slug: requested } : { status: "ACTIVE" },
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });
  if (tenants.length === 0) {
    console.error(requested ? `No tenant with slug "${requested}".` : "No active tenants.");
    process.exitCode = 1;
    return;
  }
  for (const tenant of tenants) await diagnoseTenant(tenant.id, tenant.slug);
  console.log("");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => database.$disconnect());
