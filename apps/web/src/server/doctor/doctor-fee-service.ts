import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext, WonFlowTenantRequestContext } from "@wonflow/contracts";

import { WonFlowApiError } from "@/server/http/route-handler";

async function resolveDoctor(contextInput: WonFlowRequestContext) {
  const context = requireTenantContext(contextInput);
  if (!context.membershipId) {
    throw new WonFlowApiError(403, "doctor-membership-required", "A doctor membership is required.");
  }
  const doctor = await database.doctorProfile.findFirst({
    where: {
      tenantId: context.tenantId,
      staffProfile: {
        membershipId: context.membershipId,
        status: "ACTIVE",
        membership: { organizationId: context.organizationId, archivedAt: null },
      },
    },
    include: { staffProfile: { include: { membership: true } } },
  });
  if (!doctor) {
    throw new WonFlowApiError(403, "doctor-profile-required", "A valid doctor profile is required.");
  }
  const organization = await database.organization.findFirst({
    where: { id: context.organizationId, tenantId: context.tenantId, archivedAt: null },
    select: { id: true, displayName: true, doctorFeeAuthority: true },
  });
  if (!organization) {
    throw new WonFlowApiError(404, "organization-not-found", "The hospital organization could not be found.");
  }
  return { context, doctor, organization };
}

async function audit(
  context: WonFlowTenantRequestContext,
  action: string,
  serviceId: string,
) {
  await database.auditEvent.create({
    data: {
      tenantId: context.tenantId,
      branchId: context.branchId,
      actorMembershipId: context.membershipId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      action,
      entityType: "service",
      entityId: serviceId,
      severity: "INFORMATION",
      sourceApplication: context.sourceApplication,
    },
  });
}

