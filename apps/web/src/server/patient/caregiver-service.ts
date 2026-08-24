import crypto from "node:crypto";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type {
  CaregiverAccessSummary,
  CaregiverAcceptInput,
  CaregiverInvitationSummary,
  CaregiverInviteInput,
  PatientCaregiversResponse,
  WonFlowRequestContext,
} from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export class CaregiverService {
  private async resolvePrimaryPatient(requestContext: WonFlowRequestContext) {
    const context = requireTenantContext(requestContext);

    const access = await database.patientAccess.findFirst({
      where: {
        identityId: context.identityId,
        isActive: true,
        isPrimary: true,
        patient: {
          tenantId: context.tenantId,
          status: "ACTIVE",
        },
      },
      include: {
        patient: true,
      },
    });

    if (!access) {
      // Also allow self relationship if isPrimary wasn't explicitly set
      const selfAccess = await database.patientAccess.findFirst({
        where: {
          identityId: context.identityId,
          isActive: true,
          relationship: "self",
          patient: {
            tenantId: context.tenantId,
            status: "ACTIVE",
          },
        },
        include: {
          patient: true,
        },
      });

      if (!selfAccess) {
        throw new WonFlowApiError(
          403,
          "primary-patient-required",
          "Only the primary patient can manage caregiver delegations.",
        );
      }

      return { context, patient: selfAccess.patient, access: selfAccess };
    }

    return { context, patient: access.patient, access };
  }

  async inviteCaregiver(
    requestContext: WonFlowRequestContext,
    input: CaregiverInviteInput,
  ) {
    const { context, patient } = await this.resolvePrimaryPatient(requestContext);

    const normalizedEmail = input.email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new WonFlowApiError(400, "invalid-email", "A valid email address is required.");
    }

    const relationship = input.relationship?.trim();
    if (!relationship) {
      throw new WonFlowApiError(400, "missing-relationship", "Caregiver relationship is required.");
    }

    const validDays = Math.max(1, Math.min(input.validDays ?? 30, 365));
    const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

    const permissions =
      Array.isArray(input.permissions) && input.permissions.length > 0
        ? input.permissions
        : ["observations.write", "careplan.complete"];

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const invitation = await database.caregiverInvitation.create({
      data: {
        tenantId: context.tenantId,
        patientId: patient.id,
        invitedById: context.identityId,
        email: normalizedEmail,
        relationship,
        permissions,
        tokenHash,
        status: "PENDING",
        expiresAt,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: context.branchId,
        actorMembershipId: context.membershipId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        action: "patient.caregiver.invited",
        entityType: "caregiver-invitation",
        entityId: invitation.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
        metadata: {
          patientId: patient.id,
          email: normalizedEmail,
          relationship,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    return {
      invitationId: invitation.id,
      inviteToken: rawToken,
      expiresAt: expiresAt.toISOString(),
      email: normalizedEmail,
      relationship,
    };
  }

  async acceptCaregiverInvite(
    requestContext: WonFlowRequestContext,
    input: CaregiverAcceptInput,
  ) {
    const context = requireTenantContext(requestContext);

    const rawToken = input.inviteToken?.trim();
    if (!rawToken) {
      throw new WonFlowApiError(400, "missing-token", "Caregiver invite token is required.");
    }

    const tokenHash = hashToken(rawToken);
    const invitation = await database.caregiverInvitation.findUnique({
      where: { tokenHash },
      include: {
        patient: true,
      },
    });

    if (!invitation || invitation.status !== "PENDING") {
      throw new WonFlowApiError(
        404,
        "invalid-invitation",
        "This caregiver invitation is invalid or has already been used.",
      );
    }

    if (invitation.expiresAt < new Date()) {
      await database.caregiverInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      throw new WonFlowApiError(
        410,
        "invitation-expired",
        "This caregiver invitation has expired.",
      );
    }

    const result = await database.$transaction(async (tx) => {
      await tx.caregiverInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      const access = await tx.patientAccess.upsert({
        where: {
          patientId_identityId: {
            patientId: invitation.patientId,
            identityId: context.identityId,
          },
        },
        create: {
          patientId: invitation.patientId,
          identityId: context.identityId,
          relationship: invitation.relationship,
          isPrimary: false,
          isActive: true,
          permissions: invitation.permissions,
          invitedBy: invitation.invitedById,
          expiresAt: invitation.expiresAt,
        },
        update: {
          relationship: invitation.relationship,
          isActive: true,
          permissions: invitation.permissions,
          invitedBy: invitation.invitedById,
          expiresAt: invitation.expiresAt,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: invitation.tenantId,
          branchId: context.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "patient.caregiver.accepted",
          entityType: "patient-access",
          entityId: access.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            patientId: invitation.patientId,
            relationship: invitation.relationship,
          },
        },
      });

      return access;
    });

    return {
      success: true,
      accessId: result.id,
      patientId: invitation.patientId,
      patientName: `${invitation.patient.givenName} ${invitation.patient.familyName}`,
      relationship: invitation.relationship,
      permissions: result.permissions,
      expiresAt: result.expiresAt?.toISOString() ?? null,
    };
  }

  async listCaregivers(
    requestContext: WonFlowRequestContext,
  ): Promise<PatientCaregiversResponse> {
    const { context, patient } = await this.resolvePrimaryPatient(requestContext);

    const [delegates, invitations] = await Promise.all([
      database.patientAccess.findMany({
        where: {
          patientId: patient.id,
          isPrimary: false,
          relationship: { not: "self" },
        },
        include: {
          identity: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      database.caregiverInvitation.findMany({
        where: {
          tenantId: context.tenantId,
          patientId: patient.id,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const activeDelegates: CaregiverAccessSummary[] = delegates.map((d) => ({
      id: d.id,
      patientId: d.patientId,
      identityId: d.identityId,
      caregiverEmail: d.identity.email,
      relationship: d.relationship,
      permissions: d.permissions,
      invitedBy: d.invitedBy,
      expiresAt: d.expiresAt?.toISOString() ?? null,
      isActive: d.isActive && (!d.expiresAt || d.expiresAt >= new Date()),
      createdAt: d.createdAt.toISOString(),
    }));

    const pendingInvitations: CaregiverInvitationSummary[] = invitations.map(
      (inv) => ({
        id: inv.id,
        tenantId: inv.tenantId,
        patientId: inv.patientId,
        email: inv.email,
        relationship: inv.relationship,
        permissions: inv.permissions,
        status: inv.status as CaregiverInvitationSummary["status"],
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      }),
    );

    return {
      activeDelegates,
      pendingInvitations,
    };
  }

  async revokeCaregiver(
    requestContext: WonFlowRequestContext,
    accessId: string,
  ) {
    const { context, patient } = await this.resolvePrimaryPatient(requestContext);

    const access = await database.patientAccess.findFirst({
      where: {
        id: accessId,
        patientId: patient.id,
      },
    });

    if (!access) {
      throw new WonFlowApiError(
        404,
        "caregiver-access-not-found",
        "Caregiver delegation record could not be found.",
      );
    }

    await database.patientAccess.update({
      where: { id: access.id },
      data: { isActive: false },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: context.branchId,
        actorMembershipId: context.membershipId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        action: "patient.caregiver.revoked",
        entityType: "patient-access",
        entityId: access.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
        metadata: {
          patientId: patient.id,
          caregiverIdentityId: access.identityId,
        },
      },
    });

    return { success: true };
  }
}

export const caregiverService = new CaregiverService();
