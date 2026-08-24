import { database } from "@wonflow/database";
import type { Prisma, ExerciseCategory, IndependenceLevel, TherapyAttendanceStatus } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import type {
  AssignTherapyExerciseInput,
  CreateExerciseDefinitionInput,
  CreateTherapyAssessmentInput,
  LogTherapySessionInput,
} from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

export class PhysiotherapyService {
  async createAssessment(
    requestContext: WonFlowRequestContext,
    input: CreateTherapyAssessmentInput,
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    if (!input.patientId?.trim()) {
      throw new WonFlowApiError(400, "missing-patient-id", "Patient ID is required.");
    }

    if (input.mobilityScore < 0 || input.mobilityScore > 10) {
      throw new WonFlowApiError(400, "invalid-mobility-score", "Mobility score must be between 0 and 10.");
    }

    if (input.painScore < 0 || input.painScore > 10) {
      throw new WonFlowApiError(400, "invalid-pain-score", "Pain score must be between 0 and 10.");
    }

    const staff = await database.staffProfile.findFirst({
      where: {
        tenantId: context.tenantId,
        membershipId: context.membershipId ?? undefined,
        status: "ACTIVE",
      },
    });


    if (!staff) {
      throw new WonFlowApiError(
        403,
        "staff-profile-required",
        "An active staff profile is required to document therapy assessments.",
      );
    }

    const patient = await database.patient.findFirst({
      where: { id: input.patientId, tenantId: context.tenantId },
    });

    if (!patient) {
      throw new WonFlowApiError(404, "patient-not-found", "Patient not found.");
    }

    return database.$transaction(async (tx) => {
      const assessment = await tx.therapyAssessment.create({
        data: {
          tenantId: context.tenantId,
          patientId: patient.id,
          assessedByStaffId: staff.id,
          referralId: input.referralId || null,
          mobilityScore: input.mobilityScore,
          painScore: input.painScore,
          respiratoryFunction: input.respiratoryFunction?.trim() || null,
          independenceLevel: input.independenceLevel as IndependenceLevel,
          surgicalRestrictions: input.surgicalRestrictions?.trim() || null,
          baselineNotes: input.baselineNotes?.trim() || null,
          goals: input.goals?.trim() || null,
        },
        include: {
          StaffProfile: {
            select: {
              id: true,
              staffType: true,
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
          action: "clinical.therapy_assessment.created",
          entityType: "therapy-assessment",
          entityId: assessment.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            patientId: patient.id,
            mobilityScore: input.mobilityScore,
            independenceLevel: input.independenceLevel,
          },
        },
      });

      return assessment;
    });
  }

  async listAssessments(requestContext: WonFlowRequestContext, patientId: string) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    return database.therapyAssessment.findMany({
      where: {
        tenantId: context.tenantId,
        patientId,
      },
      include: {
        StaffProfile: {
          select: {
            id: true,
            staffType: true,
            title: true,
            membership: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { assessedAt: "desc" },
    });
  }

  async createExerciseDefinition(
    requestContext: WonFlowRequestContext,
    input: CreateExerciseDefinitionInput,
  ) {
    const context = requireTenantContext(requestContext);

    if (!input.name?.trim()) {
      throw new WonFlowApiError(400, "missing-name", "Exercise name is required.");
    }
    if (!input.instruction?.trim()) {
      throw new WonFlowApiError(400, "missing-instruction", "Exercise instructions are required.");
    }

    return database.exerciseDefinition.create({
      data: {
        tenantId: context.tenantId,
        name: input.name.trim(),
        category: input.category as ExerciseCategory,
        description: input.description?.trim() || null,
        instruction: input.instruction.trim(),
        demonstrationUrl: input.demonstrationUrl?.trim() || null,
        defaultRepetitions: input.defaultRepetitions ?? null,
        defaultSets: input.defaultSets ?? null,
        defaultDurationSeconds: input.defaultDurationSeconds ?? null,
        precautions: input.precautions?.trim() || null,
        isActive: true,
      },
    });
  }

  async listExerciseDefinitions(
    requestContext: WonFlowRequestContext,
    category?: string,
  ) {
    const context = requireTenantContext(requestContext);

    const where: Prisma.ExerciseDefinitionWhereInput = {
      tenantId: context.tenantId,
      isActive: true,
    };

    if (category) {
      where.category = category as ExerciseCategory;
    }

    return database.exerciseDefinition.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async logSession(
    requestContext: WonFlowRequestContext,
    input: LogTherapySessionInput,
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    if (!input.patientId?.trim()) {
      throw new WonFlowApiError(400, "missing-patient-id", "Patient ID is required.");
    }

    const staff = await database.staffProfile.findFirst({
      where: {
        tenantId: context.tenantId,
        membershipId: context.membershipId ?? undefined,
        status: "ACTIVE",
      },
    });


    if (!staff) {
      throw new WonFlowApiError(
        403,
        "staff-profile-required",
        "An active staff profile is required to log therapy sessions.",
      );
    }

    return database.$transaction(async (tx) => {
      const session = await tx.therapySession.create({
        data: {
          tenantId: context.tenantId,
          patientId: input.patientId,
          conductedByStaffId: staff.id,
          referralId: input.referralId || null,
          sessionDate: input.sessionDate ? new Date(input.sessionDate) : new Date(),
          attendanceStatus: input.attendanceStatus as TherapyAttendanceStatus,
          painBefore: input.painBefore ?? null,
          painAfter: input.painAfter ?? null,
          spirometryAchievedMl: input.spirometryAchievedMl ?? null,
          stepsAchieved: input.stepsAchieved ?? null,
          progressNotes: input.progressNotes?.trim() || null,
          goalsMet: input.goalsMet?.trim() || null,
          nextSessionDate: input.nextSessionDate ? new Date(input.nextSessionDate) : null,
        },
        include: {
          StaffProfile: {
            select: {
              id: true,
              staffType: true,
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
          action: "clinical.therapy_session.logged",
          entityType: "therapy-session",
          entityId: session.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            patientId: input.patientId,
            status: input.attendanceStatus,
            stepsAchieved: input.stepsAchieved,
          },
        },
      });

      return session;
    });
  }

  async listSessions(requestContext: WonFlowRequestContext, patientId: string) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    return database.therapySession.findMany({
      where: {
        tenantId: context.tenantId,
        patientId,
      },
      include: {
        StaffProfile: {
          select: {
            id: true,
            staffType: true,
            title: true,
            membership: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { sessionDate: "desc" },
    });
  }

  async assignExercise(
    requestContext: WonFlowRequestContext,
    input: AssignTherapyExerciseInput,
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    if (!input.patientId?.trim()) {
      throw new WonFlowApiError(400, "missing-patient-id", "Patient ID is required.");
    }
    if (!input.exerciseName?.trim()) {
      throw new WonFlowApiError(400, "missing-exercise-name", "Exercise name is required.");
    }

    // Locate active care plan for the patient
    let carePlan = await database.carePlan.findFirst({
      where: {
        tenantId: context.tenantId,
        patientId: input.patientId,
        status: "ACTIVE",
      },
    });

    if (!carePlan && input.carePlanId) {
      carePlan = await database.carePlan.findFirst({
        where: { id: input.carePlanId, tenantId: context.tenantId },
      });
    }

    if (!carePlan) {
      throw new WonFlowApiError(
        404,
        "care-plan-not-found",
        "No active care plan found for this patient to assign the exercise to.",
      );
    }

    const scheduledDate = new Date(input.scheduledFor);
    const dayNumber = Math.max(
      1,
      Math.floor((scheduledDate.getTime() - new Date(carePlan.startDate).getTime()) / 86_400_000) + 1,
    );

    const task = await database.carePlanTask.create({
      data: {
        tenantId: context.tenantId,
        carePlanId: carePlan.id,
        taskType: "EXERCISE",
        stageNumber: carePlan.currentStage,
        dayNumber,
        scheduledFor: scheduledDate,
        dueBy: new Date(scheduledDate.getTime() + 86_400_000),
        title: `Physiotherapy: ${input.exerciseName}`,
        instructions: input.instructions,
        status: "PENDING",
        resultData: {
          category: input.category,
          repetitions: input.repetitions ?? null,
          sets: input.sets ?? null,
          referralId: input.referralId ?? null,
        },
      },
    });

    return task;
  }

  /**
   * Surgical Escalation: Checks if the patient has missed > 2 consecutive exercise tasks post-op.
   * Auto-generates a HIGH severity CarePlanAlert for the surgical care team.
   */
  async checkExerciseAdherenceAlerts(
    requestContext: WonFlowRequestContext,
    patientId: string,
  ) {
    const context = requireTenantContext(requestContext);

    const activeCarePlan = await database.carePlan.findFirst({
      where: {
        tenantId: context.tenantId,
        patientId,
        status: "ACTIVE",
      },
    });

    if (!activeCarePlan) return null;

    const missedExerciseTasks = await database.carePlanTask.findMany({
      where: {
        tenantId: context.tenantId,
        carePlanId: activeCarePlan.id,
        taskType: "EXERCISE",
        status: { in: ["MISSED", "SKIPPED"] },
      },
      orderBy: { scheduledFor: "desc" },
      take: 3,
    });

    if (missedExerciseTasks.length >= 2) {
      // Check if an open alert already exists
      const existingAlert = await database.carePlanAlert.findFirst({
        where: {
          tenantId: context.tenantId,
          carePlanId: activeCarePlan.id,
          status: "OPEN",
          title: { contains: "Exercise Non-Adherence" },
        },
      });

      if (!existingAlert) {
        return database.carePlanAlert.create({
          data: {
            tenantId: context.tenantId,
            carePlanId: activeCarePlan.id,
            patientId,
            severity: "HIGH",
            status: "OPEN",
            title: "Surgical Escalation: Exercise Non-Adherence (>2 Days)",
            message: `Patient has missed or skipped ${missedExerciseTasks.length} consecutive rehabilitation/mobility tasks. Early post-operative mobilization is compromised.`,
          },
        });
      }
    }

    return null;
  }
}

export const physiotherapyService = new PhysiotherapyService();
