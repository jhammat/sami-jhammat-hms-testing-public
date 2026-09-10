import { database } from "@wonflow/database";
import { hasPermission, requireTenantContext } from "@wonflow/contracts";
import type {
  CarePlanAlertRule,
  CarePlanAlertSeverity,
  CarePlanAlertSummary,
  CarePlanRosterItem,
  CarePlanStageDefinition,
  CarePlanSummary,
  CarePlanTaskSummary,
  CarePlanTaskTemplate,
  CarePlanTaskType,
  CarePlanTemplateSummary,
  CompleteCarePlanTaskInput,
  CreateCarePlanTemplateInput,
  InstantiateCarePlanInput,
  ObservationSource,
  WonFlowRequestContext,
  WonFlowTenantRequestContext,
} from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { STARTER_CARE_PLAN_TEMPLATES } from "./starter-care-plan-templates";
import type { Prisma } from "@wonflow/database";

function toUuid(value?: string | null): string | null {
  if (!value) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  return isUuid ? value : null;
}

export class CarePlanService {
  async createTemplate(
    requestContext: WonFlowRequestContext,
    input: CreateCarePlanTemplateInput,
  ): Promise<CarePlanTemplateSummary> {
    const context = requireTenantContext(requestContext);

    if (!context.membershipId) {
      throw new WonFlowApiError(403, "membership-required", "Staff membership is required to manage care plan templates.");
    }

    if (!input.title?.trim()) {
      throw new WonFlowApiError(400, "missing-title", "Care plan template title is required.");
    }

    const durationDays = Math.max(1, input.durationDays || 14);

    const template = await database.carePlanTemplate.create({
      data: {
        tenantId: context.tenantId,
        category: input.category || "GENERAL",
        title: input.title.trim(),
        description: input.description?.trim() || null,
        durationDays,
        stages: input.stages as unknown as Prisma.InputJsonValue,
        taskTemplates: input.taskTemplates as unknown as Prisma.InputJsonValue,
        alertRules: input.alertRules as unknown as Prisma.InputJsonValue,
        createdByMembershipId: context.membershipId,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: "clinical.careplan_template.created",
        entityType: "careplan-template",
        entityId: template.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
        metadata: {
          title: template.title,
          category: template.category,
        },
      },
    });

    return {
      id: template.id,
      tenantId: template.tenantId,
      category: template.category,
      title: template.title,
      description: template.description,
      durationDays: template.durationDays,
      stages: template.stages as unknown as CarePlanStageDefinition[],
      taskTemplates: template.taskTemplates as unknown as CarePlanTaskTemplate[],
      alertRules: template.alertRules as unknown as CarePlanAlertRule[],
      isActive: template.isActive,
      version: template.version,
      createdByMembershipId: template.createdByMembershipId,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  async seedStarterTemplates(tenantId: string, membershipId: string): Promise<void> {
    for (const starter of STARTER_CARE_PLAN_TEMPLATES) {
      const existing = await database.carePlanTemplate.findFirst({
        where: {
          tenantId,
          category: starter.category,
          title: starter.title,
        },
      });

      if (!existing) {
        await database.carePlanTemplate.create({
          data: {
            tenantId,
            category: starter.category,
            title: starter.title,
            description: starter.description || null,
            durationDays: starter.durationDays,
            stages: starter.stages as unknown as Prisma.InputJsonValue,
            taskTemplates: starter.taskTemplates as unknown as Prisma.InputJsonValue,
            alertRules: starter.alertRules as unknown as Prisma.InputJsonValue,
            createdByMembershipId: membershipId,
          },
        });
      }
    }
  }

  async listTemplates(
    requestContext: WonFlowRequestContext,
    category?: string,
  ): Promise<CarePlanTemplateSummary[]> {
    const context = requireTenantContext(requestContext);

    // Auto-seed starter templates if tenant has none
    if (context.membershipId) {
      const count = await database.carePlanTemplate.count({
        where: { tenantId: context.tenantId },
      });
      if (count === 0) {
        await this.seedStarterTemplates(context.tenantId, context.membershipId);
      }
    }

    const templates = await database.carePlanTemplate.findMany({
      where: {
        tenantId: context.tenantId,
        isActive: true,
        category: category ? category : undefined,
      },
      orderBy: { createdAt: "asc" },
    });

    return templates.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      category: t.category,
      title: t.title,
      description: t.description,
      durationDays: t.durationDays,
      stages: t.stages as unknown as CarePlanStageDefinition[],
      taskTemplates: t.taskTemplates as unknown as CarePlanTaskTemplate[],
      alertRules: t.alertRules as unknown as CarePlanAlertRule[],
      isActive: t.isActive,
      version: t.version,
      createdByMembershipId: t.createdByMembershipId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  /**
   * Edits a saved plan. Only the fields sent are touched, so a doctor can
   * rename a template without resending its whole task list.
   *
   * `version` is bumped on every edit: plans already running were built from
   * the tasks as they stood, and it should be possible to tell which revision
   * a given patient's plan came from.
   */
  async updateTemplate(
    requestContext: WonFlowRequestContext,
    id: string,
    input: Partial<CreateCarePlanTemplateInput>,
  ): Promise<CarePlanTemplateSummary> {
    const context = requireTenantContext(requestContext);
    if (!context.membershipId) {
      throw new WonFlowApiError(403, "membership-required", "Staff membership is required to manage care plan templates.");
    }

    const existing = await database.carePlanTemplate.findFirst({
      where: { id, tenantId: context.tenantId },
    });
    if (!existing) {
      throw new WonFlowApiError(404, "care-plan-template-not-found", "The care plan template could not be found.");
    }

    if (input.title !== undefined && !input.title.trim()) {
      throw new WonFlowApiError(400, "missing-title", "Care plan template title is required.");
    }

    const updated = await database.carePlanTemplate.update({
      where: { id: existing.id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.category !== undefined ? { category: input.category || "GENERAL" } : {}),
        ...(input.durationDays !== undefined ? { durationDays: Math.max(1, input.durationDays || 14) } : {}),
        ...(input.stages !== undefined ? { stages: input.stages as unknown as Prisma.InputJsonValue } : {}),
        ...(input.taskTemplates !== undefined ? { taskTemplates: input.taskTemplates as unknown as Prisma.InputJsonValue } : {}),
        ...(input.alertRules !== undefined ? { alertRules: input.alertRules as unknown as Prisma.InputJsonValue } : {}),
        version: { increment: 1 },
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: "clinical.careplan_template.updated",
        entityType: "careplan-template",
        entityId: updated.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
      },
    });

    return this.getTemplate(requestContext, updated.id);
  }

  /**
   * Retires a template.
   *
   * Deliberately a soft retire rather than a delete: `CarePlan.templateId`
   * points here, and a patient's running plan must not lose the record of what
   * it was built from. A retired template stops appearing when starting a new
   * plan and leaves existing ones untouched.
   */
  async archiveTemplate(
    requestContext: WonFlowRequestContext,
    id: string,
  ): Promise<{ id: string; isActive: boolean }> {
    const context = requireTenantContext(requestContext);
    if (!context.membershipId) {
      throw new WonFlowApiError(403, "membership-required", "Staff membership is required to manage care plan templates.");
    }

    const existing = await database.carePlanTemplate.findFirst({
      where: { id, tenantId: context.tenantId },
    });
    if (!existing) {
      throw new WonFlowApiError(404, "care-plan-template-not-found", "The care plan template could not be found.");
    }

    const archived = await database.carePlanTemplate.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: "clinical.careplan_template.archived",
        entityType: "careplan-template",
        entityId: archived.id,
        severity: "WARNING",
        sourceApplication: context.sourceApplication,
      },
    });