export class DoctorFeeService {
  async getServices(requestContext: WonFlowRequestContext) {
    const { context, doctor, organization } = await resolveDoctor(requestContext);
    const [branches, services] = await Promise.all([
      database.branch.findMany({
        where: {
          tenantId: context.tenantId,
          organizationId: context.organizationId,
          archivedAt: null,
          status: "ACTIVE",
        },
        orderBy: [{ isMainBranch: "desc" }, { name: "asc" }],
        select: { id: true, name: true, code: true, currencyCode: true },
      }),
      database.serviceDefinition.findMany({
        where: { tenantId: context.tenantId, doctorId: doctor.id, isActive: true },
        include: { branch: true, feeHistory: { orderBy: { changedAt: "desc" }, take: 10 } },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
    ]);

    return {
      authority: organization.doctorFeeAuthority,
      organization: { id: organization.id, name: organization.displayName },
      doctor: {
        id: doctor.id,
        displayName: doctor.staffProfile.membership.displayName,
        specialty: doctor.specialty,
      },
      branches,
      services,
    };
  }

  async createService(
    requestContext: WonFlowRequestContext,
    input: {
      branchId?: string;
      code: string;
      name: string;
      description?: string;
      durationMinutes: number;
      priceMinorUnits: number;
      publiclyBookable?: boolean;
      consultationModes?: ("IN_PERSON" | "ONLINE")[];
    },
  ) {
    const { context, doctor, organization } = await resolveDoctor(requestContext);
    if (organization.doctorFeeAuthority === "HOSPITAL") {
      throw new WonFlowApiError(403, "hospital-controls-fee", "This hospital manages doctor consultation services and fees.");
    }
    if (!input.name?.trim() || !input.code?.trim()) {
      throw new WonFlowApiError(400, "service-details-required", "Enter a service name and code.");
    }
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 480) {
      throw new WonFlowApiError(400, "invalid-service-duration", "Duration must be between 5 and 480 minutes.");
    }
    if (!Number.isInteger(input.priceMinorUnits) || input.priceMinorUnits < 0) {
      throw new WonFlowApiError(400, "invalid-service-price", "Enter a valid consultation fee.");
    }
    const branch = input.branchId
      ? await database.branch.findFirst({
          where: {
            id: input.branchId,
            tenantId: context.tenantId,
            organizationId: context.organizationId,
            archivedAt: null,
            status: "ACTIVE",
          },
        })
      : null;
    if (input.branchId && !branch) {
      throw new WonFlowApiError(400, "invalid-service-branch", "The selected branch is unavailable.");
    }
    const currencyCode = branch?.currencyCode ?? context.currencyCode;

    // Approval-required mode: submit a fee request instead of creating the service directly.
    if (organization.doctorFeeAuthority === "APPROVAL_REQUIRED") {
      const feeRequest = await database.doctorFeeRequest.create({
        data: {
          tenantId: context.tenantId,
          doctorId: doctor.id,
          requestedByMembershipId: context.membershipId!,
          requestType: "CREATE_SERVICE",
          proposedName: input.name.trim(),
          proposedDescription: input.description?.trim() || null,
          proposedDurationMinutes: input.durationMinutes,
          proposedPriceMinorUnits: input.priceMinorUnits,
          proposedCurrencyCode: currencyCode,
          proposedBranchId: branch?.id ?? null,
          proposedPubliclyBookable: input.publiclyBookable ?? false,
          proposedConsultationModes: input.consultationModes?.length ? input.consultationModes : ["IN_PERSON"],
        },
        include: { proposedBranch: true, doctor: { include: { staffProfile: { include: { membership: true } } } } },
      });
      await audit(context, "doctor.consultation-service.fee-request-created", feeRequest.id);
      return { feeRequest, pendingApproval: true };
    }

    // Doctor-managed mode: create the service directly.
    const entity = await database.$transaction(async (tx) => {
      const created = await tx.serviceDefinition.create({
        data: {
          tenantId: context.tenantId,
          branchId: branch?.id ?? null,
          doctorId: doctor.id,
          code: `DR-${doctor.id.slice(0, 8)}-${input.code.trim()}`.toUpperCase(),
          name: input.name.trim(),
          category: "CONSULTATION",
          description: input.description?.trim() || null,
          durationMinutes: input.durationMinutes,
          priceMinorUnits: input.priceMinorUnits,
          currencyCode,
          publiclyBookable: input.publiclyBookable ?? false,
          consultationModes: input.consultationModes?.length ? input.consultationModes : ["IN_PERSON"],
          handlerMembershipId: doctor.staffProfile.membershipId,
          billingOwner: "DOCTOR",
        },
        include: { branch: true },
      });
      await tx.serviceFeeHistory.create({ data: { tenantId: context.tenantId, serviceId: created.id, priceMinorUnits: input.priceMinorUnits, currencyCode, changedByMembershipId: context.membershipId! } });
      return created;
    });
    await audit(context, "doctor.consultation-service.created", entity.id);
    return entity;
  }

  async updateService(
    requestContext: WonFlowRequestContext,
    serviceId: string,
    input: {
      name?: string;
      description?: string;
      durationMinutes?: number;
      priceMinorUnits?: number;
      publiclyBookable?: boolean;
      isActive?: boolean;
      consultationModes?: ("IN_PERSON" | "ONLINE")[];
    },
  ) {
    const { context, doctor, organization } = await resolveDoctor(requestContext);
    if (organization.doctorFeeAuthority === "HOSPITAL") {
      throw new WonFlowApiError(403, "hospital-controls-fee", "This hospital manages doctor consultation services and fees.");
    }
    const existing = await database.serviceDefinition.findFirst({
      where: { id: serviceId, tenantId: context.tenantId, doctorId: doctor.id },
    });
    if (!existing) {
      throw new WonFlowApiError(404, "service-not-found", "The consultation service could not be found.");
    }
    if (input.name !== undefined && !input.name.trim()) {
      throw new WonFlowApiError(400, "invalid-service-name", "Enter a consultation service name.");
    }
    if (input.durationMinutes !== undefined && (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 480)) {
      throw new WonFlowApiError(400, "invalid-service-duration", "Duration must be between 5 and 480 minutes.");
    }
    if (input.priceMinorUnits !== undefined && (!Number.isInteger(input.priceMinorUnits) || input.priceMinorUnits < 0)) {
      throw new WonFlowApiError(400, "invalid-service-price", "Enter a valid consultation fee.");
    }
    if (input.consultationModes !== undefined && input.consultationModes.length === 0) {
      throw new WonFlowApiError(400, "invalid-service-modes", "Select at least one consultation mode.");
    }
    if (input.priceMinorUnits !== undefined && existing.billingOwner !== "DOCTOR") {
      throw new WonFlowApiError(403, "hospital-controls-fee", existing.billingOwner === "DEPARTMENT" ? "This fee is controlled by the department that owns the service." : "This fee is controlled by hospital administration.");
    }

    // Approval-required mode: fee changes go through the approval workflow.
    if (organization.doctorFeeAuthority === "APPROVAL_REQUIRED" && input.priceMinorUnits !== undefined && input.priceMinorUnits !== existing.priceMinorUnits) {
      const feeRequest = await database.doctorFeeRequest.create({
        data: {
          tenantId: context.tenantId,
          serviceId: existing.id,
          doctorId: doctor.id,
          requestedByMembershipId: context.membershipId!,
          requestType: "UPDATE_FEE",
          proposedName: existing.name,
          proposedPriceMinorUnits: input.priceMinorUnits,
          proposedCurrencyCode: existing.currencyCode,
        },
        include: { service: { include: { branch: true } }, doctor: { include: { staffProfile: { include: { membership: true } } } } },
      });
      await audit(context, "doctor.consultation-service.fee-request-created", feeRequest.id);

      // Still apply non-fee changes directly (name, description, duration, etc.)
      const nonFeeInput = { ...input };
      delete nonFeeInput.priceMinorUnits;
      if (Object.keys(nonFeeInput).length > 0) {
        await database.serviceDefinition.update({
          where: { id: existing.id, tenantId: context.tenantId },
          data: {
            ...nonFeeInput,
            name: nonFeeInput.name?.trim(),
            description: nonFeeInput.description === undefined ? undefined : nonFeeInput.description.trim() || null,
          },
        });
      }
      return { feeRequest, pendingApproval: true };
    }

    // Direct mode: apply all changes immediately.
    const entity = await database.$transaction(async (tx) => {
      const updated = await tx.serviceDefinition.update({
        where: { id: existing.id, tenantId: context.tenantId },
        data: {
          ...input,
          name: input.name?.trim(),
          description: input.description === undefined ? undefined : input.description.trim() || null,
        },
        include: { branch: true },
      });
      if (input.priceMinorUnits !== undefined && input.priceMinorUnits !== existing.priceMinorUnits) {
        await tx.serviceFeeHistory.create({ data: { tenantId: context.tenantId, serviceId: updated.id, priceMinorUnits: input.priceMinorUnits, currencyCode: updated.currencyCode, changedByMembershipId: context.membershipId! } });
      }
      return updated;
    });
    await audit(context, "doctor.consultation-service.updated", entity.id);
    return entity;
  }

  async deleteService(requestContext: WonFlowRequestContext, serviceId: string) {
    const { context, doctor, organization } = await resolveDoctor(requestContext);
    if (organization.doctorFeeAuthority === "HOSPITAL") {
      throw new WonFlowApiError(403, "hospital-controls-fee", "This hospital manages doctor consultation services and fees.");
    }
    const existing = await database.serviceDefinition.findFirst({
      where: { id: serviceId, tenantId: context.tenantId, doctorId: doctor.id, isActive: true },
    });
    if (!existing) throw new WonFlowApiError(404, "service-not-found", "The service could not be found.");
    const entity = await database.serviceDefinition.update({
      where: { id: existing.id, tenantId: context.tenantId },
      data: { isActive: false, publiclyBookable: false },
    });
    await audit(context, "doctor.consultation-service.deleted", entity.id);
    return entity;
  }

  /** Returns the doctor's own fee requests (pending, approved, and declined). */
  async getMyFeeRequests(requestContext: WonFlowRequestContext) {
    const { context, doctor } = await resolveDoctor(requestContext);
    return database.doctorFeeRequest.findMany({
      where: { tenantId: context.tenantId, doctorId: doctor.id },
      include: {
        service: { select: { id: true, name: true, code: true } },
        proposedBranch: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}

export const doctorFeeService = new DoctorFeeService();
