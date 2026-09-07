import { database } from "@wonflow/database";
import { WonFlowApiError } from "@/server/http/route-handler";
import type {
  GenerateMedicationRemindersInput,
  MedicationAdherenceSummary,
  MedicationDoseItem,
  MedicationScheduleSummary,
  WonFlowRequestContext,
} from "@wonflow/contracts";

function toUuid(val: string | null | undefined): string | null {
  if (!val) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : null;
}

interface DoseTimeSlot {
  hour: number;
  minute: number;
  label: string;
  isWithMeals?: boolean;
}

function resolveDoseSlots(frequencyStr: string): DoseTimeSlot[] {
  const norm = frequencyStr.toUpperCase().replace(/\s+/g, "_");

  if (norm.includes("WITH_MEAL") || norm.includes("MEAL") || norm.includes("CREON")) {
    return [
      { hour: 8, minute: 30, label: "Breakfast (with first bite)", isWithMeals: true },
      { hour: 13, minute: 0, label: "Lunch (with first bite)", isWithMeals: true },
      { hour: 19, minute: 30, label: "Dinner (with first bite)", isWithMeals: true },
    ];
  }

  if (norm.includes("FOUR") || norm.includes("QID") || norm.includes("QDS") || norm.includes("4_TIMES")) {
    return [
      { hour: 8, minute: 0, label: "Morning" },
      { hour: 12, minute: 0, label: "Noon" },
      { hour: 16, minute: 0, label: "Afternoon" },
      { hour: 20, minute: 0, label: "Night" },
    ];
  }

  if (norm.includes("THREE") || norm.includes("TID") || norm.includes("TDS") || norm.includes("3_TIMES")) {
    return [
      { hour: 8, minute: 0, label: "Morning" },
      { hour: 14, minute: 0, label: "Afternoon" },
      { hour: 20, minute: 0, label: "Night" },
    ];
  }

  if (norm.includes("TWICE") || norm.includes("BID") || norm.includes("BD") || norm.includes("2_TIMES")) {
    return [
      { hour: 9, minute: 0, label: "Morning" },
      { hour: 21, minute: 0, label: "Evening" },
    ];
  }

  // Default: Once Daily
  return [{ hour: 9, minute: 0, label: "Morning" }];
}

export class MedicationAdherenceService {
  /**
   * Generates care plan medication reminder tasks from an active prescription.
   */
  async generateMedicationTasksFromPrescription(
    rc: WonFlowRequestContext,
    input: GenerateMedicationRemindersInput,
  ): Promise<{ tasksCreated: number; carePlanId: string }> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const prescription = await database.prescription.findFirst({
      where: {
        id: input.prescriptionId,
        tenantId: rc.tenantId,
      },
      include: {
        items: {
          include: {
            medication: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new WonFlowApiError(404, "prescription-not-found", "Prescription not found.");
    }

    // Find or create active CarePlan for the patient
    let carePlanId = input.carePlanId;
    if (!carePlanId) {
      const activePlan = await database.carePlan.findFirst({
        where: {
          tenantId: rc.tenantId,
          patientId: prescription.patientId,
          status: "ACTIVE",
        },
      });

      if (activePlan) {
        carePlanId = activePlan.id;
      } else {
        const newPlan = await database.carePlan.create({
          data: {
            tenantId: rc.tenantId,
            patientId: prescription.patientId,
            managingDoctorId: prescription.doctorId,
            category: "POST_OPERATIVE",
            title: "Post-Discharge Medication & Recovery Schedule",
            currentStage: 1,
            status: "ACTIVE",
            startDate: new Date(),
            endDate: new Date(Date.now() + (input.durationDays || 14) * 86_400_000),
          },
        });


        carePlanId = newPlan.id;
      }
    }

    const durationDays = input.durationDays || 7;
    let tasksCreated = 0;
    const now = new Date();

    for (const item of prescription.items) {
      const medName = item.medication?.brandName
        ? `${item.medication.brandName} (${item.medication.genericName})`
        : item.medication?.genericName || "Medication";


      const slots = resolveDoseSlots(item.frequency);

      for (let day = 1; day <= durationDays; day++) {
        const baseDay = new Date(now);
        baseDay.setDate(baseDay.getDate() + (day - 1));

        for (const slot of slots) {
          const scheduledFor = new Date(baseDay);
          scheduledFor.setHours(slot.hour, slot.minute, 0, 0);

          const dueBy = new Date(scheduledFor);
          dueBy.setHours(dueBy.getHours() + 3); // 3-hour adherence grace window

          // Prevent duplicate tasks if already generated
          const existing = await database.carePlanTask.findFirst({
            where: {
              tenantId: rc.tenantId,
              carePlanId,
              taskType: "MEDICATION",
              title: `Take ${medName} ${item.dose}`,
              scheduledFor,
            },
          });
          if (existing) continue;

          await database.carePlanTask.create({
            data: {
              tenantId: rc.tenantId,
              carePlanId,
              taskType: "MEDICATION",
              stageNumber: 1,
              dayNumber: day,
              scheduledFor,
              dueBy,
              title: `Take ${medName} ${item.dose}`,
              instructions: `${slot.label} • ${item.instructions || item.route || "Oral"}`,
              status: "PENDING",
              resultData: {
                prescriptionId: prescription.id,
                prescriptionItemId: item.id,
                medicationId: item.medicationId,
                medicationName: medName,
                dose: item.dose,
                frequency: item.frequency,
                isWithMeals: !!slot.isWithMeals,
              },
            },
          });

          tasksCreated++;
        }
      }
    }

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId || crypto.randomUUID(),
        action: "clinical.medication.reminders_generated",
        entityType: "prescription",
        entityId: prescription.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          patientId: prescription.patientId,
          carePlanId,
          tasksCreated,
          durationDays,
        },
      },
    });

