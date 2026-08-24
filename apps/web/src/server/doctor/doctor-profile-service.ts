import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { WonFlowApiError } from "@/server/http/route-handler";

async function resolveProfile(requestContext: WonFlowRequestContext) {
  const context = requireTenantContext(requestContext);
  if (!context.membershipId) {
    throw new WonFlowApiError(403, "doctor-membership-required", "A doctor membership is required.");
  }
  const profile = await database.doctorProfile.findFirst({
    where: {
      tenantId: context.tenantId,
      staffProfile: {
        membershipId: context.membershipId,
        status: "ACTIVE",
        membership: { organizationId: context.organizationId, archivedAt: null },
      },
    },
    include: {
      staffProfile: {
        include: { membership: { include: { identity: true } }, branch: true },
      },
    },
  });
  if (!profile) {
    throw new WonFlowApiError(403, "doctor-profile-required", "A valid doctor profile is required.");
  }
  return { context, profile };
}

function serializeProfile(profile: Awaited<ReturnType<typeof resolveProfile>>["profile"]) {
  const displayName = profile.staffProfile.membership.displayName.trim();
  const parts = displayName.split(/\s+/);
  return {
    id: profile.id,
    organizationId: profile.staffProfile.membership.organizationId,
    primaryBranchId: profile.staffProfile.branchId ?? "",
    employeeNumber: profile.staffProfile.employeeNumber,
    displayName,
    givenName: parts[0] ?? displayName,
    familyName: parts.slice(1).join(" "),
    profileImageUrl: profile.profileImageData ?? undefined,
    specialtyCode: profile.specialty?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "doctor",
    specialtyName: profile.specialty || "Clinical practitioner",
    roleCodes: ["doctor", "practitioner"],
    operationalStatus: "off-duty" as const,
    fictional: false as const,
    createdAt: profile.createdAt.toISOString(),
    email: profile.staffProfile.membership.identity.email,
    title: profile.staffProfile.title ?? "Doctor",
    registrationNumber: profile.registrationNumber ?? "",
    qualifications: profile.qualifications ?? "",
    biography: profile.biography ?? "",
    contactPhone: profile.contactPhone ?? "",
    durationMinutes: profile.durationMinutes,
    publiclyBookable: profile.publiclyBookable,
    signatureImageData: profile.signatureImageData ?? null,
  };
}

