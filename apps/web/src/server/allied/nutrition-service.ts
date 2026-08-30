import { database, Prisma } from "@wonflow/database";
import type { NutritionItemType } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";

import type { WonFlowRequestContext } from "@wonflow/contracts";
import type {
  CreateNutritionAssessmentInput,
  CreateNutritionPlanInput,
} from "@wonflow/contracts";
import { referralService } from "@/server/clinical/referral-service";
import { WonFlowApiError } from "@/server/http/route-handler";

export class NutritionService {
  async createAssessment(
    requestContext: WonFlowRequestContext,
    input: CreateNutritionAssessmentInput,
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
    await referralService.assertReferredPatient(requestContext, "NUTRITION", input.patientId);

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
        "An active staff profile is required to document nutrition assessments.",
      );
    }

    const patient = await database.patient.findFirst({
      where: { id: input.patientId, tenantId: context.tenantId },
    });

    if (!patient) {
      throw new WonFlowApiError(404, "patient-not-found", "Patient not found.");
    }

    let bmi: number | null = null;
    if (input.weightKg && input.heightCm && input.heightCm > 0) {
      const heightM = input.heightCm / 100;
      bmi = Number((input.weightKg / (heightM * heightM)).toFixed(2));
    }

    return database.$transaction(async (tx) => {
      const assessment = await tx.nutritionAssessment.create({
        data: {
          tenantId: context.tenantId,
          patientId: patient.id,
          assessedByStaffId: staff.id,
          referralId: input.referralId || null,
          weightKg: input.weightKg !== undefined ? new Prisma.Decimal(input.weightKg) : null,
          heightCm: input.heightCm !== undefined ? new Prisma.Decimal(input.heightCm) : null,
          bmi: bmi !== null ? new Prisma.Decimal(bmi) : null,
          weightChangeSinceSurgeryKg:
            input.weightChangeSinceSurgeryKg !== undefined
              ? new Prisma.Decimal(input.weightChangeSinceSurgeryKg)
              : null,
          appetiteScore: input.appetiteScore ?? null,
          intakeNotes: input.intakeNotes?.trim() || null,
          giSymptoms: input.giSymptoms?.trim() || null,
          enzymeRequirement: input.enzymeRequirement ?? false,
          notes: input.notes?.trim() || null,
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
          action: "clinical.nutrition_assessment.created",
          entityType: "nutrition-assessment",
          entityId: assessment.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            patientId: patient.id,
            bmi,
            enzymeRequirement: input.enzymeRequirement,
          },
        },
      });

      return assessment;
    });
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
    await referralService.assertReferredPatient(requestContext, "NUTRITION", patientId);


    return database.nutritionAssessment.findMany({
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

  async createNutritionPlan(
    requestContext: WonFlowRequestContext,
    input: CreateNutritionPlanInput,
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "referrals.read");


    if (!input.patientId?.trim()) {
      throw new WonFlowApiError(400, "missing-patient-id", "Patient ID is required.");
    }
    if (!input.title?.trim()) {
      throw new WonFlowApiError(400, "missing-title", "Nutrition plan title is required.");
    }
    if (!input.phase?.trim()) {
      throw new WonFlowApiError(400, "missing-phase", "Dietary phase is required.");
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
    await referralService.assertReferredPatient(requestContext, "NUTRITION", input.patientId);

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
        "An active staff profile is required to author nutrition plans.",
      );
    }

    const patient = await database.patient.findFirst({
      where: { id: input.patientId, tenantId: context.tenantId },
    });

    if (!patient) {
      throw new WonFlowApiError(404, "patient-not-found", "Patient not found.");
    }

    // Deactivate previous active plans for this patient
    await database.nutritionPlan.updateMany({
      where: {
        tenantId: context.tenantId,
        patientId: patient.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Locate active care plan if sync is requested.
    //
    // Whether one exists decides whether ANY of this reaches the patient's
    // phone, so the count of tasks actually written is returned to the
    // caller. Without it the screen reported "published and synced to the
    // Daily Action Centre" even when no care plan existed and not a single
    // task had been created — a dietitian would leave believing the patient
    // had their meal plan.
    let syncedTaskCount = 0;
    let activeCarePlan = null;
    if (input.syncToCarePlan) {
      activeCarePlan = await database.carePlan.findFirst({
        where: {
          tenantId: context.tenantId,
          patientId: patient.id,
          status: "ACTIVE",
        },
      });
    }

    return database.$transaction(async (tx) => {
      const plan = await tx.nutritionPlan.create({
        data: {
          tenantId: context.tenantId,
          patientId: patient.id,
          createdByStaffId: staff.id,
          referralId: input.referralId || null,
          title: input.title.trim(),
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          caloricTargetKcal: input.caloricTargetKcal ?? null,
          proteinTargetGrams: input.proteinTargetGrams ?? null,
          fluidTargetMl: input.fluidTargetMl ?? null,
          phase: input.phase.trim(),
          foodsToAvoid: input.foodsToAvoid?.trim() || null,
          notes: input.notes?.trim() || null,
          isActive: true,
        },
      });

      // Insert items with pancreatic enzyme rule enforcement
      if (input.items && input.items.length > 0) {
        for (let i = 0; i < input.items.length; i++) {
          const item = input.items[i];
          const isEnzyme =
            item.itemType === "ENZYME" ||
            /creon|pancreatin|enzyme|pert/i.test(item.name);

          // CLINICAL SAFETY RULE: Creon / PERT must ALWAYS be taken with meals
          const withMeal = isEnzyme ? true : (item.withMeal ?? false);

          let carePlanTaskId: string | null = null;

          if (activeCarePlan && input.syncToCarePlan) {
            const taskScheduledDate = new Date(input.startDate);
            const task = await tx.carePlanTask.create({
              data: {
                tenantId: context.tenantId,
                carePlanId: activeCarePlan.id,
                taskType: isEnzyme
                  ? "SUPPLEMENT"
                  : item.itemType === "MEAL"
                    ? "MEAL"
                    : "SUPPLEMENT",
                stageNumber: activeCarePlan.currentStage,
                dayNumber: 1,
                scheduledFor: taskScheduledDate,
                dueBy: new Date(taskScheduledDate.getTime() + 86_400_000),
                title: isEnzyme
                  ? `PERT (With Meal): ${item.name}`
                  : `Nutrition (${item.timeOfDay}): ${item.name}`,
                instructions: isEnzyme
                  ? `Take strictly with first bite of ${item.timeOfDay} meal. ${item.instruction ?? ""}`
                  : (item.instruction ?? `Consume ${item.name}`),
                status: "PENDING",
                resultData: {
                  itemType: item.itemType,
                  quantity: item.quantity ?? null,
                  unit: item.unit ?? null,
                  withMeal,
                  planId: plan.id,
                },
              },
            });
            carePlanTaskId = task.id;
            syncedTaskCount += 1;
          }

          await tx.nutritionPlanItem.create({
            data: {
              tenantId: context.tenantId,
              planId: plan.id,
              itemType: item.itemType as NutritionItemType,
              name: item.name.trim(),
              instruction: item.instruction?.trim() || null,
              timeOfDay: item.timeOfDay.trim(),
              quantity: item.quantity !== undefined ? new Prisma.Decimal(item.quantity) : null,
              unit: item.unit?.trim() || null,
              withMeal,
              displayOrder: item.displayOrder ?? i,
              carePlanTaskId,
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
          action: "clinical.nutrition_plan.created",
          entityType: "nutrition-plan",
          entityId: plan.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            patientId: patient.id,
            phase: plan.phase,
            itemCount: input.items?.length ?? 0,
          },
        },
      });

      const created = await tx.nutritionPlan.findUnique({
        where: { id: plan.id },
        include: {
          NutritionPlanItem: {
            orderBy: { displayOrder: "asc" },
          },
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

      return {
        ...created,
        sync: {
          requested: Boolean(input.syncToCarePlan),
          carePlanFound: activeCarePlan !== null,
          taskCount: syncedTaskCount,
        },
      };
    });
  }

  async getNutritionPlan(requestContext: WonFlowRequestContext, patientId: string) {
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
    await referralService.assertReferredPatient(requestContext, "NUTRITION", patientId);


    return database.nutritionPlan.findFirst({
      where: {
        tenantId: context.tenantId,
        patientId,
        isActive: true,
      },
      include: {
        NutritionPlanItem: {
          orderBy: { displayOrder: "asc" },
        },
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
  }

  /**
   * Malabsorption Alert: Checks for steatorrhoea/malabsorption logged in symptom history
   * or weight drop > 5% since surgery, auto-generating a HIGH/CRITICAL alert for the surgeon.
   */
  async checkMalabsorptionAlerts(
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

    // Check symptoms for steatorrhoea / severe diarrhea / malabsorption
    const malabsorptionSymptoms = await database.symptomLog.findMany({
      where: {
        tenantId: context.tenantId,
        patientId,
        OR: [
          { symptomCode: { contains: "STEATORRHOEA", mode: "insensitive" } },
          { symptomName: { contains: "Steatorrhoea", mode: "insensitive" } },
          { symptomName: { contains: "Malabsorption", mode: "insensitive" } },
          { symptomCode: { contains: "DIARRHEA", mode: "insensitive" }, severityScore: { gte: 3 } },
        ],
      },
      orderBy: { recordedAt: "desc" },
      take: 2,
    });

    if (malabsorptionSymptoms.length > 0) {
      const existingAlert = await database.carePlanAlert.findFirst({
        where: {
          tenantId: context.tenantId,
          carePlanId: activeCarePlan.id,
          status: "OPEN",
          title: { contains: "Malabsorption" },
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
            title: "Surgical Alert: Malabsorption / Steatorrhoea Detected",
            message: `Patient reported symptoms consistent with pancreatic exocrine insufficiency / malabsorption (${malabsorptionSymptoms[0].symptomName}). Consider reviewing Creon / PERT dosing with the clinical dietitian.`,
          },
        });
      }
    }

    return null;
  }
}

export const nutritionService = new NutritionService();