    return { tasksCreated, carePlanId };
  }

  /**
   * Retrieves today's medication schedule for the patient.
   */
  async getPatientMedicationSchedule(
    rc: WonFlowRequestContext,
    patientId: string,
    targetDate?: Date,
  ): Promise<MedicationScheduleSummary> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const date = targetDate || new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let tasks = await database.carePlanTask.findMany({
      where: {
        tenantId: rc.tenantId,
        carePlan: { patientId },
        taskType: "MEDICATION",
        scheduledFor: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { scheduledFor: "asc" },
    });

    if (tasks.length === 0) {
      // If no tasks exist for this target date, check for active prescriptions and auto-generate daily doses
      const activePrescriptions = await database.prescription.findMany({
        where: {
          tenantId: rc.tenantId,
          patientId,
          status: { in: ["ACTIVE", "DISPENSED", "PARTIALLY_DISPENSED"] },
        },
        include: {
          items: {
            include: {
              medication: true,
            },
          },
        },
      });

      if (activePrescriptions.length > 0) {
        for (const rx of activePrescriptions) {
          try {
            await this.generateMedicationTasksFromPrescription(rc, {
              prescriptionId: rx.id,
              durationDays: 7,
            });
          } catch {
            // Ignore if already generated or concurrent
          }
        }

        tasks = await database.carePlanTask.findMany({
          where: {
            tenantId: rc.tenantId,
            carePlan: { patientId },
            taskType: "MEDICATION",
            scheduledFor: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { scheduledFor: "asc" },
        });
      }
    }

    const now = new Date();
    const todayDoses: MedicationDoseItem[] = tasks.map((t) => {
      const res = (t.resultData || {}) as Record<string, unknown>;
      let status = t.status as "PENDING" | "COMPLETED" | "SKIPPED" | "MISSED";

      // Mark overdue as MISSED only if the scheduled day has passed
      if (status === "PENDING" && now > endOfDay) {
        status = "MISSED";
      }


      return {
        id: t.id,
        medicationName: String(res.medicationName || t.title),
        dose: String(res.dose || ""),
        frequency: String(res.frequency || ""),
        route: String(res.route || ""),
        scheduledFor: t.scheduledFor.toISOString(),
        dueBy: t.dueBy?.toISOString() ?? null,
        status,
        completedAt: t.completedAt?.toISOString() ?? null,
        skipReason: t.skipReason,
        instructions: t.instructions,
        isWithMeals: !!res.isWithMeals,
      };
    });

    const takenCount = todayDoses.filter((d) => d.status === "COMPLETED").length;
    const skippedCount = todayDoses.filter((d) => d.status === "SKIPPED").length;
    const missedCount = todayDoses.filter((d) => d.status === "MISSED").length;
    const pendingCount = todayDoses.filter((d) => d.status === "PENDING").length;

    const totalResolved = takenCount + skippedCount + missedCount;
    const adherencePercentage =
      totalResolved > 0 ? Math.round((takenCount / totalResolved) * 100) : 100;

    return {
      patientId,
      date: startOfDay.toISOString().split("T")[0]!,
      todayDoses,
      takenCount,
      pendingCount,
      skippedCount,
      missedCount,
      adherencePercentage,
    };
  }

  /**
   * One-tap recording of dose taken.
   */
  async recordDoseTaken(
    rc: WonFlowRequestContext,
    taskId: string,
    completedAt?: Date,
  ): Promise<MedicationDoseItem> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const task = await database.carePlanTask.findFirst({
      where: { id: taskId, tenantId: rc.tenantId },
    });

    if (!task) {
      throw new WonFlowApiError(404, "task-not-found", "Medication dose task not found.");
    }

    const doneAt = completedAt || new Date();
    const updated = await database.carePlanTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        completedAt: doneAt,
        completedByIdentityId: toUuid(rc.identityId || rc.userId),
        skipReason: null,
      },
    });

    const res = (updated.resultData || {}) as Record<string, unknown>;
    return {
      id: updated.id,
      medicationName: String(res.medicationName || updated.title),
      dose: String(res.dose || ""),
      frequency: String(res.frequency || ""),
      scheduledFor: updated.scheduledFor.toISOString(),
      dueBy: updated.dueBy?.toISOString() ?? null,
      status: "COMPLETED",
      completedAt: updated.completedAt?.toISOString() ?? null,
      skipReason: null,
      instructions: updated.instructions,
    };
  }

  /**
   * Non-judgmental recording of skipped dose.
   */
  async recordDoseSkipped(
    rc: WonFlowRequestContext,
    taskId: string,
    reason: string,
  ): Promise<MedicationDoseItem> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const task = await database.carePlanTask.findFirst({
      where: { id: taskId, tenantId: rc.tenantId },
    });

    if (!task) {
      throw new WonFlowApiError(404, "task-not-found", "Medication dose task not found.");
    }

    const updated = await database.carePlanTask.update({
      where: { id: task.id },
      data: {
        status: "SKIPPED",
        skipReason: reason.trim(),
        completedAt: new Date(),
        completedByIdentityId: toUuid(rc.identityId || rc.userId),
      },
    });

    const res = (updated.resultData || {}) as Record<string, unknown>;
    return {
      id: updated.id,
      medicationName: String(res.medicationName || updated.title),
      dose: String(res.dose || ""),
      frequency: String(res.frequency || ""),
      scheduledFor: updated.scheduledFor.toISOString(),
      dueBy: updated.dueBy?.toISOString() ?? null,
      status: "SKIPPED",
      completedAt: updated.completedAt?.toISOString() ?? null,
      skipReason: updated.skipReason,
      instructions: updated.instructions,
    };
  }

  /**
   * Clinician adherence summary per medication over all care plan tasks.
   */
  async getClinicianAdherenceReport(
    rc: WonFlowRequestContext,
    patientId: string,
  ): Promise<MedicationAdherenceSummary[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const tasks = await database.carePlanTask.findMany({
      where: {
        tenantId: rc.tenantId,
        carePlan: { patientId },
        taskType: "MEDICATION",
      },
      orderBy: { scheduledFor: "asc" },
    });

    const now = new Date();
    const grouped = new Map<string, typeof tasks>();

    for (const t of tasks) {
      const res = (t.resultData || {}) as Record<string, unknown>;
      const medKey = String(res.medicationName || t.title);
      const list = grouped.get(medKey) ?? [];
      list.push(t);
      grouped.set(medKey, list);
    }

    const summaries: MedicationAdherenceSummary[] = [];

    for (const [medName, medTasks] of grouped.entries()) {
      const sampleRes = (medTasks[0]?.resultData || {}) as Record<string, unknown>;
      let takenDoses = 0;
      let skippedDoses = 0;
      let missedDoses = 0;

      const recentDoses = medTasks.map((t) => {
        let status = t.status as "PENDING" | "COMPLETED" | "SKIPPED" | "MISSED";
        if (status === "PENDING" && t.dueBy && now > t.dueBy) {
          status = "MISSED";
        }

        if (status === "COMPLETED") takenDoses++;
        else if (status === "SKIPPED") skippedDoses++;
        else if (status === "MISSED") missedDoses++;

        return {
          id: t.id,
          scheduledFor: t.scheduledFor.toISOString(),
          status,
          completedAt: t.completedAt?.toISOString() ?? null,
          skipReason: t.skipReason,
        };
      });

      const totalDoses = medTasks.length;
      const evaluatedDoses = takenDoses + skippedDoses + missedDoses;
      const adherenceRate =
        evaluatedDoses > 0 ? Math.round((takenDoses / evaluatedDoses) * 100) : 100;

      summaries.push({
        medicationId: sampleRes.medicationId ? String(sampleRes.medicationId) : undefined,
        medicationName: medName,
        dose: String(sampleRes.dose || ""),
        frequency: String(sampleRes.frequency || ""),
        totalPrescribedDoses: totalDoses,
        takenDoses,
        skippedDoses,
        missedDoses,
        adherenceRate,
        recentDoses,
      });
    }

    return summaries;
  }
}

export const medicationAdherenceService = new MedicationAdherenceService();
