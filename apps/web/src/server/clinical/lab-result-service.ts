import { database } from "@wonflow/database";
import { WonFlowApiError } from "@/server/http/route-handler";
import type {
  LabAbnormalFlag,
  LabResultEntryRoute,
  LabTrendSeries,
  MultiLabTrendGroup,
  RecordLabResultInput,
  StructuredLabResultItem,
  WonFlowRequestContext,
} from "@wonflow/contracts";
import { STANDARD_LAB_TESTS, hasPermission } from "@wonflow/contracts";

function toUuid(val: string | null | undefined): string | null {
  if (!val) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : null;
}

function computeAbnormalFlag(
  value: number,
  refLow: number,
  refHigh: number,
  criticalLow?: number,
  criticalHigh?: number,
): LabAbnormalFlag {
  if (criticalHigh !== undefined && value >= criticalHigh) return "CRITICAL_HIGH";
  if (criticalLow !== undefined && value <= criticalLow) return "CRITICAL_LOW";
  if (value > refHigh) return "HIGH";
  if (value < refLow) return "LOW";
  return "NORMAL";
}

export class LabResultService {
  /**
   * Records a structured lab result entry.
   */
  async recordLabResult(
    rc: WonFlowRequestContext,
    input: RecordLabResultInput,
  ): Promise<StructuredLabResultItem> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const testDef = STANDARD_LAB_TESTS[input.code];
    const displayName = input.displayName || testDef?.name || input.code;
    const category = input.category || testDef?.category || "General Laboratory";
    const unit = input.unit || testDef?.unit || "";
    const referenceLow =
      input.referenceLow !== undefined ? input.referenceLow : testDef?.defaultRefLow ?? 0;
    const referenceHigh =
      input.referenceHigh !== undefined ? input.referenceHigh : testDef?.defaultRefHigh ?? 100;

    const abnormalFlag = computeAbnormalFlag(
      input.value,
      referenceLow,
      referenceHigh,
      testDef?.criticalLow,
      testDef?.criticalHigh,
    );

    const isCritical = abnormalFlag === "CRITICAL_HIGH" || abnormalFlag === "CRITICAL_LOW";

    /*
     * `STAFF_ENTERED` is not a label the caller may choose for itself.
     *
     * It is the one value that sets `isConfirmedByClinician`, which stores the
     * result as FINAL with a `verifiedBy` stamp — the state the patient's own
     * screen renders as "Doctor Verified". Two things were wrong with taking
     * it from the request body. A patient or caregiver could send it and have
     * their self-reported number promoted to a clinician-verified result. And
     * any authenticated member of the tenant — a receptionist, a billing
     * clerk — fell into the `else` branch below and got the same promotion for
     * free, because nothing here asked for a permission.
     *
     * The workspace decides the floor: a patient or caregiver can only ever
     * self-report. Above that, confirming a result takes a clinical permission
     * — the laboratory's own results permission, or `encounters.manage` for
     * the clinician recording a value off an outside lab's report. Anyone else
     * may still record the value; it is simply stored unconfirmed rather than
     * being dressed up as verified.
     */
    const isPatientSide = rc.workspace === "PATIENT" || rc.workspace === "CAREGIVER";
    const mayConfirmClinically =
      !isPatientSide &&
      (hasPermission(rc, "laboratory.results.manage") || hasPermission(rc, "encounters.manage"));

    let entryRoute = input.entryRoute;
    if (entryRoute === "STAFF_ENTERED" && !mayConfirmClinically) {
      entryRoute = undefined;
    }
    if (!entryRoute) {
      if (input.documentId) {
        entryRoute = "DOCUMENT_ATTACHED";
      } else if (isPatientSide) {
        entryRoute = "PATIENT_REPORTED";
      } else if (mayConfirmClinically) {
        entryRoute = "STAFF_ENTERED";
      } else {
        entryRoute = "PATIENT_REPORTED";
      }
    }

    const isConfirmedByClinician = entryRoute === "STAFF_ENTERED";
    const collectedAt = input.collectedAt ? new Date(input.collectedAt) : new Date();

