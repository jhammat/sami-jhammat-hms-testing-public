import { database } from "@wonflow/database";
import type { Prisma, ReferralDiscipline, ReferralPriority, ReferralStatus } from "@wonflow/database";
import { REFERRAL_SPECIALTIES, requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import type {
  AcceptReferralInput,
  CompleteReferralInput,
  CreateReferralInput,
  DeclineReferralInput,
  ListReferralsQuery,
} from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * The relations every referral card needs: who the patient is, who referred
 * them and who holds the referral. The status transitions return the same
 * shape as the caseload list, because the workspaces swap the returned row
 * straight into that list. Before this, accept/start/complete/cancel returned
 * a bare row, so the card lost its patient and fell back to "Patient c1a2745c"
 * and the patient workspace behind it read as "No patient selected".
 */
const REFERRAL_CARD_INCLUDE = {
  Patient: {
    select: {
      id: true,
      patientNumber: true,
      givenName: true,
      familyName: true,
      dateOfBirth: true,
      sex: true,
      phone: true,
    },
  },
  DoctorProfile: {
    select: {
      id: true,
      specialty: true,
      staffProfile: { select: { membership: { select: { displayName: true } } } },
    },
  },
  StaffProfile: {
    select: {
      id: true,
      title: true,
      membership: { select: { displayName: true } },
    },
  },
} satisfies Prisma.ClinicalReferralInclude;

export class ReferralService {
  async createReferral(
    requestContext: WonFlowRequestContext,
    input: CreateReferralInput,
  ) {
    const context = requireTenantContext(requestContext);

    // Doctor must have either referrals.create or careplans.manage
    const hasPermission =
      context.permissionCodes.includes("referrals.create") ||
      context.permissionCodes.includes("careplans.manage");

    if (!hasPermission) {
      throw new WonFlowApiError(
        403,
        "permission-denied",
        "You do not have permission to create clinical referrals.",
      );
    }

    if (!context.membershipId) {
      throw new WonFlowApiError(
        403,
        "membership-required",
        "Hospital staff membership is required.",
      );
    }

    if (!input.patientId?.trim()) {
      throw new WonFlowApiError(
        400,
        "missing-patient-id",
        "Patient ID is required.",
      );
    }

    const specialty = input.specialty?.trim().toUpperCase();
    if (!specialty || !REFERRAL_SPECIALTIES.includes(specialty as (typeof REFERRAL_SPECIALTIES)[number])) {
      throw new WonFlowApiError(
        400,
        "invalid-specialty",
        `Referral specialty must be one of ${REFERRAL_SPECIALTIES.join(", ")}.`,
      );
    }

    /*
     * DOCTOR referrals carry the OTHER discipline.
     *
     * The discipline drives the allied workspaces, and a handover to a
     * colleague in another department belongs to neither of them. Keeping the
     * two apart also keeps `getActiveReferredPatientIds` honest: it matches on
     * the exact specialty string, so referring a patient to a hepatologist
     * cannot widen what a physiotherapist can open.
     */
    const discipline: ReferralDiscipline =
      specialty === "PHYSIOTHERAPY"
        ? "PHYSIOTHERAPY"
        : specialty === "NUTRITION"
          ? "NUTRITION"
          : "OTHER";

    if (!input.reason?.trim()) {
      throw new WonFlowApiError(
        400,
        "missing-reason",
        "Referral reason is required.",
      );
    }

    const doctor = await database.doctorProfile.findFirst({
      where: {
        tenantId: context.tenantId,
        staffProfile: {
          membershipId: context.membershipId,
          status: "ACTIVE",
        },
      },
    });

    if (!doctor) {
      throw new WonFlowApiError(
        403,
        "doctor-profile-required",
        "A valid active doctor profile is required to issue referrals.",
      );
    }

    const patient = await database.patient.findFirst({
      where: {
        id: input.patientId.trim(),
        tenantId: context.tenantId,
        status: { not: "ARCHIVED" },
      },
    });

    if (!patient) {
      throw new WonFlowApiError(
        404,
        "patient-not-found",
        "The patient could not be found.",
      );
    }

    /*
     * A named assignee must be the kind of clinician the referral is for.
     *
     * Nothing checked this before, so a physiotherapy referral could be
     * assigned to a pharmacist — and then sat in a queue nobody watches,
     * looking assigned. A DOCTOR referral is required to name someone,
     * because "refer to another doctor" without saying which one is just an
     * unassigned note.
     */
    const expectedStaffTypes =
      specialty === "PHYSIOTHERAPY"
        ? ["PHYSIOTHERAPIST"]
        : specialty === "NUTRITION"
          ? ["NUTRITIONIST"]
          : ["DOCTOR"];

    let assignedToId: string | null = null;
    if (input.assignedToId?.trim()) {
      const staff = await database.staffProfile.findFirst({
        where: {
          id: input.assignedToId.trim(),
          tenantId: context.tenantId,
          status: "ACTIVE",
        },
        select: { id: true, staffType: true },
      });
      if (!staff) {
        throw new WonFlowApiError(
          400,
          "invalid-assignee",
          "The assigned staff member could not be found or is inactive.",
        );
      }
      if (!expectedStaffTypes.includes(staff.staffType)) {
        throw new WonFlowApiError(
          400,
          "assignee-wrong-discipline",
          `The person selected is not a ${expectedStaffTypes[0]?.toLowerCase()}. Choose a clinician from that discipline, or leave the referral unassigned.`,
        );
      }
      assignedToId = staff.id;
    } else if (specialty === "DOCTOR") {
      throw new WonFlowApiError(
        400,
        "assignee-required",
        "Choose the doctor this patient is being referred to.",
      );
    }

    // A hand-off from a care plan remembers the plan, so stopping or deleting
    // the plan can close the referrals it raised. The plan must be this
    // patient's, in this tenant - never a link to someone else's record.
    let carePlanId: string | null = null;
    if (input.carePlanId?.trim()) {
      const plan = await database.carePlan.findFirst({
        where: { id: input.carePlanId.trim(), tenantId: context.tenantId, patientId: patient.id },
        select: { id: true },
      });
      if (!plan) {
        throw new WonFlowApiError(400, "invalid-care-plan", "That care plan does not belong to this patient.");
      }
      carePlanId = plan.id;
    }

    const validDays = Math.max(1, Math.min(365, input.validDays ?? 30));
    const validFrom = new Date();
    const validUntil = new Date(validFrom.getTime() + validDays * 86_400_000);

    return database.$transaction(async (tx) => {
      const referral = await tx.clinicalReferral.create({
        data: {
          tenantId: context.tenantId,
          patientId: patient.id,
          referringDoctorId: doctor.id,
          specialty,
          discipline,
          assignedToId,
          status: "PENDING",
          priority: (input.priority ?? "ROUTINE") as ReferralPriority,
          reason: input.reason.trim(),
          goal: input.goal?.trim() || null,
          clinicalSummary: input.clinicalSummary?.trim() || null,
          surgicalSummary: input.surgicalSummary?.trim() || null,
          precautions: input.precautions?.trim() || null,
          carePlanId,
          validFrom,
          validUntil,
        },
        include: {
          Patient: {
            select: {
              id: true,
              patientNumber: true,
              givenName: true,
              familyName: true,
              dateOfBirth: true,
              sex: true,
              phone: true,
            },
          },
          DoctorProfile: {
            select: {
              id: true,
              specialty: true,
              staffProfile: {
                select: {
                  membership: {
                    select: {
                      displayName: true,
                    },
                  },
                },
              },
            },
          },
          StaffProfile: {
            select: {
              id: true,
              title: true,
              membership: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: context.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "clinical.referral.created",
          entityType: "clinical-referral",
          entityId: referral.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            patientId: patient.id,
            specialty,
            discipline,
            priority: referral.priority,
            validUntil: validUntil.toISOString(),
          },
        },
      });

      return referral;
    });
  }

  async acceptReferral(
    requestContext: WonFlowRequestContext,
    id: string,
    input: Partial<AcceptReferralInput> = {},
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    const referral = await database.clinicalReferral.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!referral) {
      throw new WonFlowApiError(
        404,
        "referral-not-found",
        "The referral could not be found.",
      );
    }

    if (referral.status !== "PENDING") {
      throw new WonFlowApiError(
        409,
        "referral-not-pending",
        `Only pending referrals can be accepted. Current status is ${referral.status}.`,
      );
    }

    // Determine staff profile of the acceptor if assignedToId is null
    let assignedToId = referral.assignedToId;
    if (!assignedToId && context.membershipId) {
      const currentStaff = await database.staffProfile.findFirst({
        where: {
          tenantId: context.tenantId,
          membershipId: context.membershipId,
          status: "ACTIVE",
        },
      });
      if (currentStaff) {
        assignedToId = currentStaff.id;
      }
    }

    return database.$transaction(async (tx) => {
      const updated = await tx.clinicalReferral.update({
        where: { id: referral.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          assignedToId,
        },
        include: REFERRAL_CARD_INCLUDE,
      });

      // Grant dynamic patient access for this referral
      if (context.identityId) {
        const existingAccess = await tx.patientAccess.findFirst({
          where: {
            patientId: referral.patientId,
            identityId: context.identityId,
          },
        });

        if (existingAccess) {
          await tx.patientAccess.update({
            where: { id: existingAccess.id },
            data: {
              isActive: true,
              referralId: referral.id,
              accessReason: `Referral ${referral.specialty} accepted`,
            },
          });
        } else {
          await tx.patientAccess.create({
            data: {
              patientId: referral.patientId,
              identityId: context.identityId,
              relationship: "care-team-allied",
              isActive: true,
              referralId: referral.id,
              accessReason: `Referral ${referral.specialty} accepted`,
              permissions: ["observations.write", "careplan.complete"],
            },
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: context.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "clinical.referral.accepted",
          entityType: "clinical-referral",
          entityId: referral.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            notes: input.notes?.trim() || null,
          },
        },
      });

      return this.toContractShape(updated);
    });
  }

  async startReferral(requestContext: WonFlowRequestContext, id: string) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    const referral = await database.clinicalReferral.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!referral) {
      throw new WonFlowApiError(
        404,
        "referral-not-found",
        "The referral could not be found.",
      );
    }

    if (!["PENDING", "ACCEPTED"].includes(referral.status)) {
      throw new WonFlowApiError(
        409,
        "referral-cannot-start",
        `Referral in status ${referral.status} cannot be started.`,
      );
    }

    return database.$transaction(async (tx) => {
      const updated = await tx.clinicalReferral.update({
        where: { id: referral.id },
        data: { status: "IN_PROGRESS" },
        include: REFERRAL_CARD_INCLUDE,
      });

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: context.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "clinical.referral.started",
          entityType: "clinical-referral",
          entityId: referral.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
        },
      });

      return this.toContractShape(updated);
    });
  }

  async completeReferral(
    requestContext: WonFlowRequestContext,
    id: string,
    input: Partial<CompleteReferralInput> = {},
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    const referral = await database.clinicalReferral.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!referral) {
      throw new WonFlowApiError(
        404,
        "referral-not-found",
        "The referral could not be found.",
      );
    }

    if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(referral.status)) {
      throw new WonFlowApiError(
        409,
        "referral-already-terminal",
        `Referral is already ${referral.status.toLowerCase()}.`,
      );
    }

    return database.$transaction(async (tx) => {
      const updated = await tx.clinicalReferral.update({
        where: { id: referral.id },
        data: {
          status: "COMPLETED",
          outcomeNotes: input.outcomeNotes?.trim() || null,
          completedAt: new Date(),
        },
        include: REFERRAL_CARD_INCLUDE,
      });

      // Terminate dynamic patient access granted by this referral
      await tx.patientAccess.updateMany({
        where: {
          referralId: referral.id,
          patientId: referral.patientId,
        },
        data: {
          isActive: false,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: context.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "clinical.referral.completed",
          entityType: "clinical-referral",
          entityId: referral.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            outcomeNotes: input.outcomeNotes?.trim() || null,
          },
        },
      });

      return this.toContractShape(updated);
    });
  }

  async cancelReferral(
    requestContext: WonFlowRequestContext,
    id: string,
    reasonOrInput?: string | DeclineReferralInput,
  ) {
    const context = requireTenantContext(requestContext);
    const reason =
      typeof reasonOrInput === "string"
        ? reasonOrInput
        : reasonOrInput?.reason;

    const referral = await database.clinicalReferral.findFirst({
      where: { id, tenantId: context.tenantId },
    });


    if (!referral) {
      throw new WonFlowApiError(
        404,
        "referral-not-found",
        "The referral could not be found.",
      );
    }

    if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(referral.status)) {
      throw new WonFlowApiError(
        409,
        "referral-already-terminal",
        `Referral is already ${referral.status.toLowerCase()}.`,
      );
    }

    return database.$transaction(async (tx) => {
      const updated = await tx.clinicalReferral.update({
        where: { id: referral.id },
        data: {
          status: "CANCELLED",
          outcomeNotes: reason ? `Declined/Cancelled: ${reason}` : undefined,
        },
        include: REFERRAL_CARD_INCLUDE,
      });

      // Terminate dynamic patient access
      await tx.patientAccess.updateMany({
        where: {
          referralId: referral.id,
          patientId: referral.patientId,
        },
        data: {
          isActive: false,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: context.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "clinical.referral.cancelled",
          entityType: "clinical-referral",
          entityId: referral.id,
          severity: "INFORMATION",
          reason: reason?.trim() || null,
          sourceApplication: context.sourceApplication,
        },
      });

      return this.toContractShape(updated);
    });
  }

  async getReferral(requestContext: WonFlowRequestContext, id: string) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    const referral = await database.clinicalReferral.findFirst({
      where: { id, tenantId: context.tenantId },
      include: {
        Patient: {
          select: {
            id: true,
            patientNumber: true,
            givenName: true,
            familyName: true,
            dateOfBirth: true,
            sex: true,
            phone: true,
          },
        },
        DoctorProfile: {
          select: {
            id: true,
            specialty: true,
            staffProfile: {
              select: {
                membership: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
        StaffProfile: {
          select: {
            id: true,
            title: true,
            membership: {
              select: {
                displayName: true,
              },
            },
          },
        },
        TherapyAssessment: {
          orderBy: { assessedAt: "desc" },
          take: 10,
        },
        TherapySession: {
          orderBy: { sessionDate: "desc" },
          take: 10,
        },
        NutritionAssessment: {
          orderBy: { assessedAt: "desc" },
          take: 10,
        },
        NutritionPlan: {
          include: {
            NutritionPlanItem: {
              orderBy: { displayOrder: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!referral) {
      throw new WonFlowApiError(
        404,
        "referral-not-found",
        "The referral could not be found.",
      );
    }

    return referral;
  }

  async listReferrals(
    requestContext: WonFlowRequestContext,
    options: ListReferralsQuery = {},
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.min(
      Math.max(Math.floor(options.pageSize ?? 25), 1),
      100,
    );

    const where: Prisma.ClinicalReferralWhereInput = {
      tenantId: context.tenantId,
    };

    if (options.patientId) where.patientId = options.patientId;
    if (options.specialty) where.specialty = options.specialty.toUpperCase();
    if (options.discipline) where.discipline = options.discipline as ReferralDiscipline;
    if (options.assignedToId) where.assignedToId = options.assignedToId;
    if (options.status) where.status = options.status as ReferralStatus;

    const [referrals, total] = await Promise.all([
      database.clinicalReferral.findMany({
        where,
        include: {
          Patient: {
            select: {
              id: true,
              patientNumber: true,
              givenName: true,
              familyName: true,
              dateOfBirth: true,
              sex: true,
              phone: true,
            },
          },
          DoctorProfile: {
            select: {
              id: true,
              specialty: true,
              staffProfile: {
                select: {
                  membership: {
                    select: {
                      displayName: true,
                    },
                  },
                },
              },
            },
          },
          StaffProfile: {
            select: {
              id: true,
              title: true,
              membership: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      database.clinicalReferral.count({ where }),
    ]);

    return {
      referrals: referrals.map((referral) => this.toContractShape(referral)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Renames the Prisma relation keys to the ones the contract declares.
   *
   * Prisma returns relations under their MODEL names -- `Patient`,
   * `DoctorProfile`, `StaffProfile` -- but `ClinicalReferral` in
   * @wonflow/contracts declares `patient`, `referringDoctor` and
   * `assignedTo`, and that is what every screen reads. Nothing bridged the
   * two, so `referral.patient` was always undefined and both allied
   * referral inboxes silently fell back to showing "Patient #a022e3"
   * instead of a name. Types did not catch it because the service returned
   * a raw Prisma row rather than the declared contract type.
   */
  private toContractShape<T extends Record<string, unknown>>(row: T) {
    const { Patient, DoctorProfile, StaffProfile, ...rest } = row as T & {
      Patient?: unknown;
      DoctorProfile?: unknown;
      StaffProfile?: unknown;
    };

    return {
      ...rest,
      ...(Patient ? { patient: Patient } : {}),
      ...(DoctorProfile ? { referringDoctor: DoctorProfile } : {}),
      assignedTo: StaffProfile ?? null,
    };
  }

  /**
   * Refuses access to a patient the caller holds no live referral for.
   *
   * The allied services used to authorize on `referrals.read` alone -- a
   * ROLE-level permission -- and then trust whatever `patientId` arrived in
   * the request. Any physiotherapist could therefore read or write therapy
   * records for any patient in the hospital by passing an id, which is
   * exactly the "access by job title" the platform rules forbid. This is the
   * per-patient check that was missing: an active, in-date referral in the
   * caller's own specialty, optionally narrowed to the therapist it was
   * assigned to.
   */
  async assertReferredPatient(
    requestContext: WonFlowRequestContext,
    specialty: string,
    patientId: string,
    staffProfileId?: string | null,
  ): Promise<void> {
    const context = requireTenantContext(requestContext);

    const permitted = await this.getActiveReferredPatientIds(
      context.tenantId,
      specialty,
      staffProfileId ?? null,
    );

    if (permitted.includes(patientId)) return;

    throw new WonFlowApiError(
      403,
      "referral-required",
      "You do not have a current referral for this patient, so their record is not open to you. Ask the referring surgeon to raise one, or check whether the existing referral has expired.",
    );
  }

  /**
   * Returns active, unexpired patient IDs referred to the given specialty and/or staff profile.
   */
  async getActiveReferredPatientIds(
    tenantId: string,
    specialty: string,
    staffProfileId?: string | null,
  ): Promise<string[]> {
    const now = new Date();
    const where: Prisma.ClinicalReferralWhereInput = {
      tenantId,
      specialty: specialty.toUpperCase(),
      status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gte: now } }],
    };

    if (staffProfileId) {
      where.AND = [
        {
          OR: [{ assignedToId: null }, { assignedToId: staffProfileId }],
        },
      ];
    }

    const rows = await database.clinicalReferral.findMany({
      where,
      select: { patientId: true },
    });

    return [...new Set(rows.map((r) => r.patientId))];
  }
}

export const referralService = new ReferralService();
