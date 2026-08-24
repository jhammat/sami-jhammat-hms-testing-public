import { database } from "@wonflow/database";
import { WonFlowApiError } from "@/server/http/route-handler";
import type {
  AssignEducationInput,
  ClinicianEducationComplianceSummary,
  CompleteEducationInput,
  CreateEducationContentInput,
  EducationAssignmentItem,
  EducationComprehensionQuestion,
  EducationContentItem,
  EducationContentType,
  PatientEducationLibrary,
  UpdateEducationContentInput,
  WonFlowRequestContext,
} from "@wonflow/contracts";
import type { Prisma } from "@wonflow/database";

function toUuid(val: string | null | undefined): string | null {
  if (!val) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  return isUuid ? val : null;
}

export class EducationService {
  /**
   * Creates a new educational module in the practice library.
   */
  async createContent(
    rc: WonFlowRequestContext,
    input: CreateEducationContentInput,
  ): Promise<EducationContentItem> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }
    if (!input.title?.trim()) {
      throw new WonFlowApiError(400, "title-required", "Content title is required.");
    }
    if (!input.category?.trim()) {
      throw new WonFlowApiError(400, "category-required", "Category is required.");
    }

    const created = await database.educationContent.create({
      data: {
        tenantId: rc.tenantId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category.trim(),
        contentType: input.contentType || "ARTICLE",
        url: input.url?.trim() || null,
        documentId: toUuid(input.documentId),
        durationSeconds: input.durationSeconds ?? null,
        language: (input.language || "en").toLowerCase(),
        isActive: input.isActive ?? true,
        displayOrder: input.displayOrder ?? 0,
        hasComprehensionCheck: Boolean(input.hasComprehensionCheck),
        comprehensionQuestions: input.comprehensionQuestions
          ? (input.comprehensionQuestions as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId,
        action: "clinical.education_content.created",
        entityType: "education-content",
        entityId: created.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          title: created.title,
          category: created.category,
          contentType: created.contentType,
          language: created.language,
        },
      },
    });

    return this.mapContentItem(created);
  }

  /**
   * Updates an existing educational module.
   */
  async updateContent(
    rc: WonFlowRequestContext,
    contentId: string,
    input: UpdateEducationContentInput,
  ): Promise<EducationContentItem> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const existing = await database.educationContent.findFirst({
      where: { id: contentId, tenantId: rc.tenantId },
    });
    if (!existing) {
      throw new WonFlowApiError(404, "content-not-found", "Educational content module not found.");
    }

    const updated = await database.educationContent.update({
      where: { id: contentId },
      data: {
        title: input.title !== undefined ? input.title.trim() : undefined,
        description: input.description !== undefined ? input.description?.trim() || null : undefined,
        category: input.category !== undefined ? input.category.trim() : undefined,
        contentType: input.contentType !== undefined ? input.contentType : undefined,
        url: input.url !== undefined ? input.url?.trim() || null : undefined,
        documentId: input.documentId !== undefined ? toUuid(input.documentId) : undefined,
        durationSeconds: input.durationSeconds !== undefined ? input.durationSeconds : undefined,
        language: input.language !== undefined ? input.language.toLowerCase() : undefined,
        isActive: input.isActive !== undefined ? input.isActive : undefined,
        displayOrder: input.displayOrder !== undefined ? input.displayOrder : undefined,
        hasComprehensionCheck:
          input.hasComprehensionCheck !== undefined ? input.hasComprehensionCheck : undefined,
        comprehensionQuestions:
          input.comprehensionQuestions !== undefined
            ? (input.comprehensionQuestions as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId,
        action: "clinical.education_content.updated",
        entityType: "education-content",
        entityId: updated.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
      },
    });

    return this.mapContentItem(updated);
  }

  /**
   * Retires (archives/deactivates) or reactivates an educational module.
   */
  async retireContent(
    rc: WonFlowRequestContext,
    contentId: string,
    isActive = false,
  ): Promise<EducationContentItem> {
    return this.updateContent(rc, contentId, { isActive });
  }

  /**
   * Lists practice education modules with optional filters.
   */
  async listPracticeContent(
    rc: WonFlowRequestContext,
    query?: { category?: string; language?: string; includeInactive?: boolean },
  ): Promise<EducationContentItem[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const where: Prisma.EducationContentWhereInput = {
      tenantId: rc.tenantId,
      ...(query?.includeInactive ? {} : { isActive: true }),
      ...(query?.category ? { category: { equals: query.category, mode: "insensitive" } } : {}),
      ...(query?.language ? { language: query.language.toLowerCase() } : {}),
    };

    const items = await database.educationContent.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return items.map((i) => this.mapContentItem(i));
  }

  /**
   * Assigns an educational module to a patient.
   */
  async assignContent(
    rc: WonFlowRequestContext,
    input: AssignEducationInput,
  ): Promise<EducationAssignmentItem> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }
    if (!input.patientId) {
      throw new WonFlowApiError(400, "patient-required", "Patient ID is required.");
    }
    if (!input.contentId) {
      throw new WonFlowApiError(400, "content-required", "Content ID is required.");
    }

    const patient = await database.patient.findFirst({
      where: { id: input.patientId, tenantId: rc.tenantId },
    });
    if (!patient) {
      throw new WonFlowApiError(404, "patient-not-found", "Patient record not found.");
    }

    const content = await database.educationContent.findFirst({
      where: { id: input.contentId, tenantId: rc.tenantId, isActive: true },
    });
    if (!content) {
      throw new WonFlowApiError(404, "content-not-found", "Active education content not found.");
    }

    const assignment = await database.educationAssignment.create({
      data: {
        tenantId: rc.tenantId,
        patientId: input.patientId,
        contentId: input.contentId,
        assignedByMembershipId: toUuid(rc.membershipId),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        carePlanTaskId: toUuid(input.carePlanTaskId),
      },
      include: {
        content: true,
        patient: true,
        assignedBy: true,
        completions: {
          include: { completedBy: true },
          orderBy: { completedAt: "desc" },
        },
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId,
        action: "clinical.education_assignment.created",
        entityType: "education-assignment",
        entityId: assignment.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          patientId: input.patientId,
          contentId: input.contentId,
          contentTitle: content.title,
          dueDate: input.dueDate || null,
        },
      },
    });

    return this.mapAssignmentItem(assignment);
  }

  /**
   * Lists education assignments for a given patient.
   */
  async listPatientAssignments(
    rc: WonFlowRequestContext,
    patientId: string,
  ): Promise<EducationAssignmentItem[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const assignments = await database.educationAssignment.findMany({
      where: { tenantId: rc.tenantId, patientId },
      include: {
        content: true,
        patient: true,
        assignedBy: true,
        completions: {
          include: { completedBy: true },
          orderBy: { completedAt: "desc" },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    return assignments.map((a) => this.mapAssignmentItem(a));
  }

  /**
   * Resolves patient identity and returns assigned & available education library.
   */
  async getPatientEducationLibrary(
    rc: WonFlowRequestContext,
    languagePreference?: string,
  ): Promise<PatientEducationLibrary> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }
    if (!rc.identityId) {
      throw new WonFlowApiError(401, "unauthorized", "Identity is required.");
    }

    // Resolve patient access
    const patientAccess = await database.patientAccess.findFirst({
      where: { identityId: rc.identityId, isActive: true },
      include: { patient: true },
    });
    if (!patientAccess) {
      throw new WonFlowApiError(403, "forbidden", "No active patient profile linked to this account.");
    }

    const patientId = patientAccess.patientId;
    const selectedLanguage = (languagePreference || "en").toLowerCase();

    // 1. Get assigned education items
    const assignments = await database.educationAssignment.findMany({
      where: { tenantId: rc.tenantId, patientId },
      include: {
        content: true,
        patient: true,
        assignedBy: true,
        completions: {
          include: { completedBy: true },
          orderBy: { completedAt: "desc" },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    const assignedItems = assignments.map((a) => this.mapAssignmentItem(a));
    const assignedContentIds = new Set(assignments.map((a) => a.contentId));

    // 2. Get available unassigned content in library
    const availableContent = await database.educationContent.findMany({
      where: {
        tenantId: rc.tenantId,
        isActive: true,
        id: { notIn: Array.from(assignedContentIds) },
        language: selectedLanguage,
      },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    });

    const availableItems = availableContent.map((c) => this.mapContentItem(c));

    return {
      assigned: assignedItems,
      available: availableItems,
      selectedLanguage,
    };
  }

  /**
   * Records completion of an educational assignment by patient or caregiver.
   */
  async completeAssignment(
    rc: WonFlowRequestContext,
    input: CompleteEducationInput,
  ): Promise<EducationAssignmentItem> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }
    if (!rc.identityId) {
      throw new WonFlowApiError(401, "unauthorized", "Identity is required.");
    }
    if (!input.assignmentId) {
      throw new WonFlowApiError(400, "assignment-required", "Assignment ID is required.");
    }

    const assignment = await database.educationAssignment.findFirst({
      where: { id: input.assignmentId, tenantId: rc.tenantId },
      include: { content: true },
    });
    if (!assignment) {
      throw new WonFlowApiError(404, "assignment-not-found", "Education assignment not found.");
    }

    // Evaluate comprehension check if present
    let comprehensionPassed: boolean | null = null;
    let comprehensionScore: number | null = null;

    if (assignment.content.hasComprehensionCheck && assignment.content.comprehensionQuestions) {
      const questions = assignment.content
        .comprehensionQuestions as unknown as EducationComprehensionQuestion[];
      if (Array.isArray(questions) && questions.length > 0) {
        let correctCount = 0;
        const answers = input.selectedAnswers || {};
        for (const q of questions) {
          if (answers[q.id] === q.correctIndex) {
            correctCount++;
          }
        }
        comprehensionScore = Math.round((correctCount / questions.length) * 100);
        comprehensionPassed = correctCount === questions.length; // all questions must pass for critical safety
      }
    }

    await database.educationCompletion.create({
      data: {
        assignmentId: assignment.id,
        completedByIdentityId: rc.identityId,
        watchedSeconds: input.watchedSeconds ?? null,
        comprehensionPassed,
        comprehensionScore,
      },
    });

    // If assignment is linked to carePlanTaskId, update task if applicable
    if (assignment.carePlanTaskId) {
      await database.carePlanTask
        .update({
          where: { id: assignment.carePlanTaskId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            completedByIdentityId: rc.identityId,
            resultData: {
              educationAssignmentId: assignment.id,
              contentTitle: assignment.content.title,
              comprehensionPassed,
              watchedSeconds: input.watchedSeconds ?? null,
            },
          },
        })
        .catch(() => {
          // If task update fails, continue
        });
    }

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId,
        action: "clinical.education_assignment.completed",
        entityType: "education-assignment",
        entityId: assignment.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          patientId: assignment.patientId,
          contentTitle: assignment.content.title,
          comprehensionPassed,
          watchedSeconds: input.watchedSeconds ?? null,
        },
      },
    });

    // Re-fetch updated assignment
    const updated = await database.educationAssignment.findFirstOrThrow({
      where: { id: assignment.id },
      include: {
        content: true,
        patient: true,
        assignedBy: true,
        completions: {
          include: { completedBy: true },
          orderBy: { completedAt: "desc" },
        },
      },
    });

    return this.mapAssignmentItem(updated);
  }

  /**
   * Generates compliance summary for clinician dashboard.
   */
  async getClinicianComplianceSummary(
    rc: WonFlowRequestContext,
  ): Promise<ClinicianEducationComplianceSummary> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const assignments = await database.educationAssignment.findMany({
      where: { tenantId: rc.tenantId },
      include: {
        content: true,
        patient: true,
        assignedBy: true,
        completions: {
          include: { completedBy: true },
          orderBy: { completedAt: "desc" },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    const items = assignments.map((a) => this.mapAssignmentItem(a));

    let completedCount = 0;
    let overdueCount = 0;
    let overduePreOpCount = 0;
    const urgentPendingAssignments: EducationAssignmentItem[] = [];

    for (const item of items) {
      if (item.isCompleted) {
        completedCount++;
      } else {
        if (item.isOverdue) {
          overdueCount++;
        }
        if (item.isPreOp) {
          overduePreOpCount++;
        }
        if (item.isOverdue || item.isPreOp) {
          urgentPendingAssignments.push(item);
        }
      }
    }

    const totalAssigned = items.length;
    const outstandingCount = totalAssigned - completedCount;
    const complianceRatePercentage =
      totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 100;

    return {
      totalAssigned,
      completedCount,
      outstandingCount,
      overdueCount,
      overduePreOpCount,
      complianceRatePercentage,
      urgentPendingAssignments,
      allAssignments: items,
    };
  }

  private mapContentItem(c: {
    id: string;
    tenantId: string;
    title: string;
    description: string | null;
    category: string;
    contentType: EducationContentType;
    url: string | null;
    documentId: string | null;
    durationSeconds: number | null;
    language: string;
    isActive: boolean;
    displayOrder: number;
    hasComprehensionCheck: boolean;
    comprehensionQuestions: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): EducationContentItem {
    return {
      id: c.id,
      tenantId: c.tenantId,
      title: c.title,
      description: c.description,
      category: c.category,
      contentType: c.contentType,
      url: c.url,
      documentId: c.documentId,
      durationSeconds: c.durationSeconds,
      language: c.language,
      isActive: c.isActive,
      displayOrder: c.displayOrder,
      hasComprehensionCheck: c.hasComprehensionCheck,
      comprehensionQuestions: c.comprehensionQuestions
        ? (c.comprehensionQuestions as unknown as EducationComprehensionQuestion[])
        : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private mapAssignmentItem(a: {
    id: string;
    tenantId: string;
    patientId: string;
    patient?: { givenName: string; familyName: string; patientNumber: string } | null;
    contentId: string;
    content: {
      id: string;
      tenantId: string;
      title: string;
      description: string | null;
      category: string;
      contentType: EducationContentType;
      url: string | null;
      documentId: string | null;
      durationSeconds: number | null;
      language: string;
      isActive: boolean;
      displayOrder: number;
      hasComprehensionCheck: boolean;
      comprehensionQuestions: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    };
    assignedByMembershipId: string | null;
    assignedBy?: { displayName: string } | null;
    assignedAt: Date;
    dueDate: Date | null;
    carePlanTaskId: string | null;
    completions?: Array<{
      id: string;
      completedAt: Date;
      completedByIdentityId: string;
      completedBy?: { email: string } | null;
      watchedSeconds: number | null;
      comprehensionPassed: boolean | null;
      comprehensionScore: number | null;
    }>;
    createdAt: Date;
  }): EducationAssignmentItem {
    const latestCompletion = a.completions && a.completions.length > 0 ? a.completions[0] : null;
    const isCompleted = Boolean(latestCompletion);
    const now = new Date();
    const isOverdue = !isCompleted && a.dueDate !== null && new Date(a.dueDate) < now;
    const catLower = a.content.category.toLowerCase();
    const titleLower = a.content.title.toLowerCase();
    const isPreOp =
      catLower.includes("pre-op") ||
      catLower.includes("preoperative") ||
      catLower.includes("preparation") ||
      titleLower.includes("pre-op");

    const patientFullName = a.patient ? `${a.patient.givenName} ${a.patient.familyName}`.trim() : undefined;

    return {
      id: a.id,
      tenantId: a.tenantId,
      patientId: a.patientId,
      patientName: patientFullName,
      patientNumber: a.patient?.patientNumber,
      contentId: a.contentId,
      content: this.mapContentItem(a.content),
      assignedByMembershipId: a.assignedByMembershipId,
      assignedByName: a.assignedBy?.displayName ?? null,
      assignedAt: a.assignedAt.toISOString(),
      dueDate: a.dueDate?.toISOString() ?? null,
      carePlanTaskId: a.carePlanTaskId,
      isCompleted,
      isOverdue,
      isPreOp,
      completion: latestCompletion
        ? {
            id: latestCompletion.id,
            completedAt: latestCompletion.completedAt.toISOString(),
            completedByIdentityId: latestCompletion.completedByIdentityId,
            completedByName: latestCompletion.completedBy?.email,
            watchedSeconds: latestCompletion.watchedSeconds,
            comprehensionPassed: latestCompletion.comprehensionPassed,
            comprehensionScore: latestCompletion.comprehensionScore,
          }
        : null,
      createdAt: a.createdAt.toISOString(),
    };
  }
}

export const educationService = new EducationService();