    // Find default branch for tenant if not provided
    let branchId = rc.branchId;
    if (!branchId) {
      const mainBranch = await database.branch.findFirst({
        where: { tenantId: rc.tenantId },
      });
      branchId = mainBranch?.id || null;
    }

    if (!branchId) {
      throw new WonFlowApiError(400, "branch-required", "Branch ID is required.");
    }

    // Resolve or create a DiagnosticOrder for this lab test
    const membershipIdToUse = toUuid(rc.membershipId);
    let orderedByMembershipId = membershipIdToUse;
    if (!orderedByMembershipId) {
      const anyStaff = await database.tenantMembership.findFirst({
        where: { tenantId: rc.tenantId, status: "ACTIVE" },
      });
      orderedByMembershipId = anyStaff?.id || null;
    }

    if (!orderedByMembershipId) {
      throw new WonFlowApiError(400, "staff-required", "Staff membership is required for lab order.");
    }

    const order = await database.diagnosticOrder.create({
      data: {
        tenantId: rc.tenantId,
        branchId,
        patientId: input.patientId,
        orderedByMembershipId,
        type: "LABORATORY",
        status: "COMPLETED",
        code: input.code,
        name: displayName,
        orderedAt: collectedAt,
        completedAt: collectedAt,
      },
    });

    const result = await database.diagnosticResult.create({
      data: {
        tenantId: rc.tenantId,
        orderId: order.id,
        status: isConfirmedByClinician ? "FINAL" : "PRELIMINARY",
        critical: isCritical,
        verifiedByMembershipId: isConfirmedByClinician ? membershipIdToUse : null,
        verifiedAt: isConfirmedByClinician ? new Date() : null,
        releasedByMembershipId: isConfirmedByClinician ? membershipIdToUse : null,
        releasedAt: isConfirmedByClinician ? new Date() : null,
        resultData: {
          code: input.code,
          displayName,
          category,
          value: input.value,
          unit,
          referenceLow,
          referenceHigh,
          abnormalFlag,
          collectedAt: collectedAt.toISOString(),
          sourceFacility: input.sourceFacility || "Internal Laboratory",
          entryRoute,
          isConfirmedByClinician,
          documentId: input.documentId || null,
          notes: input.notes || null,
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
        action: "clinical.lab_result.recorded",
        entityType: "diagnostic-result",
        entityId: result.id,
        severity: isCritical ? "WARNING" : "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          patientId: input.patientId,
          code: input.code,
          value: input.value,
          abnormalFlag,
          entryRoute,
          isConfirmedByClinician,
        },
      },
    });

