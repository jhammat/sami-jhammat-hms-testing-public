/**
 * One-off cleanup for test/demo artifacts that leaked into the development
 * tenant's visible data during this session's Playwright runs (dummy staff
 * accounts, "Playwright ..." patients and their records, the FIX-22
 * performance-seed dataset, and ad-hoc test tenants created by FIX-21's
 * platform/cross-tenant tests). Does not touch the real seeded accounts
 * (admin/reception/doctor/... @wonflow.local, supervised-doctor@wonflow.local,
 * platform@wonflow.local) or the wonflow-development tenant itself.
 *
 *   pnpm exec tsx tooling/scripts/cleanup-test-artifacts.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

if (process.env.NODE_ENV === "production" || process.env.WONFLOW_ENVIRONMENT === "production") {
  throw new Error("Test-artifact cleanup is disabled in production.");
}

async function main(): Promise<void> {
  const { database } = await import("../../packages/database/src/index.js");

  const tenant = await database.tenant.findUnique({ where: { slug: "wonflow-development" }, select: { id: true } });
  if (!tenant) throw new Error("The development tenant does not exist.");

  // --- 1. Test tenants (everything except the real development tenant) ---
  const testTenants = await database.tenant.findMany({ where: { slug: { not: "wonflow-development" } }, select: { id: true, slug: true } });
  console.log(`Deleting ${testTenants.length} test tenants...`);
  for (const t of testTenants) {
    await database.$transaction(async (tx) => {
      await tx.auditEvent.deleteMany({ where: { tenantId: t.id } });
      await tx.supportAccessGrant.deleteMany({ where: { tenantId: t.id } });
      await tx.tenantEntitlement.deleteMany({ where: { tenantId: t.id } });
      await tx.tenantSubscription.deleteMany({ where: { tenantId: t.id } });

      // Clinical/financial records, deepest-first, scoped by tenant directly
      // (a test tenant's own data, not shared with the real dev tenant).
      await tx.diagnosticResult.deleteMany({ where: { order: { tenantId: t.id } } });
      await tx.diagnosticSpecimen.deleteMany({ where: { order: { tenantId: t.id } } });
      await tx.diagnosticOrder.deleteMany({ where: { tenantId: t.id } });
      await tx.pharmacyReturnLine.deleteMany({ where: { return: { tenantId: t.id } } });
      await tx.pharmacyReturn.deleteMany({ where: { tenantId: t.id } });
      await tx.dispenseItem.deleteMany({ where: { dispense: { tenantId: t.id } } });
      await tx.dispense.deleteMany({ where: { tenantId: t.id } });
      await tx.prescriptionItem.deleteMany({ where: { prescription: { tenantId: t.id } } });
      await tx.prescription.deleteMany({ where: { tenantId: t.id } });
      await tx.encounterNote.deleteMany({ where: { encounter: { tenantId: t.id } } });
      await tx.encounterDiagnosis.deleteMany({ where: { tenantId: t.id } });
      await tx.clinicalObservation.deleteMany({ where: { tenantId: t.id } });
      await tx.encounter.deleteMany({ where: { tenantId: t.id } });
      await tx.refund.deleteMany({ where: { tenantId: t.id } });
      await tx.payment.deleteMany({ where: { tenantId: t.id } });
      await tx.invoiceLine.deleteMany({ where: { invoice: { tenantId: t.id } } });
      await tx.invoice.deleteMany({ where: { tenantId: t.id } });
      await tx.queueEntry.deleteMany({ where: { tenantId: t.id } });
      await tx.queue.deleteMany({ where: { tenantId: t.id } });
      await tx.videoCallSignal.deleteMany({ where: { session: { appointment: { tenantId: t.id } } } });
      await tx.videoCallSession.deleteMany({ where: { appointment: { tenantId: t.id } } });
      await tx.appointment.deleteMany({ where: { tenantId: t.id } });
      await tx.documentAccessToken.deleteMany({ where: { document: { tenantId: t.id } } });
      await tx.documentRecord.deleteMany({ where: { tenantId: t.id } });
      await tx.notification.deleteMany({ where: { tenantId: t.id } });
      await tx.patientAllergy.deleteMany({ where: { tenantId: t.id } });
      await tx.patientIdentifier.deleteMany({ where: { tenantId: t.id } });
      await tx.patientAccess.deleteMany({ where: { patient: { tenantId: t.id } } });
      await tx.patient.deleteMany({ where: { tenantId: t.id } });
      await tx.availabilityRule.deleteMany({ where: { tenantId: t.id } });
      await tx.doctorSitting.deleteMany({ where: { tenantId: t.id } });
      await tx.serviceFeeHistory.deleteMany({ where: { tenantId: t.id } });
      await tx.serviceDefinition.deleteMany({ where: { tenantId: t.id } });
      await tx.stockMovement.deleteMany({ where: { tenantId: t.id } });
      await tx.inventoryBatch.deleteMany({ where: { tenantId: t.id } });
      await tx.purchaseReceiptLine.deleteMany({ where: { purchaseReceipt: { tenantId: t.id } } });
      await tx.purchaseReceipt.deleteMany({ where: { tenantId: t.id } });
      await tx.supplier.deleteMany({ where: { tenantId: t.id } });
      await tx.medication.deleteMany({ where: { tenantId: t.id } });
      await tx.policyDocumentVersion.deleteMany({ where: { policy: { tenantId: t.id } } });
      await tx.policyDocument.deleteMany({ where: { tenantId: t.id } });
      await tx.department.deleteMany({ where: { tenantId: t.id } });

      await tx.membershipRole.deleteMany({ where: { tenantId: t.id } });
      await tx.membershipPermissionGrant.deleteMany({ where: { tenantId: t.id } });
      await tx.rolePermission.deleteMany({ where: { tenantId: t.id } });
      await tx.role.deleteMany({ where: { tenantId: t.id } });
      await tx.doctorProfile.deleteMany({ where: { tenantId: t.id } });
      await tx.staffProfile.deleteMany({ where: { tenantId: t.id } });
      await tx.authSession.deleteMany({ where: { tenantId: t.id } });
      await tx.oneTimeToken.deleteMany({ where: { tenantId: t.id } });
      await tx.tenantMembership.deleteMany({ where: { tenantId: t.id } });
      await tx.branch.deleteMany({ where: { tenantId: t.id } });
      await tx.organization.deleteMany({ where: { tenantId: t.id } });
      await tx.tenant.delete({ where: { id: t.id } });
    });
  }

  // --- 2. Dummy staff identities (dummy.doctor.*, dummy.receptionist.* etc.) ---
  const dummyIdentities = await database.identity.findMany({ where: { normalizedEmail: { startsWith: "dummy." } }, select: { id: true } });
  console.log(`Deleting ${dummyIdentities.length} dummy staff identities...`);
  for (const identity of dummyIdentities) {
    const memberships = await database.tenantMembership.findMany({ where: { identityId: identity.id }, select: { id: true } });
    for (const membership of memberships) {
      const staffProfile = await database.staffProfile.findUnique({ where: { membershipId: membership.id }, select: { id: true } });
      if (staffProfile) {
        await database.doctorProfile.deleteMany({ where: { staffProfileId: staffProfile.id } });
        await database.staffProfile.delete({ where: { id: staffProfile.id } });
      }
      await database.membershipRole.deleteMany({ where: { membershipId: membership.id } });
      await database.membershipPermissionGrant.deleteMany({ where: { membershipId: membership.id } });
      await database.authSession.deleteMany({ where: { membershipId: membership.id } });
      await database.tenantMembership.delete({ where: { id: membership.id } });
    }
    await database.identity.delete({ where: { id: identity.id } });
  }

  // --- 3. Playwright / performance-seed patients and everything hanging off them ---
  const testPatients = await database.patient.findMany({
    where: {
      tenantId: tenant.id,
      OR: [
        { patientNumber: { startsWith: "PERF-" } },
        { givenName: { in: ["RaceA", "RaceB"] } },
        { givenName: { contains: "Playwright", mode: "insensitive" } },
        { familyName: { contains: "Playwright", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  console.log(`Deleting ${testPatients.length} test/performance-seed patients and their records...`);
  const patientIds = testPatients.map((p) => p.id);

  for (let start = 0; start < patientIds.length; start += 500) {
    const batch = patientIds.slice(start, start + 500);
    await database.$transaction(async (tx) => {
      const dispenseIds = (await tx.dispense.findMany({ where: { patientId: { in: batch } }, select: { id: true } })).map((d) => d.id);
      await tx.pharmacyReturnLine.deleteMany({ where: { return: { dispenseId: { in: dispenseIds } } } });
      await tx.pharmacyReturn.deleteMany({ where: { dispenseId: { in: dispenseIds } } });
      await tx.dispenseItem.deleteMany({ where: { dispenseId: { in: dispenseIds } } });
      await tx.dispense.deleteMany({ where: { id: { in: dispenseIds } } });

      const prescriptionIds = (await tx.prescription.findMany({ where: { patientId: { in: batch } }, select: { id: true } })).map((p) => p.id);
      await tx.prescriptionItem.deleteMany({ where: { prescriptionId: { in: prescriptionIds } } });
      await tx.prescription.deleteMany({ where: { id: { in: prescriptionIds } } });

      const orderIds = (await tx.diagnosticOrder.findMany({ where: { patientId: { in: batch } }, select: { id: true } })).map((o) => o.id);
      await tx.diagnosticResult.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.diagnosticSpecimen.deleteMany({ where: { diagnosticOrderId: { in: orderIds } } });
      await tx.diagnosticOrder.deleteMany({ where: { id: { in: orderIds } } });

      const encounterIds = (await tx.encounter.findMany({ where: { patientId: { in: batch } }, select: { id: true } })).map((e) => e.id);
      await tx.encounterNote.deleteMany({ where: { encounterId: { in: encounterIds } } });
      await tx.encounterDiagnosis.deleteMany({ where: { encounterId: { in: encounterIds } } });
      await tx.clinicalObservation.deleteMany({ where: { encounterId: { in: encounterIds } } });
      await tx.encounter.deleteMany({ where: { id: { in: encounterIds } } });

      const invoiceIds = (await tx.invoice.findMany({ where: { patientId: { in: batch } }, select: { id: true } })).map((i) => i.id);
      await tx.refund.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      await tx.invoiceLine.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });

      await tx.queueEntry.deleteMany({ where: { patientId: { in: batch } } });
      await tx.appointment.deleteMany({ where: { patientId: { in: batch } } });
      await tx.documentRecord.deleteMany({ where: { patientId: { in: batch } } });
      await tx.notification.deleteMany({ where: { patientId: { in: batch } } });
      await tx.patientAllergy.deleteMany({ where: { patientId: { in: batch } } });
      await tx.patientIdentifier.deleteMany({ where: { patientId: { in: batch } } });
      await tx.patientAccess.deleteMany({ where: { patientId: { in: batch } } });
      await tx.clinicalObservation.deleteMany({ where: { patientId: { in: batch } } });
      await tx.patient.deleteMany({ where: { id: { in: batch } } });
    });
    console.log(`  ${Math.min(start + 500, patientIds.length)}/${patientIds.length}`);
  }

  // --- 4. Leftover performance-seed appointments that reference other patients ---
  const leftoverPerfAppointments = await database.appointment.count({ where: { tenantId: tenant.id, source: "performance-seed" } });
  if (leftoverPerfAppointments > 0) {
    console.log(`Deleting ${leftoverPerfAppointments} remaining performance-seed appointments...`);
    await database.appointment.deleteMany({ where: { tenantId: tenant.id, source: "performance-seed" } });
  }

  console.log("Done.");
  await database.$disconnect();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
