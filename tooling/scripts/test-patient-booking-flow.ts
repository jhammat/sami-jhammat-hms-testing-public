import { database } from "@wonflow/database";
import { getPatientBookingCatalog, bookMyAppointment } from "../../apps/web/src/server/patient/patient-self-service";
import type { WonFlowTenantRequestContext } from "@wonflow/contracts";

async function main() {
  const session = await database.authSession.findFirst({
    where: { patientId: "0d31e423-95ac-4093-b766-6d6d5bd9bbc5", status: "ACTIVE" },
    include: { identity: true, membership: true }
  });

  if (!session) {
    console.log("No active session found for patient!");
    return;
  }

  console.log("Found active patient session:", {
    id: session.id,
    patientId: session.patientId,
    membershipId: session.membershipId,
    tenantId: session.tenantId,
    organizationId: session.organizationId,
    branchId: session.branchId,
  });

  const branch = await database.branch.findUnique({
    where: { id: session.branchId! }
  });

  const requestContext: WonFlowTenantRequestContext = {
    scope: "tenant",
    requestId: "test-req-real",
    userId: session.membershipId!,
    identityId: session.identityId,
    tenantId: session.tenantId!,
    organizationId: session.organizationId!,
    membershipId: session.membershipId!,
    branchId: session.branchId,
    sessionId: session.id,
    workspace: "patient",
    locale: "en",
    currencyCode: "PKR",
    permissionCodes: ["observations.write", "careplan.complete"],
    timezone: branch?.timezone || "Asia/Karachi",
    sourceApplication: "PATIENT_PORTAL",
  };

  console.log("\n--- Checking 14 days of catalog for this patient ---");
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
    try {
      const catalog = await getPatientBookingCatalog(requestContext, dateStr);
      console.log(`${dateStr} (${dayOfWeek}): options=${catalog.options.length}, slots=${catalog.slots.length}, available=${catalog.slots.filter(s => s.available).length}, blockers=${catalog.blockers.map(b => b.code).join(", ")}`);
      if (catalog.slots.some(s => s.available)) {
        const slot = catalog.slots.find(s => s.available)!;
        console.log(`  -> Trying to book slot ${slot.id} on ${dateStr}...`);
        try {
          const appt = await bookMyAppointment(requestContext, {
            slotId: slot.id,
            mode: "IN_PERSON",
            reason: "Testing booking flow",
            idempotencyKey: `real-key-${Date.now()}-${Math.random()}`,
          });
          console.log(`  -> BOOKING SUCCEEDED: appointment ID = ${appt.id}, status = ${appt.status}`);
        } catch (bookingErr: any) {
          console.error(`  -> BOOKING ERROR on ${dateStr}:`, bookingErr.message, bookingErr.code);
          if (bookingErr.meta) console.error("     Meta:", bookingErr.meta);
        }
      }
    } catch (err: any) {
      console.error(`Error on ${dateStr}:`, err.message);
    }
  }

  console.log("\n--- Rules in tenant 7530f00d-99fd-44e2-ab95-65a9051a1a01 ---");
  const rules = await database.availabilityRule.findMany({
    where: { tenantId: session.tenantId!, isActive: true },
    include: {
      service: true,
      doctor: { include: { staffProfile: { include: { membership: true } } } },
      branch: true,
    }
  });
  console.log(`Found ${rules.length} rules:`);
  for (const r of rules) {
    console.log({
      id: r.id,
      weekday: r.weekday,
      hours: `${Math.floor(r.startsMinute/60)}:${r.startsMinute%60} - ${Math.floor(r.endsMinute/60)}:${r.endsMinute%60}`,
      doctor: r.doctor.staffProfile.membership.displayName,
      doctorPublic: r.doctor.publiclyBookable,
      serviceName: r.service?.name,
      servicePublic: r.service?.publiclyBookable,
      branchName: r.branch?.name,
      branchOrgId: r.branch?.organizationId,
      sessionOrgId: session.organizationId,
    });
  }
}

main().catch(console.error).finally(() => database.$disconnect());
