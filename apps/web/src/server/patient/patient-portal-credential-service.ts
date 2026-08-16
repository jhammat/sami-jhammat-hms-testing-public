import { randomBytes } from "node:crypto";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { hashPassword } from "@/lib/auth/password";

export async function provisionPatientPortalCredentials(
  requestContext: WonFlowRequestContext,
  patientId: string,
  input?: { email?: string; password?: string },
) {
  const context = requireTenantContext(requestContext);
  const patient = await database.patient.findFirst({
    where: { id: patientId, tenantId: context.tenantId },
  });
  if (!patient) throw new WonFlowApiError(404, "patient-not-found", "Patient not found.");

  // Determine login email
  let rawEmail = input?.email?.trim() || patient.email?.trim();
  if (!rawEmail) {
    const cleanNum = patient.patientNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
    const given = patient.givenName.toLowerCase().replace(/[^a-z0-9]/g, "");
    rawEmail = `${given ? `${given}.` : ""}${cleanNum}@patient.wonflow.com`;
  }
  const email = rawEmail.toLowerCase();
  const normalizedEmail = email;

  // Determine password
  const temporaryPassword =
    input?.password?.trim() || `Patient#${randomBytes(3).toString("hex").toUpperCase()}`;
  const passwordHash = await hashPassword(temporaryPassword);

  // Check if an Identity with normalizedEmail already exists
  let identity = await database.identity.findUnique({
    where: { normalizedEmail },
  });

  if (identity) {
    await database.identity.update({
      where: { id: identity.id },
      data: {
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
      },
    });
  } else {
    identity = await database.identity.create({
      data: {
        email,
        normalizedEmail,
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
      },
    });
  }

  // Update patient record email if needed
  if (patient.email !== email) {
    await database.patient.update({
      where: { id: patient.id },
      data: { email, normalizedEmail },
    });
  }

  // Link or update PatientAccess
  const existingAccess = await database.patientAccess.findFirst({
    where: { patientId: patient.id, identityId: identity.id },
  });

  if (!existingAccess) {
    await database.patientAccess.create({
      data: {
        patientId: patient.id,
        identityId: identity.id,
        isPrimary: true,
        isActive: true,
        relationship: "self",
      },
    });
  } else {
    await database.patientAccess.update({
      where: { id: existingAccess.id },
      data: { isActive: true },
    });
  }

  await database.auditEvent.create({
    data: {
      tenantId: context.tenantId,
      branchId: context.branchId,
      actorMembershipId: context.membershipId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      action: "patient.portal_credentials.provisioned",
      entityType: "patient",
      entityId: patient.id,
      severity: "INFORMATION",
      metadata: { email, patientNumber: patient.patientNumber },
      sourceApplication: context.sourceApplication,
    },
  });

  return {
    patientId: patient.id,
    patientName: [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" "),
    patientNumber: patient.patientNumber,
    email,
    temporaryPassword,
    portalUrl: "/patient",
  };
}

export async function getPatientPortalAccessStatus(
  requestContext: WonFlowRequestContext,
  patientId: string,
) {
  const context = requireTenantContext(requestContext);
  const patient = await database.patient.findFirst({
    where: { id: patientId, tenantId: context.tenantId },
    select: {
      id: true,
      email: true,
      patientNumber: true,
      accessAccounts: {
        where: { isActive: true },
        select: { id: true, identityId: true },
      },
    },
  });
  if (!patient) throw new WonFlowApiError(404, "patient-not-found", "Patient not found.");
  return {
    hasPortalAccess: patient.accessAccounts.length > 0,
    email: patient.email ?? null,
  };
}
