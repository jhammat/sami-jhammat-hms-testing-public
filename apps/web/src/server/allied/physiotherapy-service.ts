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
import { carePlanService } from "@/server/clinical/care-plan-service";
import { referralService } from "@/server/clinical/referral-service";
import { WonFlowApiError } from "@/server/http/route-handler";
import { notifyCareTeamOfEntry } from "@/server/clinical/care-team-notifications";

export interface PublishPrecautionOrdersInput {
  patientId: string;
  referralId?: string;
  weightBearing?: string;
  precautions?: string[];
  notes?: string;
  dischargeMobilityCleared?: boolean;
}

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

    // Per-patient authorization, AFTER the shape checks above.
    //
    // Order matters here. `referrals.read` only says this account is the kind
    // of clinician that reads referrals; it says nothing about THIS patient,
    // and without the line below a therapist could reach any record in the
    // hospital by passing its id. But it runs after the input validation, not
    // before: a request with no patientId at all is malformed rather than
    // forbidden, and answering "you have no referral for this patient" to an
    // empty id tells the caller nothing useful about what they got wrong.
    await referralService.assertReferredPatient(requestContext, "PHYSIOTHERAPY", input.patientId);

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

    const committed = await database.$transaction(async (tx) => {
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

    // After commit, and never able to fail the clinical write: the rest of
    // the care team hears that this entry now exists.
    await notifyCareTeamOfEntry({
      tenantId: context.tenantId,
      patientId: committed.patientId,
      actorMembershipId: context.membershipId ?? null,
      entryType: "THERAPY_ASSESSMENT",
      recordId: committed.id,
      title: "Physiotherapy assessment recorded",
      discipline: "PHYSIOTHERAPY",
    });

    return committed;
  }

  async listAssessments(requestContext: WonFlowRequestContext, patientId: string) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    // Per-patient authorization, AFTER the shape checks above.
    //
    // Order matters here. `referrals.read` only says this account is the kind
    // of clinician that reads referrals; it says nothing about THIS patient,
    // and without the line below a therapist could reach any record in the
    // hospital by passing its id. But it runs after the input validation, not
    // before: a request with no patientId at all is malformed rather than
    // forbidden, and answering "you have no referral for this patient" to an
    // empty id tells the caller nothing useful about what they got wrong.
    await referralService.assertReferredPatient(requestContext, "PHYSIOTHERAPY", patientId);


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

    // Per-patient authorization, AFTER the shape checks above.
    //
    // Order matters here. `referrals.read` only says this account is the kind
    // of clinician that reads referrals; it says nothing about THIS patient,
    // and without the line below a therapist could reach any record in the
    // hospital by passing its id. But it runs after the input validation, not
    // before: a request with no patientId at all is malformed rather than
    // forbidden, and answering "you have no referral for this patient" to an
    // empty id tells the caller nothing useful about what they got wrong.
    await referralService.assertReferredPatient(requestContext, "PHYSIOTHERAPY", input.patientId);

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

    const committed = await database.$transaction(async (tx) => {
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

    // After commit, and never able to fail the clinical write: the rest of
    // the care team hears that this entry now exists.
    await notifyCareTeamOfEntry({
      tenantId: context.tenantId,
      patientId: committed.patientId,
      actorMembershipId: context.membershipId ?? null,
      entryType: "THERAPY_SESSION",
      recordId: committed.id,
      title: "Physiotherapy session logged",
      discipline: "PHYSIOTHERAPY",
    });

    return committed;
  }

  async listSessions(requestContext: WonFlowRequestContext, patientId: string) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    // Per-patient authorization, AFTER the shape checks above.
    //
    // Order matters here. `referrals.read` only says this account is the kind
    // of clinician that reads referrals; it says nothing about THIS patient,
    // and without the line below a therapist could reach any record in the
    // hospital by passing its id. But it runs after the input validation, not
    // before: a request with no patientId at all is malformed rather than
    // forbidden, and answering "you have no referral for this patient" to an
    // empty id tells the caller nothing useful about what they got wrong.
    await referralService.assertReferredPatient(requestContext, "PHYSIOTHERAPY", patientId);


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
        "This patient has no active care plan, so there is nowhere to put the exercise. Ask the managing surgeon to start a care plan, then assign it again.",
      );
    }

    const scheduledDate = new Date(input.scheduledFor);
    const dayNumber = Math.max(
      1,
      Math.floor((scheduledDate.getTime() - new Date(carePlan.startDate).getTime()) / 86_400_000) + 1,
    );

    // Per-patient authorization, AFTER the shape checks above.
    //
    // Order matters here. `referrals.read` only says this account is the kind
    // of clinician that reads referrals; it says nothing about THIS patient,
    // and without the line below a therapist could reach any record in the
    // hospital by passing its id. But it runs after the input validation, not
    // before: a request with no patientId at all is malformed rather than
    // forbidden, and answering "you have no referral for this patient" to an
    // empty id tells the caller nothing useful about what they got wrong.
    await referralService.assertReferredPatient(requestContext, "PHYSIOTHERAPY", input.patientId);

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

  async listAssignedExercises(
    requestContext: WonFlowRequestContext,
    patientId: string,
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");
    await referralService.assertReferredPatient(requestContext, "PHYSIOTHERAPY", patientId);

    const carePlan = await database.carePlan.findFirst({
      where: {
        tenantId: context.tenantId,
        patientId,
        status: "ACTIVE",
      },
    });

    if (!carePlan) return [];

    return database.carePlanTask.findMany({
      where: {
        tenantId: context.tenantId,
        carePlanId: carePlan.id,
        taskType: "EXERCISE",
      },
      orderBy: { scheduledFor: "desc" },
    });
  }

  async deleteAssignedExercise(
    requestContext: WonFlowRequestContext,
    taskId: string,
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    return database.carePlanTask.deleteMany({
      where: {
        id: taskId,
        tenantId: context.tenantId,
      },
    });
  }

  async deleteExerciseDefinition(
    requestContext: WonFlowRequestContext,
    id: string,
  ) {
    const context = requireTenantContext(requestContext);
    return database.exerciseDefinition.updateMany({
      where: { id, tenantId: context.tenantId },
      data: { isActive: false },
    });
  }

  /**
   * Publishes the therapist's mobility orders to the rest of the hospital.
   *
   * The orders go to two places because two different people read them. The
   * referral carries them for the referring surgeon and for anyone opening
   * the therapy record; the care plan progress note puts them in front of the
   * ward team who are actually moving the patient. A patient with no active
   * care plan still gets the referral update — the note is simply skipped,
   * and the caller is told so rather than being left to assume it landed.
   */
  async publishPrecautionOrders(
    requestContext: WonFlowRequestContext,
    input: PublishPrecautionOrdersInput,
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");

    if (!input.patientId?.trim()) {
      throw new WonFlowApiError(400, "missing-patient-id", "Patient ID is required.");
    }

    const summary = buildPrecautionSummary(input);

    if (!summary) {
      throw new WonFlowApiError(
        400,
        "empty-orders",
        "Set a weight-bearing status, a precaution or an instruction before publishing.",
      );
    }

    await referralService.assertReferredPatient(
      requestContext,
      "PHYSIOTHERAPY",
      input.patientId,
    );

    // Scope the write by tenant as well as by id: a referral id alone is not
    // proof the row belongs to this hospital.
    const referral = input.referralId
      ? await database.clinicalReferral.findFirst({
          where: {
            id: input.referralId,
            tenantId: context.tenantId,
            patientId: input.patientId,
            specialty: "PHYSIOTHERAPY",
          },
        })
      : await database.clinicalReferral.findFirst({
          where: {
            tenantId: context.tenantId,
            patientId: input.patientId,
            specialty: "PHYSIOTHERAPY",
            status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
          },
          orderBy: { createdAt: "desc" },
        });

    if (!referral) {
      throw new WonFlowApiError(
        404,
        "referral-not-found",
        "No open physiotherapy referral was found for this patient.",
      );
    }

    await database.clinicalReferral.update({
      where: { id: referral.id },
      data: { precautions: summary },
    });

    const carePlan = await database.carePlan.findFirst({
      where: {
        tenantId: context.tenantId,
        patientId: input.patientId,
        status: "ACTIVE",
      },
    });

    let carePlanNoteAdded = false;

    if (carePlan) {
      await carePlanService.addProgressNote(
        requestContext,
        carePlan.id,
        `Physiotherapy precaution orders — ${summary}`,
      );
      carePlanNoteAdded = true;
    }

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: context.branchId,
        actorMembershipId: context.membershipId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        action: "clinical.therapy_precautions.published",
        entityType: "clinical-referral",
        entityId: referral.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
        metadata: {
          patientId: input.patientId,
          weightBearing: input.weightBearing ?? null,
          precautionCount: input.precautions?.length ?? 0,
          dischargeMobilityCleared: Boolean(input.dischargeMobilityCleared),
          carePlanNoteAdded,
        },
      },
    });

    return { referralId: referral.id, precautions: summary, carePlanNoteAdded };
  }
}

