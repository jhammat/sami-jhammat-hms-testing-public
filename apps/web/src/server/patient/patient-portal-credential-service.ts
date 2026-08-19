import { randomBytes, randomInt } from "node:crypto";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { hashPassword } from "@/lib/auth/password";

/**
 * The portal password rules live in validateNewPassword, which throws a plain
 * Error. Left unwrapped that surfaces as an opaque 500 ("The request could not
 * be completed."), so the doctor never learns which rule the password they
 * typed broke. Rethrow it as a 400 the credentials modal can display.
 */
async function hashPortalPassword(password: string): Promise<string> {
  try {
    return await hashPassword(password);
  } catch (cause) {
    throw new WonFlowApiError(
      400,
      "weak-password",
      cause instanceof Error ? cause.message : "That password does not meet the password rules.",
    );
  }
}

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

  // Determine password. The generated one appends a digit explicitly: an
  // uppercase hex triplet can come out all-letters, which would fail the
  // "must contain a numeric character" rule on an auto-generated password.
  const temporaryPassword =
    input?.password?.trim() ||
    `Patient#${randomBytes(3).toString("hex").toUpperCase()}${randomInt(10)}`;
  const passwordHash = await hashPortalPassword(temporaryPassword);

  // An identity that already carries a staff membership must never be
  // repurposed here: the block below resets passwordHash, so accepting one
  // would let a credentials form take over a doctor's or administrator's
  // account by typing their email address.
  const existingIdentity = await database.identity.findUnique({
    where: { normalizedEmail },
    include: { memberships: { select: { id: true, tenantId: true, workspaceCodes: true } } },
  });
  if (existingIdentity?.isPlatformAdministrator) {
    throw new WonFlowApiError(
      409,
      "email-already-in-use",
      "That email already belongs to an administrator account. Use a different login email.",
    );
  }
  const conflictingMembership = existingIdentity?.memberships.find((membership) =>
    membership.workspaceCodes.some((code) => code !== "PATIENT"),
  );
  if (conflictingMembership) {
    throw new WonFlowApiError(
      409,
      "email-already-in-use",
      "That email already belongs to a staff account. Use a different login email.",
    );
  }

  await database.$transaction(async (transaction) => {
    const record = existingIdentity
      ? await transaction.identity.update({
          where: { id: existingIdentity.id },
          data: { passwordHash, status: "ACTIVE", mustChangePassword: false },
        })
      : await transaction.identity.create({
          data: { email, normalizedEmail, passwordHash, status: "ACTIVE", mustChangePassword: false },
        });

    // Sign-in resolves its workspaces from TenantMembership alone (see
    // authenticateAccount). Without this row the patient authenticates and is
    // then refused with "No active workspace is assigned to this account", and
    // every portal service — which all call requireTenantContext — has no
    // tenant to run against. PATIENT carries no permission codes by design;
    // the portal authorizes through PatientAccess.
    await transaction.tenantMembership.upsert({
      where: { tenantId_identityId: { tenantId: context.tenantId, identityId: record.id } },
      create: {
        tenantId: context.tenantId,
        identityId: record.id,
        organizationId: context.organizationId,
        primaryBranchId: context.branchId,
        displayName: [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" "),
        status: "ACTIVE",
        workspaceCodes: ["PATIENT"],
        primaryWorkspace: "PATIENT",
      },
      update: { status: "ACTIVE", workspaceCodes: ["PATIENT"], primaryWorkspace: "PATIENT" },
    });

    if (patient.email !== email) {
      await transaction.patient.update({
        where: { id: patient.id },
        data: { email, normalizedEmail },
      });
    }

    await transaction.patientAccess.upsert({
      where: { patientId_identityId: { patientId: patient.id, identityId: record.id } },
      create: {
        patientId: patient.id,
        identityId: record.id,
        isPrimary: true,
        isActive: true,
        relationship: "self",
      },
      update: { isActive: true },
    });

    return record;
  });

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