    return {
      id: result.id,
      orderId: order.id,
      patientId: input.patientId,
      code: input.code,
      displayName,
      category,
      value: input.value,
      unit,
      referenceLow,
      referenceHigh,
      abnormalFlag,
      collectedAt: collectedAt.toISOString(),
      sourceFacility: input.sourceFacility || null,
      entryRoute,
      isConfirmedByClinician,
      confirmedByMembershipId: isConfirmedByClinician ? membershipIdToUse : null,
      confirmedAt: isConfirmedByClinician ? new Date().toISOString() : null,
      documentId: input.documentId || null,
      notes: input.notes || null,
      createdAt: result.createdAt.toISOString(),
    };
  }

  /**
   * Confirms a patient-reported lab value by clinician.
   */
  async confirmPatientLabResult(
    rc: WonFlowRequestContext,
    resultId: string,
  ): Promise<StructuredLabResultItem> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const result = await database.diagnosticResult.findFirst({
      where: { id: resultId, tenantId: rc.tenantId },
      include: { order: true },
    });

    if (!result) {
      throw new WonFlowApiError(404, "result-not-found", "Diagnostic result not found.");
    }

    const prevData = (result.resultData || {}) as Record<string, unknown>;
    const updatedData = {
      ...prevData,
      isConfirmedByClinician: true,
    };

    const updated = await database.diagnosticResult.update({
      where: { id: result.id },
      data: {
        status: "FINAL",
        verifiedByMembershipId: toUuid(rc.membershipId),
        verifiedAt: new Date(),
        releasedByMembershipId: toUuid(rc.membershipId),
        releasedAt: new Date(),
        resultData: updatedData,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId,
        action: "clinical.lab_result.confirmed",
        entityType: "diagnostic-result",
        entityId: updated.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          patientId: result.order.patientId,
          code: String(prevData.code || ""),
          value: typeof prevData.value === "number" ? prevData.value : Number(prevData.value || 0),
        },

      },
    });

    return {
      id: updated.id,
      orderId: updated.orderId,
      patientId: result.order.patientId,
      code: String(prevData.code || ""),
      displayName: String(prevData.displayName || ""),
      category: String(prevData.category || ""),
      value: Number(prevData.value || 0),
      unit: String(prevData.unit || ""),
      referenceLow: Number(prevData.referenceLow || 0),
      referenceHigh: Number(prevData.referenceHigh || 0),
      abnormalFlag: (prevData.abnormalFlag as LabAbnormalFlag) || "NORMAL",
      collectedAt: String(prevData.collectedAt || updated.createdAt.toISOString()),
      sourceFacility: prevData.sourceFacility ? String(prevData.sourceFacility) : null,
      entryRoute: (prevData.entryRoute as LabResultEntryRoute) || "PATIENT_REPORTED",
      isConfirmedByClinician: true,
      confirmedByMembershipId: updated.verifiedByMembershipId,
      confirmedAt: updated.verifiedAt?.toISOString() ?? null,
      documentId: prevData.documentId ? String(prevData.documentId) : null,
      notes: prevData.notes ? String(prevData.notes) : null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Lists structured lab results for a patient.
   *
   * `releasedOnly` is what the patient's own portal passes. Without it this
   * returned every row for the patient — `PRELIMINARY` drafts a technician was
   * still typing, and results no clinician had verified or released — straight
   * to the patient's phone. A patient reading an unverified, unmediated result
   * before their doctor has seen it is the harm the release step exists to
   * prevent, and the diagnostics module has always gated its own patient view
   * this way (`diagnostics-service.getPatientResults`).
   *
   * Clinician callers pass nothing and keep full visibility, which is correct:
   * reviewing a preliminary value is part of the job.
   */
  async listPatientLabResults(
    rc: WonFlowRequestContext,
    patientId: string,
    category?: string,
    options?: { releasedOnly?: boolean },
  ): Promise<StructuredLabResultItem[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const results = await database.diagnosticResult.findMany({
      where: {
        tenantId: rc.tenantId,
        order: { patientId },
        ...(options?.releasedOnly
          ? {
              status: { in: ["FINAL", "AMENDED", "CORRECTED"] },
              OR: [{ releasedAt: { not: null } }, { verifiedAt: { not: null } }],
            }
          : {}),
      },
      include: { order: true },
      orderBy: { createdAt: "desc" },
    });

    const items: StructuredLabResultItem[] = [];

    for (const r of results) {
      if (!r.resultData || typeof r.resultData !== "object") continue;
      const data = r.resultData as Record<string, unknown>;
      const itemCat = String(data.category || "");

      if (category && itemCat.toLowerCase() !== category.toLowerCase()) {
        continue;
      }

      items.push({
        id: r.id,
        orderId: r.orderId,
        patientId,
        code: String(data.code || r.order.code),
        displayName: String(data.displayName || r.order.name),
        category: itemCat,
        value: Number(data.value || 0),
        unit: String(data.unit || ""),
        referenceLow: Number(data.referenceLow || 0),
        referenceHigh: Number(data.referenceHigh || 0),
        abnormalFlag: (data.abnormalFlag as LabAbnormalFlag) || "NORMAL",
        collectedAt: String(data.collectedAt || r.createdAt.toISOString()),
        sourceFacility: data.sourceFacility ? String(data.sourceFacility) : null,
        entryRoute: (data.entryRoute as LabResultEntryRoute) || "STAFF_ENTERED",
        isConfirmedByClinician: Boolean(data.isConfirmedByClinician || r.status === "FINAL"),
        confirmedByMembershipId: r.verifiedByMembershipId,
        confirmedAt: r.verifiedAt?.toISOString() ?? null,
        documentId: data.documentId ? String(data.documentId) : null,
        notes: data.notes ? String(data.notes) : null,
        createdAt: r.createdAt.toISOString(),
      });
    }

    return items;
  }

  /**
   * Computes multi-series lab trends across dates with reference ranges and abnormal highlights.
   */
  async getPatientLabTrends(
    rc: WonFlowRequestContext,
    patientId: string,
  ): Promise<MultiLabTrendGroup[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const items = await this.listPatientLabResults(rc, patientId);

    // Also fetch drain fluid amylase from DrainLog table to overlay pancreatic fistula monitoring
    const drainLogs = await database.drainLog.findMany({
      where: {
        tenantId: rc.tenantId,
        patientId,
        amylaseValue: { not: null },
      },
      orderBy: { recordedAt: "asc" },
    });

    const allSeriesMap = new Map<string, LabTrendSeries>();

    // Add lab result points
    for (const item of items) {
      let series = allSeriesMap.get(item.code);
      if (!series) {
        series = {
          code: item.code,
          displayName: item.displayName,
          unit: item.unit,
          category: item.category,
          referenceLow: item.referenceLow,
          referenceHigh: item.referenceHigh,
          points: [],
        };
        allSeriesMap.set(item.code, series);
      }

      series.points.push({
        date: item.collectedAt,
        value: item.value,
        referenceLow: item.referenceLow,
        referenceHigh: item.referenceHigh,
        abnormalFlag: item.abnormalFlag,
        isConfirmed: item.isConfirmedByClinician,
        sourceFacility: item.sourceFacility,
      });
    }

    // Add DrainLog amylase points under AMYLASE_DRAIN
    if (drainLogs.length > 0) {
      let amylaseSeries = allSeriesMap.get("AMYLASE_DRAIN");
      if (!amylaseSeries) {
        const def = STANDARD_LAB_TESTS.AMYLASE_DRAIN!;
        amylaseSeries = {
          code: "AMYLASE_DRAIN",
          displayName: def.name,
          unit: def.unit,
          category: def.category,
          referenceLow: def.defaultRefLow,
          referenceHigh: def.defaultRefHigh,
          points: [],
        };
        allSeriesMap.set("AMYLASE_DRAIN", amylaseSeries);
      }

      for (const d of drainLogs) {
        const val = Number(d.amylaseValue);
        const abnormalFlag = computeAbnormalFlag(
          val,
          amylaseSeries.referenceLow,
          amylaseSeries.referenceHigh,
          undefined,
          300,
        );

        amylaseSeries.points.push({
          date: d.recordedAt.toISOString(),
          value: val,
          referenceLow: amylaseSeries.referenceLow,
          referenceHigh: amylaseSeries.referenceHigh,
          abnormalFlag,
          isConfirmed: d.status === "FINAL",
          sourceFacility: "Surgical Drain Telemetry",
        });
      }
    }

    // Sort points in every series chronologically ascending
    for (const s of allSeriesMap.values()) {
      s.points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Group series into clinically meaningful clusters
    const groups: MultiLabTrendGroup[] = [
      {
        groupName: "Liver Function",
        series: Array.from(allSeriesMap.values()).filter((s) =>
          ["BILIRUBIN_TOTAL", "BILIRUBIN_DIRECT", "ALT", "AST", "ALP", "ALBUMIN"].includes(s.code),
        ),
      },
      {
        groupName: "Inflammatory Markers",
        series: Array.from(allSeriesMap.values()).filter((s) => ["CRP", "WBC"].includes(s.code)),
      },
      {
        groupName: "Pancreatic & Drain Amylase",
        series: Array.from(allSeriesMap.values()).filter((s) => ["AMYLASE_DRAIN"].includes(s.code)),
      },
      {
        groupName: "Renal Function",
        series: Array.from(allSeriesMap.values()).filter((s) => ["CREATININE"].includes(s.code)),
      },
      {
        groupName: "Complete Blood Count",
        series: Array.from(allSeriesMap.values()).filter((s) => ["HEMOGLOBIN"].includes(s.code)),
      },
    ];

    return groups.filter((g) => g.series.length > 0);
  }
}

export const labResultService = new LabResultService();
