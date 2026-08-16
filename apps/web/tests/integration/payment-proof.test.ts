/**
 * TASK I-04 verification: an admin-configured payment account is shown to
 * a patient with a prepayment-required online booking; the patient
 * uploads proof (here via a StoredObject/DocumentRecord standing in for
 * the pre-existing, unchanged chunked-upload mechanism the real UI drives)
 * and it is attached to the appointment, notifying the doctor, without
 * moving the appointment out of AWAITING_PAYMENT — only I-05's
 * confirmation step does that.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { database } from "@wonflow/database";
import type { WonFlowTenantRequestContext } from "@wonflow/contracts";

import { paymentAccountsService } from "@/server/admin/payment-accounts-service";
import { getMyAppointmentPayment, submitMyAppointmentPaymentProof } from "@/server/patient/patient-self-service";

const RUN_ID = `payment-proof-${Date.now()}`;

let tenantId: string;
let organizationId: string;
let branchId: string;
let doctorIdentityId: string;
let adminMembershipId: string;
let patientIdentityId: string;
let patientId: string;
let appointmentId: string;

function adminContext(): WonFlowTenantRequestContext {
  return {
    scope: "tenant", requestId: randomUUID(), userId: randomUUID(), identityId: randomUUID(),
    membershipId: adminMembershipId, sessionId: randomUUID(), workspace: "ADMIN", locale: "en",
    timezone: "Asia/Karachi", currencyCode: "PKR", permissionCodes: ["organization.profile.manage"],
    sourceApplication: "web", tenantId, organizationId, branchId,
  };
}

function patientContext(): WonFlowTenantRequestContext {
  return {
    scope: "tenant", requestId: randomUUID(), userId: randomUUID(), identityId: patientIdentityId,
    membershipId: null, sessionId: randomUUID(), workspace: "PATIENT", locale: "en",
    timezone: "Asia/Karachi", currencyCode: "PKR", permissionCodes: [],
    sourceApplication: "web", tenantId, organizationId, branchId,
  };
}

beforeAll(async () => {
  const tenant = await database.tenant.create({ data: { slug: RUN_ID, displayName: "Payment Proof Test Hospital", status: "ACTIVE" } });
  tenantId = tenant.id;
  const organization = await database.organization.create({ data: { tenantId, code: "main", displayName: "Main Org", status: "ACTIVE" } });
  organizationId = organization.id;
  const branch = await database.branch.create({ data: { tenantId, organizationId, code: "main", name: "Main Branch", status: "ACTIVE" } });
  branchId = branch.id;

  const doctorIdentity = await database.identity.create({ data: { email: `${RUN_ID}-doctor@example.test`, normalizedEmail: `${RUN_ID}-doctor@example.test`, status: "ACTIVE" } });
  doctorIdentityId = doctorIdentity.id;
  const doctorMembership = await database.tenantMembership.create({ data: { tenantId, identityId: doctorIdentity.id, organizationId, primaryBranchId: branchId, displayName: "Dr. Test", status: "ACTIVE" } });
  const doctorStaffProfile = await database.staffProfile.create({ data: { tenantId, membershipId: doctorMembership.id, branchId, employeeNumber: RUN_ID, staffType: "DOCTOR", status: "ACTIVE" } });
  const doctor = await database.doctorProfile.create({ data: { tenantId, staffProfileId: doctorStaffProfile.id } });

  const adminIdentity = await database.identity.create({ data: { email: `${RUN_ID}-admin@example.test`, normalizedEmail: `${RUN_ID}-admin@example.test`, status: "ACTIVE" } });
  const adminMembership = await database.tenantMembership.create({ data: { tenantId, identityId: adminIdentity.id, organizationId, primaryBranchId: branchId, displayName: "Admin Test", status: "ACTIVE" } });
  adminMembershipId = adminMembership.id;

  const patientIdentity = await database.identity.create({ data: { email: `${RUN_ID}-patient@example.test`, normalizedEmail: `${RUN_ID}-patient@example.test`, status: "ACTIVE" } });
  patientIdentityId = patientIdentity.id;
  const patient = await database.patient.create({ data: { tenantId, patientNumber: `${RUN_ID}-p`, givenName: "Test", familyName: "Patient" } });
  patientId = patient.id;
  await database.patientAccess.create({ data: { patientId: patient.id, identityId: patientIdentity.id, isPrimary: true, isActive: true } });

  const service = await database.serviceDefinition.create({
    data: { tenantId, branchId, code: `${RUN_ID}-svc`, name: "Online Consult", category: "CONSULTATION", durationMinutes: 15, priceMinorUnits: 500000, isActive: true, consultationModes: ["ONLINE"], requiresPrepayment: true },
  });

  const now = new Date();
  const appointment = await database.appointment.create({
    data: {
      tenantId, patientId: patient.id, doctorId: doctor.id, branchId, serviceId: service.id,
      consultationMode: "ONLINE", paymentStatus: "AWAITING_PAYMENT", status: "PENDING",
      source: "test", startsAt: now, endsAt: new Date(now.getTime() + 15 * 60_000),
      idempotencyKey: `${RUN_ID}-appt`,
    },
  });
  appointmentId = appointment.id;
});

afterAll(async () => {
  await database.notification.deleteMany({ where: { tenantId } });
  await database.auditEvent.deleteMany({ where: { tenantId } });
  await database.appointment.deleteMany({ where: { tenantId } });
  await database.documentRecord.deleteMany({ where: { tenantId } });
  await database.storedObject.deleteMany({ where: { tenantId } });
  await database.patientAccess.deleteMany({ where: { patientId } });
  await database.patient.deleteMany({ where: { tenantId } });
  await database.serviceDefinition.deleteMany({ where: { tenantId } });
  await database.paymentAccount.deleteMany({ where: { tenantId } });
  await database.doctorProfile.deleteMany({ where: { tenantId } });
  await database.staffProfile.deleteMany({ where: { tenantId } });
  await database.tenantMembership.deleteMany({ where: { tenantId } });
  await database.identity.deleteMany({ where: { normalizedEmail: { contains: RUN_ID } } });
  await database.branch.deleteMany({ where: { tenantId } });
  await database.organization.deleteMany({ where: { tenantId } });
  await database.tenant.delete({ where: { id: tenantId } });
});

describe("payment accounts + proof upload", () => {
  it("shows only enabled accounts to the patient and lets them upload proof, notifying the doctor without confirming payment", async () => {
    const disabled = await paymentAccountsService.createPaymentAccount(adminContext(), {
      method: "BANK_TRANSFER", accountTitle: "Old Account", accountNumber: "0000", isEnabled: false,
    });
    const enabled = await paymentAccountsService.createPaymentAccount(adminContext(), {
      method: "JAZZCASH", accountTitle: "Hospital JazzCash", accountNumber: "03001234567", isEnabled: true,
    });

    const beforeUpload = await getMyAppointmentPayment(patientContext(), appointmentId);
    expect(beforeUpload.paymentStatus).toBe("AWAITING_PAYMENT");
    expect(beforeUpload.proofUploaded).toBe(false);
    expect(beforeUpload.accounts.map((account) => account.id)).toEqual([enabled.id]);
    expect(beforeUpload.accounts.map((account) => account.id)).not.toContain(disabled.id);

    const storedObject = await database.storedObject.create({
      data: { tenantId, objectKey: `${RUN_ID}/proof.jpg`, status: "AVAILABLE", contentType: "image/jpeg", sizeBytes: 1024n },
    });
    const document = await database.documentRecord.create({
      data: { tenantId, patientId, objectId: storedObject.id, category: "PAYMENT_PROOF", title: "Payment proof", status: "RELEASED" },
    });

    const updatedAppointment = await submitMyAppointmentPaymentProof(patientContext(), appointmentId, document.id);
    expect(updatedAppointment.paymentProofDocumentId).toBe(document.id);
    expect(updatedAppointment.paymentStatus).toBe("AWAITING_PAYMENT");

    const afterUpload = await getMyAppointmentPayment(patientContext(), appointmentId);
    expect(afterUpload.proofUploaded).toBe(true);

    const notification = await database.notification.findFirst({ where: { tenantId, identityId: doctorIdentityId, templateCode: "appointment-payment-proof-uploaded" } });
    expect(notification).not.toBeNull();
    expect((notification!.payload as { appointmentId?: string }).appointmentId).toBe(appointmentId);
  }, 20_000);
});