export class DoctorProfileService {
  async getProfile(requestContext: WonFlowRequestContext) {
    const { context, profile } = await resolveProfile(requestContext);
    const branches = await database.branch.findMany({
      where: {
        tenantId: context.tenantId,
        organizationId: context.organizationId,
        archivedAt: null,
        status: "ACTIVE",
      },
      orderBy: [{ isMainBranch: "desc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
    return { profile: serializeProfile(profile), branches };
  }

  async updateProfile(requestContext: WonFlowRequestContext, input: Record<string, unknown>) {
    const { context, profile } = await resolveProfile(requestContext);
    const text = (key: string, max: number) => {
      const value = input[key];
      if (typeof value !== "string") return undefined;
      return value.trim().slice(0, max);
    };
    const displayName = text("displayName", 250);
    if (displayName !== undefined && displayName.length < 2) {
      throw new WonFlowApiError(400, "invalid-doctor-name", "Enter the doctor's full name.");
    }
    const branchId = text("primaryBranchId", 80);
    if (branchId) {
      const branch = await database.branch.findFirst({
        where: { id: branchId, tenantId: context.tenantId, organizationId: context.organizationId, archivedAt: null },
      });
      if (!branch) throw new WonFlowApiError(400, "invalid-doctor-branch", "Select a valid hospital location.");
    }
    const profileImageData = input.profileImageData;
    if (
      profileImageData !== undefined &&
      profileImageData !== null &&
      (typeof profileImageData !== "string" ||
        !/^data:image\/(jpeg|png|webp);base64,/.test(profileImageData) ||
        profileImageData.length > 1_500_000)
    ) {
      throw new WonFlowApiError(400, "invalid-profile-photo", "Upload a JPG, PNG or WebP image smaller than 1 MB.");
    }
    const duration = input.durationMinutes;
    if (duration !== undefined && (!Number.isInteger(duration) || Number(duration) < 5 || Number(duration) > 480)) {
      throw new WonFlowApiError(400, "invalid-consultation-duration", "Consultation duration must be between 5 and 480 minutes.");
    }
    // The signature signs clinical notes, so it is validated as strictly as the
    // profile photo. `null` clears it — that is how "Remove signature" works.
    const signatureImageData = input.signatureImageData;
    if (
      signatureImageData !== undefined &&
      signatureImageData !== null &&
      (typeof signatureImageData !== "string" ||
        !/^data:image\/(jpeg|png|webp);base64,/.test(signatureImageData) ||
        signatureImageData.length > 1_500_000)
    ) {
      throw new WonFlowApiError(400, "invalid-signature-image", "Upload a JPG, PNG or WebP signature smaller than 1 MB.");
    }

    await database.$transaction(async (tx) => {
      await tx.tenantMembership.update({
        where: { id: profile.staffProfile.membershipId },
        data: { displayName },
      });
      await tx.staffProfile.update({
        where: { id: profile.staffProfileId },
        data: { title: text("title", 120), branchId: branchId || undefined },
      });
      await tx.doctorProfile.update({
        where: { id: profile.id },
        data: {
          specialty: text("specialtyName", 200),
          registrationNumber: text("registrationNumber", 150),
          qualifications: text("qualifications", 2000),
          biography: text("biography", 5000),
          contactPhone: text("contactPhone", 80),
          durationMinutes: duration === undefined ? undefined : Number(duration),
          publiclyBookable: typeof input.publiclyBookable === "boolean" ? input.publiclyBookable : undefined,
          profileImageData: profileImageData === undefined ? undefined : profileImageData,
          signatureImageData: signatureImageData === undefined ? undefined : signatureImageData,
        },
      });
      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: context.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "doctor.profile.updated",
          entityType: "doctor-profile",
          entityId: profile.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
        },
      });
    });
    return (await this.getProfile(requestContext)).profile;
  }

  async createBranch(
    requestContext: WonFlowRequestContext,
    input: {
      name: string;
      code?: string;
      phone?: string;
      email?: string;
      address?: string | object;
      timezone?: string;
      currencyCode?: string;
      isMainBranch?: boolean;
    },
  ) {
    const { context, profile } = await resolveProfile(requestContext);
    const name = input.name?.trim();
    if (!name || name.length < 2) {
      throw new WonFlowApiError(400, "invalid-branch-name", "Enter a hospital branch name with at least 2 characters.");
    }

    let code = input.code?.trim().toUpperCase();
    if (!code) {
      const slug = name.replace(/[^a-zA-Z0-9]+/g, "-").toUpperCase().replace(/^-+|-+$/g, "").slice(0, 40);
      code = slug || `BRANCH-${Date.now().toString(36).toUpperCase()}`;
    }

    // Ensure unique code for tenant
    const existing = await database.branch.findFirst({
      where: { tenantId: context.tenantId, code },
    });
    if (existing) {
      code = `${code.slice(0, 60)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }

    const branch = await database.$transaction(async (tx) => {
      if (input.isMainBranch) {
        await tx.branch.updateMany({
          where: { tenantId: context.tenantId, organizationId: context.organizationId, isMainBranch: true },
          data: { isMainBranch: false },
        });
      }

      const entity = await tx.branch.create({
        data: {
          tenantId: context.tenantId,
          organizationId: context.organizationId,
          code,
          name,
          status: "ACTIVE",
          isMainBranch: input.isMainBranch ?? false,
          timezone: input.timezone || "Asia/Karachi",
          currencyCode: input.currencyCode || "PKR",
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          address: typeof input.address === "object" ? input.address : input.address ? { formatted: input.address } : undefined,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: entity.id,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "doctor.branch.created",
          entityType: "branch",
          entityId: entity.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
        },
      });

      return entity;
    });

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      timezone: branch.timezone,
      isMainBranch: branch.isMainBranch,
    };
  }
}

export const doctorProfileService = new DoctorProfileService();