/**
 * Renders the orders as the one line of prose that both the referral field
 * and the care plan note carry. Codes rather than internal enum values, so
 * a surgeon reading it does not have to decode `PWB_50`.
 */
function buildPrecautionSummary(input: PublishPrecautionOrdersInput): string {
  const parts: string[] = [];

  const weightBearing = input.weightBearing?.trim();
  if (weightBearing) {
    parts.push(`Weight bearing: ${WEIGHT_BEARING_LABELS[weightBearing] ?? weightBearing}.`);
  }

  const precautions = (input.precautions ?? [])
    .map((value) => PRECAUTION_LABELS[value] ?? value)
    .filter(Boolean);

  if (precautions.length > 0) {
    parts.push(`Precautions in force: ${precautions.join("; ")}.`);
  }

  const notes = input.notes?.trim();
  if (notes) parts.push(notes);

  if (input.dischargeMobilityCleared) {
    parts.push("Physiotherapy discharge mobility clearance certified.");
  }

  return parts.join(" ").trim();
}

const WEIGHT_BEARING_LABELS: Record<string, string> = {
  NWB: "Non-weight bearing (NWB)",
  TTWB: "Toe-touch weight bearing (TTWB)",
  PWB_50: "Partial weight bearing, 50% (PWB 50%)",
  WBAT: "Weight bearing as tolerated (WBAT)",
  FWB: "Full weight bearing (FWB)",
};

const PRECAUTION_LABELS: Record<string, string> = {
  SUBCOSTAL: "Subcostal / rooftop incision precautions",
  DRAIN_AWARE: "Abdominal and biliary drains in situ",
  COAGULOPATHY: "Coagulopathy, varices or low platelets",
  IMMUNOSUPPRESSED: "Post-transplant immunosuppression",
  ENCEPHALOPATHY: "Hepatic encephalopathy fall risk",
  ASCITES: "Tense ascites or peripheral oedema",
  STERNAL: "Sternal precautions",
  POSTURAL_HYPO: "Postural hypotension",
  HIGH_FALL_RISK: "High fall risk",
  SPINAL: "Spinal precautions",
};

export const physiotherapyService = new PhysiotherapyService();