    return { id: archived.id, isActive: archived.isActive };
  }

  async getTemplate(
    requestContext: WonFlowRequestContext,
    id: string,
  ): Promise<CarePlanTemplateSummary> {
    const context = requireTenantContext(requestContext);

    const t = await database.carePlanTemplate.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!t) {
      throw new WonFlowApiError(404, "template-not-found", "Care plan template not found.");
    }

    return {
      id: t.id,
      tenantId: t.tenantId,
      category: t.category,
      title: t.title,
      description: t.description,
      durationDays: t.durationDays,
      stages: t.stages as unknown as CarePlanStageDefinition[],
      taskTemplates: t.taskTemplates as unknown as CarePlanTaskTemplate[],
      alertRules: t.alertRules as unknown as CarePlanAlertRule[],
      isActive: t.isActive,
      version: t.version,
      createdByMembershipId: t.createdByMembershipId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  async instantiatePlan(
    requestContext: WonFlowRequestContext,
    input: InstantiateCarePlanInput,
  ): Promise<CarePlanSummary> {
    const context = requireTenantContext(requestContext);

    if (!input.patientId?.trim()) {
      throw new WonFlowApiError(400, "missing-patient-id", "Patient ID is required.");
    }

    const patient = await database.patient.findFirst({
      where: { id: input.patientId, tenantId: context.tenantId, status: { not: "ARCHIVED" } },
    });
    if (!patient) {
      throw new WonFlowApiError(404, "patient-not-found", "Patient not found.");
    }

    let managingDoctorId = input.managingDoctorId?.trim();
    if (!managingDoctorId && context.membershipId) {
      const doctor = await database.doctorProfile.findFirst({
        where: {
          tenantId: context.tenantId,
          staffProfile: { membershipId: context.membershipId },
        },
      });
      if (doctor) {
        managingDoctorId = doctor.id;
      }
    }

    if (!managingDoctorId) {
      const firstDoctor = await database.doctorProfile.findFirst({
        where: { tenantId: context.tenantId },
      });
      if (firstDoctor) {
        managingDoctorId = firstDoctor.id;
      } else {
        throw new WonFlowApiError(400, "doctor-required", "A managing doctor is required for the care plan.");
      }
    }

    let template: CarePlanTemplateSummary | null = null;
    if (input.templateId) {
      template = await this.getTemplate(requestContext, input.templateId);
    } else {
      // Fall back to starter template matching category or general
      const templates = await this.listTemplates(requestContext, input.category);
      template = templates[0] ?? null;
    }

    const title = input.title?.trim() || template?.title || "Personalized Clinical Care Plan";
    const category = input.category || template?.category || "GENERAL";
    const durationDays = typeof input.durationDays === "number" && input.durationDays > 0 ? Math.floor(input.durationDays) : (template?.durationDays || 14);

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    const createdPlan = await database.$transaction(async (tx) => {
      const plan = await tx.carePlan.create({
        data: {
          tenantId: context.tenantId,
          patientId: patient.id,
          templateId: template?.id ?? null,
          category,
          title,
          status: "ACTIVE",
          startDate,
          endDate,
          currentStage: 1,
          managingDoctorId,
          assignedCaregiverId: input.assignedCaregiverId || null,
          assignedTherapistId: input.assignedTherapistId || null,
          assignedNutritionistId: input.assignedNutritionistId || null,
          instigatingEncounterId: input.instigatingEncounterId || null,
        },
      });

      // Generate concrete CarePlanTask records
      const taskTemplates = template?.taskTemplates || [];
      const tasksToCreate = taskTemplates.map((tt) => {
        const scheduled = new Date(startDate);
        const dayOffset = Math.max(1, tt.dayOffset || 1);
        scheduled.setDate(scheduled.getDate() + (dayOffset - 1));

        if (tt.scheduleTimeOfDay) {
          const [hours, minutes] = tt.scheduleTimeOfDay.split(":").map(Number);
          scheduled.setHours(hours || 9, minutes || 0, 0, 0);
        } else {
          scheduled.setHours(9, 0, 0, 0);
        }

        const dueBy = new Date(scheduled);
        dueBy.setHours(23, 59, 59, 999);

        return {
          tenantId: context.tenantId,
          carePlanId: plan.id,
          taskType: tt.taskType,
          stageNumber: tt.stageNumber || 1,
          dayNumber: dayOffset,
          scheduledFor: scheduled,
          dueBy,
          title: tt.title,
          instructions: tt.instructions || null,
          requiredSource: tt.requiredSource || null,
          status: "PENDING" as const,
        };
      });

      if (tasksToCreate.length > 0) {
        await tx.carePlanTask.createMany({
          data: tasksToCreate,
        });
      }

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: toUuid(context.branchId),
          actorMembershipId: toUuid(context.membershipId),
          sessionId: toUuid(context.sessionId),
          requestId: context.requestId,
          action: "clinical.careplan.created",
          entityType: "careplan",
          entityId: plan.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            patientId: patient.id,
            templateId: template?.id,
            totalTasks: tasksToCreate.length,
          },
        },
      });

      return plan;
    });

    return this.getPlan(requestContext, createdPlan.id);
  }

  async getPlan(
    requestContext: WonFlowRequestContext,
    id: string,
  ): Promise<CarePlanSummary> {
    const context = requireTenantContext(requestContext);

    const plan = await database.carePlan.findFirst({
      where: { id, tenantId: context.tenantId },
      include: {
        // The screen needs a name to put at the top of the plan. Without this
        // it fell back to "Patient #" plus the first eight characters of a
        // UUID, which tells a clinician nothing about who they are looking at.
        patient: { select: { givenName: true, middleName: true, familyName: true, patientNumber: true } },
        tasks: {
          orderBy: [{ scheduledFor: "asc" }, { dayNumber: "asc" }],
        },
        alerts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!plan) {
      throw new WonFlowApiError(404, "care-plan-not-found", "Care plan not found.");
    }

    const taskSummaries: CarePlanTaskSummary[] = plan.tasks.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      carePlanId: t.carePlanId,
      taskType: t.taskType,
      stageNumber: t.stageNumber,
      dayNumber: t.dayNumber,
      scheduledFor: t.scheduledFor.toISOString(),
      dueBy: t.dueBy?.toISOString() ?? null,
      title: t.title,
      instructions: t.instructions,
      requiredSource: t.requiredSource,
      status: t.status,
      completedAt: t.completedAt?.toISOString() ?? null,
      completedByIdentityId: t.completedByIdentityId,
      resultData: t.resultData as Record<string, unknown> | null,
      skipReason: t.skipReason,
      createdAt: t.createdAt.toISOString(),
    }));

    const alertSummaries: CarePlanAlertSummary[] = plan.alerts.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      carePlanId: a.carePlanId,
      patientId: a.patientId,
      triggeredByObservationId: a.triggeredByObservationId,
      severity: a.severity,
      status: a.status,
      title: a.title,
      message: a.message,
      acknowledgedByMembershipId: a.acknowledgedByMembershipId,
      acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
      resolutionNotes: a.resolutionNotes,
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    }));

    return {
      id: plan.id,
      tenantId: plan.tenantId,
      patientId: plan.patientId,
      patientName: [plan.patient?.givenName, plan.patient?.middleName, plan.patient?.familyName]
        .filter(Boolean)
        .join(" ") || null,
      patientNumber: plan.patient?.patientNumber ?? null,
      templateId: plan.templateId,
      category: plan.category,
      title: plan.title,
      status: plan.status,
      startDate: plan.startDate.toISOString(),
      endDate: plan.endDate?.toISOString() ?? null,
      currentStage: plan.currentStage,
      instigatingEncounterId: plan.instigatingEncounterId,
      managingDoctorId: plan.managingDoctorId,
      assignedCaregiverId: plan.assignedCaregiverId,
      assignedTherapistId: plan.assignedTherapistId,
      assignedNutritionistId: plan.assignedNutritionistId,
      progressNotes: plan.progressNotes as unknown as CarePlanSummary["progressNotes"],
      tasks: taskSummaries,
      alerts: alertSummaries,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  async listPatientPlans(
    requestContext: WonFlowRequestContext,
    patientId: string,
  ): Promise<CarePlanSummary[]> {
    const context = requireTenantContext(requestContext);

    const plans = await database.carePlan.findMany({
      where: {
        tenantId: context.tenantId,
        patientId,
      },
      include: {
        tasks: {
          orderBy: { scheduledFor: "asc" },
        },
        alerts: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return plans.map((plan) => ({
      id: plan.id,
      tenantId: plan.tenantId,
      patientId: plan.patientId,
      templateId: plan.templateId,
      category: plan.category,
      title: plan.title,
      status: plan.status,
      startDate: plan.startDate.toISOString(),
      endDate: plan.endDate?.toISOString() ?? null,
      currentStage: plan.currentStage,
      instigatingEncounterId: plan.instigatingEncounterId,
      managingDoctorId: plan.managingDoctorId,
      assignedCaregiverId: plan.assignedCaregiverId,
      assignedTherapistId: plan.assignedTherapistId,
      assignedNutritionistId: plan.assignedNutritionistId,
      progressNotes: plan.progressNotes as unknown as CarePlanSummary["progressNotes"],
      tasks: plan.tasks.map((t) => ({
        id: t.id,
        tenantId: t.tenantId,
        carePlanId: t.carePlanId,
        taskType: t.taskType,
        stageNumber: t.stageNumber,
        dayNumber: t.dayNumber,
        scheduledFor: t.scheduledFor.toISOString(),
        dueBy: t.dueBy?.toISOString() ?? null,
        title: t.title,
        instructions: t.instructions,
        requiredSource: t.requiredSource,
        status: t.status,
        completedAt: t.completedAt?.toISOString() ?? null,
        completedByIdentityId: t.completedByIdentityId,
        resultData: t.resultData as Record<string, unknown> | null,
        skipReason: t.skipReason,
        createdAt: t.createdAt.toISOString(),
      })),
      alerts: plan.alerts.map((a) => ({
        id: a.id,
        tenantId: a.tenantId,
        carePlanId: a.carePlanId,
        patientId: a.patientId,
        triggeredByObservationId: a.triggeredByObservationId,
        severity: a.severity,
        status: a.status,
        title: a.title,
        message: a.message,
        acknowledgedByMembershipId: a.acknowledgedByMembershipId,
        acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
        resolutionNotes: a.resolutionNotes,
        resolvedAt: a.resolvedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }));
  }

  /**
   * Edits a plan that is already running.
   *
   * A plan could be created and then never touched again — no rename, no
   * pause, no way to stop it. A recovery plan is a living document: the
   * surgeon extends it, pauses it while the patient is readmitted, or closes
   * it when recovery is done.
   */
  async updatePlan(
    requestContext: WonFlowRequestContext,
    carePlanId: string,
    input: { title?: string; status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "DISCONTINUED"; endDate?: string | null; assignedTherapistId?: string | null; assignedNutritionistId?: string | null },
  ): Promise<CarePlanSummary> {
    const context = requireTenantContext(requestContext);
    if (!context.membershipId) {
      throw new WonFlowApiError(403, "membership-required", "Staff membership is required to change a care plan.");
    }

    const plan = await database.carePlan.findFirst({ where: { id: carePlanId, tenantId: context.tenantId } });
    if (!plan) throw new WonFlowApiError(404, "care-plan-not-found", "Care plan not found.");
    if (input.title !== undefined && !input.title.trim()) {
      throw new WonFlowApiError(400, "missing-title", "The care plan needs a title.");
    }

    await database.carePlan.update({
      where: { id: plan.id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {}),
        ...(input.assignedTherapistId !== undefined ? { assignedTherapistId: input.assignedTherapistId || null } : {}),
        ...(input.assignedNutritionistId !== undefined ? { assignedNutritionistId: input.assignedNutritionistId || null } : {}),
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: input.status ? `clinical.careplan.${input.status.toLowerCase()}` : "clinical.careplan.updated",
        entityType: "careplan",
        entityId: plan.id,
        severity: input.status === "DISCONTINUED" ? "WARNING" : "INFORMATION",
        sourceApplication: context.sourceApplication,
      },
    });

    return this.getPlan(requestContext, plan.id);
  }

  /**
   * Stops a care plan.
   *
   * Discontinued rather than deleted: the plan records what a patient was
   * asked to do and what they did, and a completed task is part of their
   * clinical history. A plan with nothing recorded against it has no history
   * to protect, so that one is removed outright — which is what a doctor
   * means when they start a plan by mistake and want it gone.
   */
  async discontinuePlan(
    requestContext: WonFlowRequestContext,
    carePlanId: string,
    reason?: string,
  ): Promise<{ id: string; deleted: boolean; status: string }> {
    const context = requireTenantContext(requestContext);
    if (!context.membershipId) {
      throw new WonFlowApiError(403, "membership-required", "Staff membership is required to stop a care plan.");
    }

    const plan = await database.carePlan.findFirst({ where: { id: carePlanId, tenantId: context.tenantId } });
    if (!plan) throw new WonFlowApiError(404, "care-plan-not-found", "Care plan not found.");

    const recorded = await database.carePlanTask.count({
      where: { carePlanId: plan.id, status: { in: ["COMPLETED", "SKIPPED"] } },
    });

    const result = await database.$transaction(async (tx) => {
      if (recorded === 0) {
        await tx.carePlanAlert.deleteMany({ where: { carePlanId: plan.id } });
        await tx.carePlanTask.deleteMany({ where: { carePlanId: plan.id } });
        await tx.carePlan.delete({ where: { id: plan.id } });
        return { id: plan.id, deleted: true, status: "DELETED" };
      }
      const stopped = await tx.carePlan.update({
        where: { id: plan.id },
        data: { status: "DISCONTINUED", endDate: new Date() },
      });
      return { id: stopped.id, deleted: false, status: stopped.status };
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: result.deleted ? "clinical.careplan.deleted" : "clinical.careplan.discontinued",
        entityType: "careplan",
        entityId: plan.id,
        severity: "WARNING",
        reason: reason?.trim() || null,
        sourceApplication: context.sourceApplication,
      },
    });

    return result;
  }

  /** Adds a single task to a plan that is already running. */
  async addTask(
    requestContext: WonFlowRequestContext,
    carePlanId: string,
    input: { title: string; taskType: CarePlanTaskType; dayNumber?: number; scheduleTimeOfDay?: string; instructions?: string },
  ): Promise<CarePlanTaskSummary> {
    const context = requireTenantContext(requestContext);
    if (!context.membershipId) {
      throw new WonFlowApiError(403, "membership-required", "Staff membership is required to add a task.");
    }
    if (!input.title?.trim()) {
      throw new WonFlowApiError(400, "missing-title", "The task needs a name.");
    }

    const plan = await database.carePlan.findFirst({ where: { id: carePlanId, tenantId: context.tenantId } });
    if (!plan) throw new WonFlowApiError(404, "care-plan-not-found", "Care plan not found.");

    const dayNumber = Math.max(1, Math.floor(input.dayNumber || 1));
    const scheduledFor = new Date(plan.startDate);
    scheduledFor.setDate(scheduledFor.getDate() + (dayNumber - 1));
    const [hours, minutes] = (input.scheduleTimeOfDay || "09:00").split(":").map(Number);
    scheduledFor.setHours(hours || 9, minutes || 0, 0, 0);
    const dueBy = new Date(scheduledFor);
    dueBy.setHours(23, 59, 59, 999);

    const task = await database.carePlanTask.create({
      data: {
        tenantId: context.tenantId,
        carePlanId: plan.id,
        taskType: input.taskType,
        stageNumber: 1,
        dayNumber,
        scheduledFor,
        dueBy,
        title: input.title.trim(),
        instructions: input.instructions?.trim() || null,
        status: "PENDING",
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: "clinical.careplan_task.added",
        entityType: "careplan-task",
        entityId: task.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
      },
    });

    return this.serializeTask(task);
  }

  /** Edits a task that has not been actioned yet. */
  async updateTask(
    requestContext: WonFlowRequestContext,
    taskId: string,
    input: { title?: string; taskType?: CarePlanTaskType; dayNumber?: number; scheduleTimeOfDay?: string; instructions?: string | null },
  ): Promise<CarePlanTaskSummary> {
    const context = requireTenantContext(requestContext);
    if (!context.membershipId) {
      throw new WonFlowApiError(403, "membership-required", "Staff membership is required to change a task.");
    }

    const task = await database.carePlanTask.findFirst({
      where: { id: taskId, tenantId: context.tenantId },
      include: { carePlan: true },
    });
    if (!task) throw new WonFlowApiError(404, "task-not-found", "Care plan task not found.");

    /*
     * A task the patient has already completed or skipped is a record of what
     * happened, not a plan any more. Rewriting its title or time afterwards
     * would change the meaning of an entry someone already acted on.
     */
    if (task.status === "COMPLETED" || task.status === "SKIPPED") {
      throw new WonFlowApiError(
        409,
        "task-already-actioned",
        "This task has already been completed or skipped and can no longer be edited. Add a new task instead.",
      );
    }
    if (input.title !== undefined && !input.title.trim()) {
      throw new WonFlowApiError(400, "missing-title", "The task needs a name.");
    }

    let scheduledFor = task.scheduledFor;
    if (input.dayNumber !== undefined || input.scheduleTimeOfDay !== undefined) {
      const dayNumber = Math.max(1, Math.floor(input.dayNumber ?? task.dayNumber ?? 1));
      scheduledFor = new Date(task.carePlan.startDate);
      scheduledFor.setDate(scheduledFor.getDate() + (dayNumber - 1));
      const source = input.scheduleTimeOfDay
        ?? `${String(task.scheduledFor.getHours()).padStart(2, "0")}:${String(task.scheduledFor.getMinutes()).padStart(2, "0")}`;
      const [hours, minutes] = source.split(":").map(Number);
      scheduledFor.setHours(hours || 9, minutes || 0, 0, 0);
    }

    const updated = await database.carePlanTask.update({
      where: { id: task.id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.taskType !== undefined ? { taskType: input.taskType } : {}),
        ...(input.dayNumber !== undefined ? { dayNumber: Math.max(1, Math.floor(input.dayNumber)) } : {}),
        ...(input.instructions !== undefined ? { instructions: input.instructions?.trim() || null } : {}),
        scheduledFor,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: "clinical.careplan_task.updated",
        entityType: "careplan-task",
        entityId: updated.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
      },
    });

    return this.serializeTask(updated);
  }

  /** Removes a task that was never actioned. */
  async deleteTask(
    requestContext: WonFlowRequestContext,
    taskId: string,
  ): Promise<{ id: string }> {
    const context = requireTenantContext(requestContext);
    if (!context.membershipId) {
      throw new WonFlowApiError(403, "membership-required", "Staff membership is required to remove a task.");
    }

    const task = await database.carePlanTask.findFirst({ where: { id: taskId, tenantId: context.tenantId } });
    if (!task) throw new WonFlowApiError(404, "task-not-found", "Care plan task not found.");

    if (task.status === "COMPLETED" || task.status === "SKIPPED") {
      throw new WonFlowApiError(
        409,
        "task-already-actioned",
        "This task has already been completed or skipped, so it stays on the record.",
      );
    }

    await database.$transaction(async (tx) => {
      await tx.carePlanTask.delete({ where: { id: task.id } });
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: "clinical.careplan_task.removed",
        entityType: "careplan-task",
        entityId: task.id,
        severity: "WARNING",
        sourceApplication: context.sourceApplication,
      },
    });

    return { id: task.id };
  }

  /** Shared row -> summary mapping for the single-task endpoints. */
  private serializeTask(t: {
    id: string; tenantId: string; carePlanId: string; taskType: string; stageNumber: number;
    dayNumber: number; scheduledFor: Date; dueBy: Date | null; title: string; instructions: string | null;
    requiredSource: string | null; status: string; completedAt: Date | null; completedByIdentityId: string | null;
    resultData: unknown; skipReason: string | null; createdAt: Date;
  }): CarePlanTaskSummary {
    return {
      id: t.id,
      tenantId: t.tenantId,
      carePlanId: t.carePlanId,
      taskType: t.taskType,
      stageNumber: t.stageNumber,
      dayNumber: t.dayNumber,
      scheduledFor: t.scheduledFor.toISOString(),
      dueBy: t.dueBy?.toISOString() ?? null,
      title: t.title,
      instructions: t.instructions,
      requiredSource: t.requiredSource,
      status: t.status,
      completedAt: t.completedAt?.toISOString() ?? null,
      completedByIdentityId: t.completedByIdentityId,
      resultData: t.resultData,
      skipReason: t.skipReason,
      createdAt: t.createdAt.toISOString(),
    } as unknown as CarePlanTaskSummary;
  }

  async completeTask(
    requestContext: WonFlowRequestContext,
    taskId: string,
    input: CompleteCarePlanTaskInput,
  ): Promise<CarePlanTaskSummary> {
    const context = requireTenantContext(requestContext);

    const task = await database.carePlanTask.findFirst({
      where: { id: taskId, tenantId: context.tenantId },
      include: { carePlan: true },
    });

    if (!task) {
      throw new WonFlowApiError(404, "task-not-found", "Care plan task not found.");
    }

    const isSkipping = Boolean(input.skipReason?.trim());
    const newStatus = isSkipping ? "SKIPPED" : "COMPLETED";

    // Determine observation source
    let source: ObservationSource = "PATIENT";
    if (context.membershipId && context.workspace !== "PATIENT") {
      source = "STAFF";
    } else {
      const access = await database.patientAccess.findFirst({
        where: {
          patientId: task.carePlan.patientId,
          identityId: context.identityId,
          isActive: true,
        },
      });
      if (access && access.relationship !== "self") {
        source = "CAREGIVER";
      }
    }

    const result = await database.$transaction(async (tx) => {
      let createdObservationId: string | null = null;

      // If observation details are passed or task is vitals/drain, create observation
      if (!isSkipping && input.observation) {
        const obs = await tx.clinicalObservation.create({
          data: {
            tenantId: context.tenantId,
            patientId: task.carePlan.patientId,
            carePlanTaskId: task.id,
            source,
            recordedByIdentityId: context.identityId,
            recordedByMembershipId: context.membershipId ?? null,
            code: input.observation.code.trim().toLowerCase(),
            display: input.observation.display.trim(),
            valueNumber: input.observation.valueNumber ?? null,
            valueText: input.observation.valueText ?? null,
            unit: input.observation.unit ?? null,
            status: source === "STAFF" ? "FINAL" : "PRELIMINARY",
            observedAt: input.observation.observedAt ? new Date(input.observation.observedAt) : new Date(),
          },
        });
        createdObservationId = obs.id;
      }

      const updatedTask = await tx.carePlanTask.update({
        where: { id: task.id },
        data: {
          status: newStatus,
          completedAt: new Date(),
          completedByIdentityId: context.identityId,
          skipReason: input.skipReason?.trim() || null,
          resultData: {
            ...(input.resultData || {}),
            observationId: createdObservationId,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: toUuid(context.branchId),
          actorMembershipId: toUuid(context.membershipId),
          sessionId: toUuid(context.sessionId),
          requestId: context.requestId,
          action: "clinical.careplan.task_completed",
          entityType: "careplan-task",
          entityId: task.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            carePlanId: task.carePlanId,
            status: newStatus,
            taskType: task.taskType,
            observationId: createdObservationId,
          },
        },
      });

      return { updatedTask, createdObservationId };
    });

    // Evaluate alert rules if an observation was created
    if (result.createdObservationId && input.observation) {
      await this.evaluateAlertRules(task.carePlanId, {
        id: result.createdObservationId,
        code: input.observation.code,
        valueNumber: input.observation.valueNumber ?? null,
        valueText: input.observation.valueText ?? null,
      });
    }

    return {
      id: result.updatedTask.id,
      tenantId: result.updatedTask.tenantId,
      carePlanId: result.updatedTask.carePlanId,
      taskType: result.updatedTask.taskType,
      stageNumber: result.updatedTask.stageNumber,
      dayNumber: result.updatedTask.dayNumber,
      scheduledFor: result.updatedTask.scheduledFor.toISOString(),
      dueBy: result.updatedTask.dueBy?.toISOString() ?? null,
      title: result.updatedTask.title,
      instructions: result.updatedTask.instructions,
      requiredSource: result.updatedTask.requiredSource,
      status: result.updatedTask.status,
      completedAt: result.updatedTask.completedAt?.toISOString() ?? null,
      completedByIdentityId: result.updatedTask.completedByIdentityId,
      resultData: result.updatedTask.resultData as Record<string, unknown> | null,
      skipReason: result.updatedTask.skipReason,
      createdAt: result.updatedTask.createdAt.toISOString(),
    };
  }

  async evaluateAlertRules(
    carePlanId: string,
    observation: {
      id?: string;
      code: string;
      valueNumber?: number | null;
      valueText?: string | null;
    },
  ): Promise<CarePlanAlertSummary[]> {
    const plan = await database.carePlan.findUnique({
      where: { id: carePlanId },
      include: { template: true },
    });

    if (!plan || !plan.template) return [];

    const alertRules = (plan.template.alertRules as unknown as CarePlanAlertRule[]) || [];
    const generatedAlerts: CarePlanAlertSummary[] = [];

    const normalizedCode = observation.code.trim().toLowerCase();
    const obsVal = observation.valueNumber !== null && observation.valueNumber !== undefined
      ? Number(observation.valueNumber)
      : null;

    for (const rule of alertRules) {
      const ruleType = rule.observationType.trim().toLowerCase();
      if (ruleType !== normalizedCode) continue;
      if (obsVal === null) continue;

      let triggered = false;
      switch (rule.condition) {
        case ">":
          triggered = obsVal > rule.threshold;
          break;
        case ">=":
          triggered = obsVal >= rule.threshold;
          break;
        case "<":
          triggered = obsVal < rule.threshold;
          break;
        case "<=":
          triggered = obsVal <= rule.threshold;
          break;
        case "==":
          triggered = obsVal === rule.threshold;
          break;
        case "!=":
          triggered = obsVal !== rule.threshold;
          break;
      }

      if (triggered) {
        const alert = await database.carePlanAlert.create({
          data: {
            tenantId: plan.tenantId,
            carePlanId: plan.id,
            patientId: plan.patientId,
            triggeredByObservationId: observation.id || null,
            severity: rule.severity,
            status: "OPEN",
            title: `Alert: ${rule.observationType.replace(/_/g, " ").toUpperCase()}`,
            message: rule.message,
          },
        });

        await database.auditEvent.create({
          data: {
            tenantId: plan.tenantId,
            requestId: `alert-${Date.now()}`,
            action: "clinical.careplan.alert_triggered",
            entityType: "careplan-alert",
            entityId: alert.id,
            severity: rule.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
            sourceApplication: "clinical-engine",
            metadata: {
              carePlanId: plan.id,
              patientId: plan.patientId,
              observationCode: normalizedCode,
              observationValue: obsVal,
              threshold: rule.threshold,
              severity: rule.severity,
            },
          },
        });

        generatedAlerts.push({
          id: alert.id,
          tenantId: alert.tenantId,
          carePlanId: alert.carePlanId,
          patientId: alert.patientId,
          triggeredByObservationId: alert.triggeredByObservationId,
          severity: alert.severity,
          status: alert.status,
          title: alert.title,
          message: alert.message,
          acknowledgedByMembershipId: alert.acknowledgedByMembershipId,
          acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
          resolutionNotes: alert.resolutionNotes,
          resolvedAt: alert.resolvedAt?.toISOString() ?? null,
          createdAt: alert.createdAt.toISOString(),
        });
      }
    }

    return generatedAlerts;
  }

  /**
   * The care plans a given member of staff is entitled to see on their roster.
   *
   * Returns `null` for the roles that legitimately oversee everything
   * (administrators, management), and otherwise a set of OR conditions naming
   * the plans this person is actually on. A clinician with no doctor or staff
   * profile at all matches nothing rather than everything — failing closed is
   * the only safe direction for a list of patients.
   */
  private async resolveRosterScope(
    context: WonFlowTenantRequestContext,
  ): Promise<Prisma.CarePlanWhereInput[] | null> {
    const workspace = (context.workspace ?? "").toUpperCase();
    if (workspace === "ADMIN" || workspace === "MANAGEMENT") return null;
    if (hasPermission(context, "organization.profile.manage")) return null;

    if (!context.membershipId) return [{ id: "00000000-0000-0000-0000-000000000000" }];

    const staffProfile = await database.staffProfile.findFirst({
      where: { membershipId: context.membershipId, tenantId: context.tenantId, status: "ACTIVE" },
      select: { id: true, doctor: { select: { id: true } } },
    });

    if (!staffProfile) return [{ id: "00000000-0000-0000-0000-000000000000" }];

    const conditions: Prisma.CarePlanWhereInput[] = [
      { assignedTherapistId: staffProfile.id },
      { assignedNutritionistId: staffProfile.id },
    ];

    const doctorId = staffProfile.doctor?.id;
    if (doctorId) {
      conditions.push({ managingDoctorId: doctorId });
      // A supervisor is answerable for their supervisees' plans too — the same
      // reach `requireEncounterAccess` grants in the doctor service.
      conditions.push({ managingDoctor: { supervisorDoctorId: doctorId } });
    }

    return conditions;
  }

  async listActiveCarePlanRoster(
    requestContext: WonFlowRequestContext,
  ): Promise<CarePlanRosterItem[]> {
    const context = requireTenantContext(requestContext);

    /*
     * Whose roster this is.
     *
     * The query filtered on tenant and status alone, so it answered with every
     * active care plan in the hospital regardless of who asked. Each doctor
     * saw every other doctor's plans, and a physiotherapist or dietitian saw
     * the whole hospital's caseload rather than the patients actually referred
     * to them — the patient's name, number and clinical progress along with
     * it.
     *
     * A clinician now gets the plans they are responsible for: the doctor
     * managing it (or supervising the doctor who does), and the therapist or
     * dietitian named on it. Administrators and management keep the full view,
     * which is the whole point of those roles.
     */
    const scope = await this.resolveRosterScope(context);

    const plans = await database.carePlan.findMany({
      where: {
        tenantId: context.tenantId,
        status: "ACTIVE",
        ...(scope ? { OR: scope } : {}),
      },
      include: {
        patient: true,
        template: true,
        managingDoctor: {
          include: {
            staffProfile: {
              include: {
                membership: true,
              },
            },
          },
        },
        assignedTherapist: {
          include: {
            membership: true,
          },
        },
        assignedNutritionist: {
          include: {
            membership: true,
          },
        },
        tasks: {
          orderBy: { scheduledFor: "asc" },
        },
        alerts: {
          where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const todayYmd = now.toISOString().split("T")[0];

    return plans.map((plan) => {
      const start = new Date(plan.startDate);
      const diffDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
      const totalDays = plan.template?.durationDays || 14;
      const stages = (plan.template?.stages as unknown as CarePlanStageDefinition[]) || [];
      const totalStages = Math.max(1, stages.length || 3);

      const todayTasks = plan.tasks.filter((t) => t.scheduledFor.toISOString().split("T")[0] === todayYmd);
      const todayCompletedTasks = todayTasks.filter((t) => t.status === "COMPLETED").length;
      const todayTotalTasks = todayTasks.length;

      let highestAlertSeverity: CarePlanAlertSeverity | "NONE" = "NONE";
      if (plan.alerts.some((a) => a.severity === "CRITICAL")) {
        highestAlertSeverity = "CRITICAL";
      } else if (plan.alerts.some((a) => a.severity === "HIGH")) {
        highestAlertSeverity = "HIGH";
      } else if (plan.alerts.some((a) => a.severity === "MEDIUM")) {
        highestAlertSeverity = "MEDIUM";
      } else if (plan.alerts.some((a) => a.severity === "LOW")) {
        highestAlertSeverity = "LOW";
      }

      // Check last observed tasks for summary snippets
      const completedVitals = plan.tasks
        .filter((t) => t.taskType === "VITALS_LOG" && t.status === "COMPLETED" && t.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

      let lastVitalsSummary: string | null = null;
      if (completedVitals?.resultData) {
        const d = completedVitals.resultData as Record<string, unknown>;
        lastVitalsSummary = `BP ${d.systolic || 120}/${d.diastolic || 80} mmHg, HR ${d.heartRate || 72} bpm`;
      }

      const completedDrain = plan.tasks
        .filter((t) => t.taskType === "DRAIN_LOG" && t.status === "COMPLETED" && t.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

      let lastDrainSummary: string | null = null;
      if (completedDrain?.resultData) {
        const d = completedDrain.resultData as Record<string, unknown>;
        lastDrainSummary = `${d.volume || 45} mL (${d.character || "serosanguineous"})`;
      }

      const completedWound = plan.tasks
        .filter((t) => t.taskType === "WOUND_PHOTO" && t.status === "COMPLETED" && t.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

      let lastWoundSummary: string | null = null;
      if (completedWound?.resultData) {
        const d = completedWound.resultData as Record<string, unknown>;
        lastWoundSummary = d.redness || d.swelling ? "Mild inflammation reported" : "Clean & intact";
      }

      const doctorName =
        plan.managingDoctor?.staffProfile?.membership?.displayName || "Managing Doctor";

      return {
        id: plan.id,
        tenantId: plan.tenantId,
        patientId: plan.patientId,
        patientNumber: plan.patient.patientNumber,
        patientName: `${plan.patient.givenName} ${plan.patient.familyName}`,
        title: plan.title,
        category: plan.category,
        status: plan.status,
        startDate: plan.startDate.toISOString(),
        endDate: plan.endDate?.toISOString() ?? null,
        currentDayNumber: Math.min(diffDays, totalDays),
        totalDays,
        currentStage: plan.currentStage,
        totalStages,
        todayCompletedTasks,
        todayTotalTasks,
        highestAlertSeverity,
        activeAlertCount: plan.alerts.length,
        managingDoctorName: doctorName,
        assignedTherapistName: plan.assignedTherapist?.membership?.displayName || null,
        assignedNutritionistName: plan.assignedNutritionist?.membership?.displayName || null,
        lastVitalsSummary,
        lastDrainSummary,
        lastWoundSummary,
        lastActiveAt: plan.updatedAt.toISOString(),
      };
    });
  }

  async acknowledgeAlert(
    requestContext: WonFlowRequestContext,
    alertId: string,
    notes?: string,
  ): Promise<CarePlanAlertSummary> {
    const context = requireTenantContext(requestContext);

    const alert = await database.carePlanAlert.findFirst({
      where: { id: alertId, tenantId: context.tenantId },
    });

    if (!alert) {
      throw new WonFlowApiError(404, "alert-not-found", "Care plan alert not found.");
    }

    const updated = await database.carePlanAlert.update({
      where: { id: alert.id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedByMembershipId: toUuid(context.membershipId),
        acknowledgedAt: new Date(),
        resolutionNotes: notes?.trim() || null,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: "clinical.careplan.alert_acknowledged",
        entityType: "careplan-alert",
        entityId: alert.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
        metadata: {
          carePlanId: alert.carePlanId,
          patientId: alert.patientId,
          notes,
        },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      carePlanId: updated.carePlanId,
      patientId: updated.patientId,
      triggeredByObservationId: updated.triggeredByObservationId,
      severity: updated.severity,
      status: updated.status,
      title: updated.title,
      message: updated.message,
      acknowledgedByMembershipId: updated.acknowledgedByMembershipId,
      acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
      resolutionNotes: updated.resolutionNotes,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async resolveAlert(
    requestContext: WonFlowRequestContext,
    alertId: string,
    notes?: string,
  ): Promise<CarePlanAlertSummary> {
    const context = requireTenantContext(requestContext);

    const alert = await database.carePlanAlert.findFirst({
      where: { id: alertId, tenantId: context.tenantId },
    });

    if (!alert) {
      throw new WonFlowApiError(404, "alert-not-found", "Care plan alert not found.");
    }

    const updated = await database.carePlanAlert.update({
      where: { id: alert.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionNotes: notes?.trim() || alert.resolutionNotes || "Alert resolved by clinician.",
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: "clinical.careplan.alert_resolved",
        entityType: "careplan-alert",
        entityId: alert.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
        metadata: {
          carePlanId: alert.carePlanId,
          patientId: alert.patientId,
          notes,
        },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      carePlanId: updated.carePlanId,
      patientId: updated.patientId,
      triggeredByObservationId: updated.triggeredByObservationId,
      severity: updated.severity,
      status: updated.status,
      title: updated.title,
      message: updated.message,
      acknowledgedByMembershipId: updated.acknowledgedByMembershipId,
      acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
      resolutionNotes: updated.resolutionNotes,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async addProgressNote(
    requestContext: WonFlowRequestContext,
    carePlanId: string,
    note: string,
  ): Promise<CarePlanSummary> {
    const context = requireTenantContext(requestContext);

    if (!note?.trim()) {
      throw new WonFlowApiError(400, "empty-note", "Progress note cannot be empty.");
    }

    const plan = await database.carePlan.findFirst({
      where: { id: carePlanId, tenantId: context.tenantId },
    });

    if (!plan) {
      throw new WonFlowApiError(404, "care-plan-not-found", "Care plan not found.");
    }

    let authorName = "Clinical Staff";
    if (context.membershipId) {
      const membership = await database.tenantMembership.findUnique({
        where: { id: context.membershipId },
      });
      if (membership) {
        authorName = membership.displayName;
      }
    }

    const existingNotes = (plan.progressNotes as unknown as Array<Record<string, unknown>>) || [];
    const newNote = {
      timestamp: new Date().toISOString(),
      authorIdentityId: context.identityId,
      authorName,
      note: note.trim(),
    };

    await database.carePlan.update({
      where: { id: plan.id },
      data: {
        progressNotes: [...existingNotes, newNote] as unknown as Prisma.InputJsonValue,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        branchId: toUuid(context.branchId),
        actorMembershipId: toUuid(context.membershipId),
        sessionId: toUuid(context.sessionId),
        requestId: context.requestId,
        action: "clinical.careplan.progress_note_added",
        entityType: "careplan",
        entityId: plan.id,
        severity: "INFORMATION",
        sourceApplication: context.sourceApplication,
      },
    });

    return this.getPlan(requestContext, plan.id);
  }
}

export const carePlanService = new CarePlanService();
