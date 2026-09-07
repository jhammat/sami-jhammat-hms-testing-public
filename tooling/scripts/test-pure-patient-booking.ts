import { database } from "@wonflow/database";
import { getPatientBookingCatalog, bookMyAppointment } from "../../apps/web/src/server/patient/patient-self-service";
import type { WonFlowTenantRequestContext } from "@wonflow/contracts";

async function main() {
  const patient = await database.patient.findFirst({
    where: { email: "testpatient1788162396@example.com" },
    include: { tenant: { include: { organizations: true, branches: true } } }
  });
  const identity = await database.identity.findFirst({
    where: { email: "testpatient1788162396@example.com" }
  });

  if (!patient || !identity) return console.log("Not found");

  const org = patient.tenant.organizations[0];
  const branch = patient.tenant.branches[0];

  const requestContext: WonFlowTenantRequestContext = {
    scope: "tenant",
    requestId: "test-req-pure-patient",
    userId: identity.id,
    identityId: identity.id,
    tenantId: patient.tenantId,
    organizationId: org.id,
    membershipId: null, // Pure patient with NO membership
    branchId: branch?.id ?? null,
    sessionId: "47e7cd18-f9a5-4d8d-a22d-93dd5b9b01bc", // UUID
    workspace: "patient",
    locale: "en",
    currencyCode: "PKR",
    permissionCodes: ["observations.write", "careplan.complete"],
    timezone: branch?.timezone || "Asia/Karachi",
    sourceApplication: "PATIENT_PORTAL",
  };

  console.log("Testing getPatientBookingCatalog for pure patient on Monday (2026-09-07)...");
  try {
    const catalog = await getPatientBookingCatalog(requestContext, "2026-09-07");
    console.log("Monday Catalog:", {
      optionsCount: catalog.options.length,
      slotsCount: catalog.slots.length,
      availableSlots: catalog.slots.filter(s => s.available).length,
    });

    if (catalog.slots.some(s => s.available)) {
      const slot = catalog.slots.find(s => s.available)!;
      console.log("Attempting booking for pure patient with membershipId: null...");
      try {
        const appt = await bookMyAppointment(requestContext, {
          slotId: slot.id,
          mode: "IN_PERSON",
          reason: "Pure patient booking test",
          idempotencyKey: `pure-${Date.now()}-${Math.random()}`,
        });
        console.log("SUCCESS! Booked:", {
          id: appt.id,
          status: appt.status,
          startsAt: appt.startsAt,
        });
      } catch (err: any) {
        console.error("BOOKING FAILED:", err.message, err.code);
        if (err.stack) console.error(err.stack);
      }
    }
  } catch (err: any) {
    console.error("CATALOG FAILED:", err.message, err.code);
  }
}

main().catch(console.error).finally(() => database.$disconnect());
